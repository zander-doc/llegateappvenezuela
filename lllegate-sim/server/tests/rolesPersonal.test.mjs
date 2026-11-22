import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { PERMISOS_PERSONAL, requirePermiso } = await import("../src/middleware.js");
const { etiquetaRol } = await import("../src/auth/etiquetaRol.js");

function intentar(permisos, modulo) {
  let resultado = "pasa";
  requirePermiso(modulo)({ staff: { permisos } }, {}, (error) => {
    if (error) resultado = error.code ?? error.message;
  });
  return resultado;
}

test("operaciones revisa documentos pero no ve dinero", () => {
  const permisos = PERMISOS_PERSONAL.operaciones;
  assert.equal(intentar(permisos, "documentos"), "pasa");
  assert.notEqual(intentar(permisos, "dinero"), "pasa");
});

test("finanzas ve cobros pero no documentos de identidad", () => {
  const permisos = PERMISOS_PERSONAL.finanzas;
  assert.equal(intentar(permisos, "dinero"), "pasa");
  assert.notEqual(intentar(permisos, "documentos"), "pasa");
});

test("soporte solo atiende solicitudes", () => {
  const permisos = PERMISOS_PERSONAL.soporte;
  assert.equal(intentar(permisos, "soporte"), "pasa");
  for (const modulo of ["dinero", "documentos", "negocios", "personal"]) {
    assert.notEqual(intentar(permisos, modulo), "pasa", modulo);
  }
});

test("solo el superadmin gestiona al personal", () => {
  assert.ok(PERMISOS_PERSONAL.superadmin.includes("personal"));
  for (const rol of ["operaciones", "finanzas", "soporte"]) {
    assert.ok(!PERMISOS_PERSONAL[rol].includes("personal"), rol);
  }
});

test("sin staff en la petición no hay acceso", () => {
  let resultado = "pasa";
  requirePermiso("dinero")({}, {}, (error) => {
    if (error) resultado = "bloqueado";
  });
  assert.equal(resultado, "bloqueado");
});

test("la etiqueta muestra el rol de personal", () => {
  assert.equal(etiquetaRol({ rol: "admin", rol_personal: "finanzas" }), "Finanzas");
  assert.equal(etiquetaRol({ rol: "admin", rol_personal: "operaciones" }), "Operaciones");
  assert.equal(etiquetaRol({ rol: "admin", rol_personal: null }), "Superadmin");
});
