import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

// webhooks.js importa config.js, que exige estas variables al cargar.
process.env.SUPABASE_URL = "http://127.0.0.1:1";
process.env.SUPABASE_ANON_KEY = "clave-anon-de-prueba";

const { firmaHookValida } = await import("../src/routes/webhooks.js");
const { enviarCodigoWhatsApp, whatsappDisponible } = await import("../src/security/whatsapp.js");

const SECRETO = Buffer.from("secreto-del-hook-de-prueba");
const ID = "msg_01J0000000000000000000000";
const CUERPO = JSON.stringify({
  user: { phone: "+584141234567" },
  sms: { otp: "123456" },
});

function firmar(cuerpo, timestamp, secreto = SECRETO) {
  return createHmac("sha256", secreto).update(`${ID}.${timestamp}.${cuerpo}`).digest("base64");
}

test("la firma del Send SMS Hook acepta el formato v1 del estándar Webhooks", () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const firma = firmar(CUERPO, timestamp);

  assert.equal(firmaHookValida({ rawBody: CUERPO, id: ID, timestamp, firma: `v1,${firma}`, secreto: SECRETO }), true);
  assert.equal(
    firmaHookValida({
      rawBody: CUERPO,
      id: ID,
      timestamp,
      firma: `v1,AAAA v1,${firma}`,
      secreto: SECRETO,
    }),
    true,
  );
});

test("la firma rechaza cuerpos alterados, secretos distintos y firmas vacías", () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const firma = firmar(CUERPO, timestamp);

  assert.equal(
    firmaHookValida({ rawBody: `${CUERPO} `, id: ID, timestamp, firma: `v1,${firma}`, secreto: SECRETO }),
    false,
  );
  assert.equal(
    firmaHookValida({
      rawBody: CUERPO,
      id: ID,
      timestamp,
      firma: `v1,${firma}`,
      secreto: Buffer.from("otro-secreto"),
    }),
    false,
  );
  assert.equal(firmaHookValida({ rawBody: CUERPO, id: ID, timestamp, firma: "", secreto: SECRETO }), false);
});

test("la firma caduca para evitar reenvíos", () => {
  const viejo = String(Math.floor(Date.now() / 1000) - 900);
  const firma = firmar(CUERPO, viejo);

  assert.equal(firmaHookValida({ rawBody: CUERPO, id: ID, timestamp: viejo, firma: `v1,${firma}`, secreto: SECRETO }), false);
});

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
