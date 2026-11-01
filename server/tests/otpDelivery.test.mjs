import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { enviarCodigoSms, smsDisponible } = await import("../src/security/otp-delivery.js");
const { enviarCodigoWhatsApp, whatsappDisponible } = await import("../src/security/whatsapp.js");

test("WhatsApp arma la plantilla de OTP con el número normalizado", async () => {
  let solicitud;
  const fetchImpl = async (url, opciones) => {
    solicitud = { url, opciones };
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const whatsapp = {
    token: "token-meta",
    phoneId: "123456789",
    template: "llegate_otp",
    language: "es",
    apiVersion: "v21.0",
  };

  const resultado = await enviarCodigoWhatsApp({
    telefono: "+58 414-1234567",
    codigo: "123456",
    fetchImpl,
    whatsapp,
  });

  assert.deepEqual(resultado, { ok: true });
  assert.equal(solicitud.url, "https://graph.facebook.com/v21.0/123456789/messages");
  assert.equal(solicitud.opciones.headers.Authorization, "Bearer token-meta");

  const cuerpo = JSON.parse(solicitud.opciones.body);
  assert.equal(cuerpo.messaging_product, "whatsapp");
  assert.equal(cuerpo.to, "584141234567");
  assert.equal(cuerpo.template.name, "llegate_otp");
  assert.deepEqual(cuerpo.template.language, { code: "es" });
  assert.deepEqual(cuerpo.template.components[0].parameters, [{ type: "text", text: "123456" }]);
});

test("sin credenciales de Meta no se intenta enviar", async () => {
  assert.equal(whatsappDisponible({ token: "", phoneId: "1" }), false);
  assert.equal(whatsappDisponible({ token: "t", phoneId: "" }), false);
  assert.equal(whatsappDisponible({ token: "t", phoneId: "1" }), true);

  await assert.rejects(
    () =>
      enviarCodigoWhatsApp({
        telefono: "+584141234567",
        codigo: "123456",
        whatsapp: { token: "", phoneId: "" },
      }),
    /whatsapp_no_configurado/,
  );
});

test("un 4xx de Meta se reporta como error del proveedor", async () => {
  const fetchImpl = async () => new Response("token inválido", { status: 401 });

  await assert.rejects(
    () =>
      enviarCodigoWhatsApp({
        telefono: "+584141234567",
        codigo: "123456",
        fetchImpl,
        whatsapp: { token: "t", phoneId: "1", template: "tpl", language: "es", apiVersion: "v21.0" },
      }),
    /whatsapp_401/,
  );
});

test("Twilio recibe el código con autenticación básica", async () => {
  let solicitud;
  const fetchImpl = async (url, opciones) => {
    solicitud = { url, opciones };
    return new Response("{}", { status: 201 });
  };
  const sms = {
    accountSid: "AC1234567890",
    authToken: "token-twilio",
    from: "+15551234567",
  };

  assert.equal(smsDisponible(sms), true);
  const resultado = await enviarCodigoSms({
    telefono: "+584141234567",
    codigo: "654321",
    fetchImpl,
    sms,
  });

  assert.deepEqual(resultado, { ok: true });
  assert.equal(
    solicitud.url,
    "https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Messages.json",
  );
  assert.equal(
    solicitud.opciones.headers.Authorization,
    `Basic ${Buffer.from("AC1234567890:token-twilio").toString("base64")}`,
  );
  assert.equal(solicitud.opciones.body.get("To"), "+584141234567");
  assert.equal(solicitud.opciones.body.get("From"), "+15551234567");
  assert.match(solicitud.opciones.body.get("Body"), /654321/);
});

test("sin credenciales de Twilio el envío falla antes de salir a la red", async () => {
  assert.equal(smsDisponible({ accountSid: "", authToken: "t", from: "x" }), false);
  assert.equal(smsDisponible({ accountSid: "a", authToken: "", from: "x" }), false);
  assert.equal(smsDisponible({ accountSid: "a", authToken: "t", from: "" }), false);

  await assert.rejects(
    () =>
      enviarCodigoSms({
        telefono: "+584141234567",
        codigo: "123456",
        sms: { accountSid: "", authToken: "", from: "" },
      }),
    /sms_no_configurado/,
  );
});

test("un 4xx de Twilio se reporta como error del proveedor", async () => {
  const fetchImpl = async () => new Response("número inválido", { status: 400 });

  await assert.rejects(
    () =>
      enviarCodigoSms({
        telefono: "+584141234567",
        codigo: "123456",
        fetchImpl,
        sms: { accountSid: "AC1", authToken: "t", from: "+15551234567" },
      }),
    /sms_400/,
  );
});
