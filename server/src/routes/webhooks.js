import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { config } from "../config.js";
import { asyncHandler } from "../http.js";
import { enviarCodigoWhatsApp, whatsappDisponible } from "../security/whatsapp.js";
import { supabaseAnon } from "../supabase.js";
import { leerEventoBinance, verificarWebhookBinance } from "../payments/binance.js";

export const webhooksRouter = Router();

const ACK = { returnCode: "SUCCESS", returnMessage: null };
const ESTADOS_PAGADOS = new Set(["PAY_SUCCESS", "PAID"]);

function secretoHook(valor) {
  const limpio = String(valor ?? "").trim();
  if (!limpio) return null;
  const sinVersion = limpio.startsWith("v1,") ? limpio.slice(3) : limpio;
  if (sinVersion.startsWith("whsec_")) {
    const bytes = Buffer.from(sinVersion.slice(6), "base64");
    return bytes.length > 0 ? bytes : null;
  }
  return Buffer.from(sinVersion, "utf8");
}

// Supabase firma el hook con el estándar Webhooks: HMAC-SHA256 sobre
// "<id>.<timestamp>.<cuerpo>". Se rechaza fuera de una ventana de 5 minutos
// para que una firma filtrada no sirva para reenviar códigos.
export function firmaHookValida({ rawBody, id, timestamp, firma, secreto, now = Date.now() }) {
  if (!id || !timestamp || !firma || !secreto) return false;
  const segundos = Number(timestamp);
  if (!Number.isFinite(segundos) || Math.abs(now / 1000 - segundos) > 300) return false;

  const esperado = createHmac("sha256", secreto)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  return firma.split(" ").some((parte) => {
    const valor = parte.startsWith("v1,") ? parte.slice(3) : parte;
    try {
      const recibido = Buffer.from(valor, "base64");
      return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
    } catch {
      return false;
    }
  });
}

function pem(value) {
  if (!value) return "";
  const conSaltos = value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
  if (conSaltos.includes("BEGIN")) return conSaltos;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : "";
  } catch {
    return "";
  }
}

// Binance Pay firma el cuerpo crudo; por eso este router se monta antes de
// express.json() y usa express.raw. Si la firma no valida, no se confirma nada.
webhooksRouter.post(
  "/binance-pay",
  express.raw({ type: "*/*", limit: "256kb" }),
  asyncHandler(async (req, res) => {
    const binance = config.payments.binance;
    const publicKey = pem(binance.webhookPublicKey);

    if (!publicKey || !config.payments.serverKey) {
      res.status(503).json({ returnCode: "FAIL", returnMessage: "webhook_no_configurado" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const valido = verificarWebhookBinance({
      rawBody,
      timestamp: req.get("binancepay-timestamp"),
      nonce: req.get("binancepay-nonce"),
      signature: req.get("binancepay-signature"),
      publicKeyPem: publicKey,
    });

    if (!valido) {
      res.status(401).json({ returnCode: "FAIL", returnMessage: "firma_invalida" });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.status(200).json(ACK);
      return;
    }

    const evento = leerEventoBinance(payload);
    if (!evento) {
      console.error("[binance-pay] evento sin datos legibles");
      res.status(200).json(ACK);
      return;
    }

    if (!ESTADOS_PAGADOS.has(String(evento.estado).toUpperCase())) {
      res.status(200).json(ACK);
      return;
    }
    if (!evento.codigo) {
      console.error("[binance-pay] evento pagado sin merchantTradeNo");
      res.status(200).json(ACK);
      return;
    }

    const { data, error } = await supabaseAnon.rpc("confirmar_pago", {
      p_codigo: evento.codigo,
      p_clave_servidor: config.payments.serverKey,
      p_referencia_externa: evento.referenciaExterna,
      p_metadata: {
        binance_biz_id: payload.bizId ?? null,
        binance_biz_type: payload.bizType ?? null,
        binance_status: evento.estado,
      },
      p_monto_usd: evento.montoUsd,
    });

    if (data?.ok === false) {
      console.error("[binance-pay] pago no confirmado:", data.motivo ?? "sin motivo");
      res.status(200).json(ACK);
      return;
    }

    if (error) {
      // Un pago vencido, duplicado o con monto distinto no se arregla
      // reintentando el webhook; se responde OK y queda el rastro en el log.
      if (["42501", "P0001", "P0002", "23505"].includes(String(error.code))) {
        console.error("[binance-pay] confirmación rechazada:", error.code, error.message);
        res.status(200).json(ACK);
        return;
      }

      console.error("[binance-pay] error al confirmar:", error.message);
      res.status(500).json({ returnCode: "FAIL", returnMessage: "error_interno" });
      return;
    }

    res.status(200).json(ACK);
  }),
);

// ---------------------------------------------------------------------------
// Supabase Send SMS Hook → WhatsApp Cloud API
//
// Actívalo en Supabase (Authentication → Hooks → Send SMS) apuntando a
// https://<api>/webhooks/supabase-otp con el mismo secreto configurado en
// SUPABASE_SEND_SMS_HOOK_SECRET. Si el hook está activo, este endpoint es el
// único que envía el OTP; por eso sin credenciales de Meta responde 503 en vez
// de fingir que envió el código.
// ---------------------------------------------------------------------------
webhooksRouter.post(
  "/supabase-otp",
  express.raw({ type: "*/*", limit: "64kb" }),
  asyncHandler(async (req, res) => {
    const secreto = secretoHook(config.otp.hookSecret);
    if (!secreto) {
      res.status(503).json({ error: "hook_no_configurado" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const valido = firmaHookValida({
      rawBody,
      id: req.get("webhook-id"),
      timestamp: req.get("webhook-timestamp"),
      firma: req.get("webhook-signature"),
      secreto,
    });

    if (!valido) {
      res.status(401).json({ error: "firma_invalida" });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: "json_invalido" });
      return;
    }

    const telefono = payload?.user?.phone ?? payload?.user?.phone_number ?? "";
    const codigo = String(payload?.sms?.otp ?? payload?.otp ?? "");
    if (!telefono || !/^\d{4,8}$/.test(codigo)) {
      res.status(422).json({ error: "payload_invalido" });
      return;
    }

    if (!whatsappDisponible()) {
      res.status(503).json({ error: "whatsapp_no_configurado" });
      return;
    }

    try {
      await enviarCodigoWhatsApp({ telefono, codigo });
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[supabase-otp] WhatsApp rechazó el envío:", error.message);
      res.status(502).json({ error: "whatsapp_error" });
    }
  }),
);
