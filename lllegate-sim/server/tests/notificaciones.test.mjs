import assert from "node:assert/strict";
import test from "node:test";

const { avisoVerificacion } = await import("../src/notificacionesTexto.js");

test("el aviso de aprobación felicita y orienta al saldo prepago", () => {
  const aviso = avisoVerificacion({ aprobado: true });
  assert.equal(aviso.tipo, "conductor_aprobado");
  assert.match(aviso.titulo, /aprobada/);
  assert.match(aviso.cuerpo, /saldo prepago/);
});

test("el aviso de rechazo incluye el motivo del operador", () => {
  const aviso = avisoVerificacion({ aprobado: false, motivo: "  La licencia\n está vencida.  " });
  assert.equal(aviso.tipo, "conductor_rechazado");
  assert.match(aviso.cuerpo, /^La licencia está vencida\. Corrige/);
});

test("el aviso de rechazo sin motivo sigue siendo útil", () => {
  const aviso = avisoVerificacion({ aprobado: false, motivo: null });
  assert.match(aviso.cuerpo, /vuelve a enviarlos/);
});
