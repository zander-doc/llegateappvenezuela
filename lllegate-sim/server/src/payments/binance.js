import { createSign, createVerify, randomBytes, createPrivateKey, createPublicKey } from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "../http.js";

// Binance Pay · API v3. La creación de la orden y la verificación del webhook
// van firmadas con RSA-SHA256. Sin credenciales configuradas no se ofrece el
// método: nunca se simula una confirmación de un pago que no existió.
//
// Variables:
//   BINANCE_PAY_CERT_SN              serial del certificado del comercio
//   BINANCE_PAY_SECRET_KEY           clave privada RSA en PEM (o base64 del PEM)
//   BINANCE_PAY_WEBHOOK_PUBLIC_KEY   clave pública de Binance en PEM (o base64)
//   PAGOS_CLAVE_SERVIDOR             clave con la que la API confirma en la base

function pem(value) {
  if (!value) return "";
  const trimmed = value.trim();
  const withNewlines = trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
  if (withNewlines.includes("BEGIN")) return withNewlines;
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : "";
  } catch {
    return "";
  }
}

export function binanceDisponible(options = config.payments.binance, serverKey = config.payments.serverKey) {
  return Boolean(options.certSn && pem(options.secretKey) && pem(options.webhookPublicKey) && serverKey);
}

export function firmarSolicitudBinance({
  body,
  timestamp = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("hex"),
  privateKeyPem,
  certSn,
}) {
  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  const signer = createSign("RSA-SHA256");
  signer.update(payload);
  signer.end();

  return {
    "content-type": "application/json",
    "BinancePay-Timestamp": String(timestamp),
    "BinancePay-Nonce": nonce,
    "BinancePay-Certificate-SN": certSn,
    "BinancePay-Signature": signer.sign(createPrivateKey(privateKeyPem), "base64"),
  };
}

export function verificarWebhookBinance({
  rawBody,
  timestamp,
  nonce,
  signature,
  publicKeyPem,
  now = Date.now(),
}) {
  if (!rawBody || !timestamp || !nonce || !signature || !publicKeyPem) return false;

  const epoch = Number(timestamp);
  if (!Number.isFinite(epoch) || Math.abs(now / 1000 - epoch) > 300) return false;

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
  verifier.end();

  try {
    return verifier.verify(createPublicKey(publicKeyPem), signature, "base64");
  } catch {
    return false;
  }
}

export async function crearOrdenBinance(
  { montoUsd, codigo },
  options = config.payments.binance,
  serverKey = config.payments.serverKey,
) {
  if (!binanceDisponible(options, serverKey)) {
    throw new HttpError(
      503,
      "binance_no_configurado",
      "Binance Pay no está disponible en este momento. Prueba con Pago Móvil.",
    );
  }

  const body = JSON.stringify({
    env: { terminalType: "WEB" },
    merchantTradeNo: codigo,
    orderAmount: Number(montoUsd.toFixed(2)),
    currency: "USDT",
    goods: {
      goodsType: "01",
      goodsCategory: "Z000",
      referenceGoodsId: codigo,
      goodsName: "Recarga Llégate",
      goodsDetail: "Saldo prepago para viajes en Llégate",
    },
  });

  const headers = firmarSolicitudBinance({
    body,
    privateKeyPem: pem(options.secretKey),
    certSn: options.certSn,
  });

  let response;
  try {
    response = await fetch(`${options.baseUrl.replace(/\/+$/, "")}/binancepay/openapi/v3/order`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "binance_sin_respuesta", "Binance Pay no respondió. Intenta de nuevo.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "SUCCESS" || payload?.code !== "000000") {
    throw new HttpError(
      502,
      "binance_error",
      payload?.errorMessage ?? "Binance Pay no aceptó la orden. Intenta de nuevo.",
      { binance_code: payload?.code ?? response.status },
    );
  }

  const data = payload.data ?? {};
  if (typeof data.checkoutUrl !== "string" || !data.checkoutUrl.startsWith("http")) {
    throw new HttpError(502, "binance_sin_checkout", "Binance Pay no entregó una URL de pago.");
  }

  return {
    checkoutUrl: data.checkoutUrl,
    prepayId: typeof data.prepayId === "string" ? data.prepayId : null,
    metadata: {
      binance_prepay_id: data.prepayId ?? null,
      binance_merchant_trade_no: data.merchantTradeNo ?? codigo,
    },
  };
}

export function leerEventoBinance(payload) {
  if (!payload || typeof payload !== "object") return null;

  let data = payload.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;

  const estado = payload.bizStatus ?? data.bizStatus ?? data.status ?? "";
  const codigo = data.merchantTradeNo ?? payload.merchantTradeNo ?? null;
  const monto = Number(data.orderAmount ?? data.totalFee ?? NaN);

  return {
    estado,
    codigo: typeof codigo === "string" ? codigo : null,
    montoUsd: Number.isFinite(monto) ? monto : null,
    referenciaExterna: data.prepayId ?? data.transactionId ?? null,
    data,
  };
}
