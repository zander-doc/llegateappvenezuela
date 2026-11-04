import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import "./setup.mjs";

const {
  binanceDisponible,
  crearOrdenBinance,
  firmarSolicitudBinance,
  leerEventoBinance,
  verificarWebhookBinance,
} = await import("../src/payments/binance.js");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const CERT_SN = "SN-TEST-001";
const SERVER_KEY = "clave-servidor-de-prueba";
const fetchOriginal = globalThis.fetch;

function firmar({ body = '{"a":1}', timestamp = 1_790_000_000, nonce = "nonce-123" } = {}) {
  return firmarSolicitudBinance({
    body,
    timestamp,
    nonce,
    privateKeyPem: privateKey,
    certSn: CERT_SN,
  });
}

test("la firma cubre timestamp, nonce y cuerpo con RSA-SHA256", () => {
  const body = '{"merchantTradeNo":"LLG-0000000001"}';
  const timestamp = 1_790_000_000;
  const nonce = "abc123";
  const headers = firmar({ body, timestamp, nonce });

  assert.equal(headers["BinancePay-Timestamp"], String(timestamp));
  assert.equal(headers["BinancePay-Nonce"], nonce);
  assert.equal(headers["BinancePay-Certificate-SN"], CERT_SN);
  assert.equal(headers["content-type"], "application/json");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${timestamp}\n${nonce}\n${body}\n`);
  verifier.end();
  assert.equal(verifier.verify(publicKey, headers["BinancePay-Signature"], "base64"), true);
});

test("el webhook válido pasa y el cuerpo alterado no", () => {
  const rawBody = '{"bizStatus":"PAY_SUCCESS","data":{"merchantTradeNo":"LLG-0000000001","orderAmount":10}}';
  const timestamp = "1790000000";
  const nonce = "nonce-456";
  const signature = firmar({ body: rawBody, timestamp: Number(timestamp), nonce })["BinancePay-Signature"];
  const now = Number(timestamp) * 1000;

  assert.equal(
    verificarWebhookBinance({ rawBody, timestamp, nonce, signature, publicKeyPem: publicKey, now }),
    true,
  );
  assert.equal(
    verificarWebhookBinance({
      rawBody: rawBody.replace("10", "900"),
      timestamp,
      nonce,
      signature,
      publicKeyPem: publicKey,
      now,
    }),
    false,
  );
});

test("el webhook viejo o firmado con otra clave se rechaza", () => {
  const rawBody = '{"bizStatus":"PAY_SUCCESS"}';
  const timestamp = "1790000000";
  const nonce = "nonce-789";
  const signature = firmar({ body: rawBody, timestamp: Number(timestamp), nonce })["BinancePay-Signature"];

  assert.equal(
    verificarWebhookBinance({
      rawBody,
      timestamp,
      nonce,
      signature,
      publicKeyPem: publicKey,
      now: (Number(timestamp) + 301) * 1000,
    }),
    false,
  );

  const otraClave = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  }).publicKey;
  assert.equal(
    verificarWebhookBinance({
      rawBody,
      timestamp,
      nonce,
      signature,
      publicKeyPem: otraClave,
      now: Number(timestamp) * 1000,
    }),
    false,
  );

  assert.equal(
    verificarWebhookBinance({ rawBody, timestamp: "", nonce, signature, publicKeyPem: publicKey }),
    false,
  );
});

test("Binance solo se ofrece con todas las credenciales", () => {
  const completo = {
    certSn: CERT_SN,
    secretKey: privateKey,
    webhookPublicKey: publicKey,
  };

  assert.equal(binanceDisponible(completo, SERVER_KEY), true);
  assert.equal(binanceDisponible(completo, ""), false);
  assert.equal(binanceDisponible({ ...completo, certSn: "" }, SERVER_KEY), false);
  assert.equal(binanceDisponible({ ...completo, secretKey: "" }, SERVER_KEY), false);
  assert.equal(binanceDisponible({ ...completo, webhookPublicKey: "no-es-pem" }, SERVER_KEY), false);
});

test("las credenciales en base64 o con saltos escapados son aceptadas", async (t) => {
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });

  const enBase64 = {
    certSn: CERT_SN,
    secretKey: Buffer.from(privateKey).toString("base64"),
    webhookPublicKey: Buffer.from(publicKey).toString("base64"),
    baseUrl: "https://bpay.test",
  };
  assert.equal(binanceDisponible(enBase64, SERVER_KEY), true);
  assert.equal(
    binanceDisponible(
      {
        certSn: CERT_SN,
        secretKey: privateKey.replace(/\n/g, "\\n"),
        webhookPublicKey: publicKey.replace(/\n/g, "\\n"),
      },
      SERVER_KEY,
    ),
    true,
  );

  let enviado;
  globalThis.fetch = async (_url, init) => {
    enviado = init;
    return new Response(
      JSON.stringify({ status: "SUCCESS", code: "000000", data: { checkoutUrl: "https://pay.binance.test/checkout/b64" } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const orden = await crearOrdenBinance({ montoUsd: 10, codigo: "LLG-0000000008" }, enBase64, SERVER_KEY);
  assert.equal(orden.checkoutUrl, "https://pay.binance.test/checkout/b64");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(
    `${enviado.headers["BinancePay-Timestamp"]}\n${enviado.headers["BinancePay-Nonce"]}\n${enviado.body}\n`,
  );
  verifier.end();
  assert.equal(verifier.verify(publicKey, enviado.headers["BinancePay-Signature"], "base64"), true);
});

test("el evento de Binance se lee con datos en objeto o en texto", () => {
  const data = { merchantTradeNo: "LLG-0000000002", orderAmount: "25.5", prepayId: "PP-1" };

  const objeto = leerEventoBinance({ bizStatus: "PAY_SUCCESS", data });
  assert.deepEqual(
    { estado: objeto.estado, codigo: objeto.codigo, montoUsd: objeto.montoUsd, referenciaExterna: objeto.referenciaExterna },
    { estado: "PAY_SUCCESS", codigo: "LLG-0000000002", montoUsd: 25.5, referenciaExterna: "PP-1" },
  );

  const texto = leerEventoBinance({ data: JSON.stringify(data) });
  assert.equal(texto.codigo, "LLG-0000000002");
  assert.equal(texto.montoUsd, 25.5);

  assert.equal(leerEventoBinance(null), null);
  assert.equal(leerEventoBinance({ data: "{roto" }), null);
  assert.equal(leerEventoBinance({ data: "sin-json" }), null);
});

test("crear la orden exige configuración completa", async () => {
  await assert.rejects(
    crearOrdenBinance({ montoUsd: 10, codigo: "LLG-0000000003" }, { certSn: "", secretKey: "", webhookPublicKey: "", baseUrl: "https://bpay.test" }, SERVER_KEY),
    (error) => error.status === 503 && error.code === "binance_no_configurado",
  );
});

test("crear la orden firma el cuerpo y devuelve el checkout", async (t) => {
  const calls = [];
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        status: "SUCCESS",
        code: "000000",
        data: { checkoutUrl: "https://pay.binance.test/checkout/1", prepayId: "PP-9", merchantTradeNo: "LLG-0000000004" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const orden = await crearOrdenBinance(
    { montoUsd: 9.9, codigo: "LLG-0000000004" },
    { certSn: CERT_SN, secretKey: privateKey, webhookPublicKey: publicKey, baseUrl: "https://bpay.test/" },
    SERVER_KEY,
  );

  assert.equal(orden.checkoutUrl, "https://pay.binance.test/checkout/1");
  assert.equal(orden.prepayId, "PP-9");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://bpay.test/binancepay/openapi/v3/order");

  const enviado = JSON.parse(calls[0].init.body);
  assert.equal(enviado.merchantTradeNo, "LLG-0000000004");
  assert.equal(enviado.orderAmount, 9.9);
  assert.equal(enviado.currency, "USDT");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(
    `${calls[0].init.headers["BinancePay-Timestamp"]}\n${calls[0].init.headers["BinancePay-Nonce"]}\n${calls[0].init.body}\n`,
  );
  verifier.end();
  assert.equal(verifier.verify(publicKey, calls[0].init.headers["BinancePay-Signature"], "base64"), true);
});

test("crear la orden rechaza respuestas sin checkout", async (t) => {
  t.after(() => {
    globalThis.fetch = fetchOriginal;
  });
  const options = { certSn: CERT_SN, secretKey: privateKey, webhookPublicKey: publicKey, baseUrl: "https://bpay.test" };

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "SUCCESS", code: "000000", data: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(
    crearOrdenBinance({ montoUsd: 10, codigo: "LLG-0000000005" }, options, SERVER_KEY),
    (error) => error.status === 502 && error.code === "binance_sin_checkout",
  );

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ status: "FAIL", code: "400001", errorMessage: "monto inválido" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(
    crearOrdenBinance({ montoUsd: 10, codigo: "LLG-0000000006" }, options, SERVER_KEY),
    (error) => error.status === 502 && error.message === "monto inválido",
  );

  globalThis.fetch = async () => {
    throw new TypeError("failed to fetch");
  };
  await assert.rejects(
    crearOrdenBinance({ montoUsd: 10, codigo: "LLG-0000000007" }, options, SERVER_KEY),
    (error) => error.status === 502 && error.code === "binance_sin_respuesta",
  );
});
