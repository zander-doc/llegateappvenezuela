// /config/app es estático: no necesita base de datos, así que esta prueba
// levanta la API vacía y verifica que la app reciba servicios, tarifas y
// reglas de billetera sin tocar Neon.
import "./setup.mjs";
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { APP_CONFIG, APP_SERVICES, APP_WALLET_RULES } from "../src/appConfig.js";

const { app } = await import("../src/app.js");

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolver) => server.once("listening", resolver));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test("la config de la app expone los seis servicios con tres activos", () => {
  assert.equal(APP_SERVICES.length, 6);
  assert.equal(APP_SERVICES.filter((s) => s.status === "launch").length, 3);
  assert.deepEqual(
    APP_SERVICES.filter((s) => s.status === "launch").map((s) => s.slug),
    ["mototaxi", "taxi-pana", "delivery"],
  );
});

test("todo servicio trae precio mínimo, tarifa por km y fases coherentes", () => {
  for (const servicio of APP_SERVICES) {
    assert.ok(servicio.slug && servicio.name && servicio.icon, `falta identidad en ${servicio.slug}`);
    assert.ok(servicio.minFareUSD > 0, `${servicio.slug} sin tarifa mínima`);
    assert.ok(servicio.perKmUSD > 0, `${servicio.slug} sin tarifa por km`);
    assert.ok(servicio.capacity && servicio.eta, `${servicio.slug} sin capacidad o ETA`);
    if (servicio.status === "upcoming") {
      assert.ok(servicio.phase, `${servicio.slug} próximo debe indicar su fase`);
    } else {
      assert.equal(servicio.phase, null, `${servicio.slug} activo no debe tener fase`);
    }
  }
});

test("las reglas de billetera son las del prepago publicado", () => {
  assert.equal(APP_WALLET_RULES.commissionRate, 0.1);
  assert.equal(APP_WALLET_RULES.minCommissionUSD, 0.1);
  assert.equal(APP_WALLET_RULES.welcomeUSD, 2);
  assert.equal(APP_WALLET_RULES.minRechargeUSD, 5);
  assert.equal(APP_WALLET_RULES.maxRechargeUSD, 50);
});

test("GET /config/app responde sin base de datos y sin sesión", async () => {
  const respuesta = await fetch(`${base}/config/app`);
  assert.equal(respuesta.status, 200);
  const cuerpo = await respuesta.json();
  assert.equal(cuerpo.ok, true);
  assert.equal(cuerpo.version, APP_CONFIG.version);
  assert.deepEqual(cuerpo.services, APP_SERVICES);
  assert.deepEqual(cuerpo.walletRules, APP_WALLET_RULES);
  assert.equal(cuerpo.fareRules.minFareChargedOnce, true);
  assert.equal(cuerpo.fareRules.roundTripDoublesDistance, true);
});
