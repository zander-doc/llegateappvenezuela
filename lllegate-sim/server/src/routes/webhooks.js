import express, { Router } from "express";
import { config } from "../config.js";
import { rpc } from "../db.js";
import { asyncHandler } from "../http.js";
import { leerEventoBinance, verificarWebhookBinance } from "../payments/binance.js";

export const webhooksRouter = Router();

const ACK = { returnCode: "SUCCESS", returnMessage: null };
const ESTADOS_PAGADOS = new Set(["PAY_SUCCESS", "PAID"]);

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

    try {
      // El webhook no tiene usuario: la RPC confirma con la clave de servidor y
      // `auth.role() = 'service_role'` para que el asiento quede sin aprobador.
      const data = await rpc(
        "confirmar_pago",
        {
          p_codigo: evento.codigo,
          p_clave_servidor: config.payments.serverKey,
          p_referencia_externa: evento.referenciaExterna,
          p_metadata: {
            binance_biz_id: payload.bizId ?? null,
            binance_biz_type: payload.bizType ?? null,
            binance_status: evento.estado,
          },
          p_monto_usd: evento.montoUsd,
        },
        { rol: "service_role" },
      );

      if (data?.ok === false) {
        console.error("[binance-pay] pago no confirmado:", data.motivo ?? "sin motivo");
      }
    } catch (error) {
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
