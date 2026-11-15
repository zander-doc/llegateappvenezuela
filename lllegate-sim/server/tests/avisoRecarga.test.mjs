import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { avisoAdminDisponible, enviarAvisoRecarga } = await import("../src/security/whatsapp.js");

const whatsapp = {
  token: "token-meta",
  phoneId: "123456789",
  language: "es",
  apiVersion: "v21.0",
  avisoTelefono: "+58 412-4634040",
  avisoTemplate: "llegate_aviso_recarga",
};

test("el aviso al admin arma la plantilla con 4 variables", async () => {
  let solicitud;
  const fetchImpl = async (url, opciones) => {
    solicitud = { url, opciones };
    return new Response("{}", { status: 200 });
  };

  const resultado = await enviarAvisoRecarga({
    montoUsd: "10.00",
    montoBs: "8873",
    referencia: "123456",
    cliente: "  Zander\n Perez ",
    fetchImpl,
    whatsapp,
  });

  assert.deepEqual(resultado, { ok: true });
  assert.equal(solicitud.url, "https://graph.facebook.com/v21.0/123456789/messages");
  const cuerpo = JSON.parse(solicitud.opciones.body);
  assert.equal(cuerpo.to, "584124634040");
  assert.equal(cuerpo.template.name, "llegate_aviso_recarga");
  assert.deepEqual(
    cuerpo.template.components[0].parameters.map((p) => p.text),
    ["10.00", "8873.00", "123456", "Zander Perez"],
  );
});

test("sin telefono de aviso no se ofrece el aviso", async () => {
  assert.equal(avisoAdminDisponible({ ...whatsapp, avisoTelefono: "" }), false);
  await assert.rejects(
    enviarAvisoRecarga({ montoUsd: 1, referencia: "1", whatsapp: { ...whatsapp, avisoTelefono: "" } }),
    /aviso_whatsapp_no_configurado/,
  );
});

test("si Meta responde error, el aviso falla con el detalle", async () => {
  const fetchImpl = async () => new Response("plantilla no aprobada", { status: 400 });
  await assert.rejects(
    enviarAvisoRecarga({ montoUsd: 1, referencia: "1", cliente: "A", fetchImpl, whatsapp }),
    /whatsapp_400: plantilla no aprobada/,
  );
});
