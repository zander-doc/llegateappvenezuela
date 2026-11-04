import "./setup.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { validarDatabaseUrl } from "../src/config.js";

const VALIDA = "postgresql://usuario:clave@ep-ejemplo.neon.tech/neondb?sslmode=require";

test("acepta una conexión postgresql:// o postgres://", () => {
  assert.equal(validarDatabaseUrl(VALIDA), VALIDA);
  assert.equal(
    validarDatabaseUrl("postgres://usuario:clave@localhost:5432/base"),
    "postgres://usuario:clave@localhost:5432/base",
  );
});

test("rechaza un valor pegado con su etiqueta delante", () => {
  assert.throws(
    () => validarDatabaseUrl(`DATABASE_URL=${VALIDA}`),
    /debe empezar por postgresql:\/\//,
  );
});

test("rechaza un valor entre comillas", () => {
  assert.throws(() => validarDatabaseUrl(`"${VALIDA}"`), /debe empezar por postgresql:\/\//);
});

test("rechaza una cadena truncada sin servidor", () => {
  assert.throws(() => validarDatabaseUrl("postgresql://"), /URL válida|falta el host/);
});

test("el mensaje de error no revela la contraseña", () => {
  try {
    validarDatabaseUrl(`sistema=${VALIDA}`);
    assert.fail("debía lanzar un error");
  } catch (error) {
    assert.ok(!error.message.includes("clave"), error.message);
    assert.ok(!error.message.includes("ep-ejemplo"), error.message);
  }
});
