// Pruebas de integración para GET /trips/disponibles
import "./setup.mjs";
import assert from "node:assert/strict";
import { join } from "node:path";
import test, { after, before } from "node:test";
import {
  aplicarMigraciones,
  iniciarPostgres,
  root,
} from "../../scripts/embedded-postgres.mjs";
import { app } from "../src/app.js";

const PUERTO_PG = 55435;
const PUERTO_API = 4398;
const BASE = "llegate_api_trips_test";
const DIR_DATOS = join(root, ".pg-data-trips-test");
const DIR_ALMACEN = join(root, ".storage-trips-test");
const URL_API = `http://127.0.0.1:${PUERTO_API}`;

process.env.DATABASE_URL = `postgres://postgres:postgres@localhost:${PUERTO_PG}/${BASE}`;
process.env.AUTH_JWT_SECRET = "secreto-jwt-de-pruebas";
process.env.OTP_SECRET = "pepper-otp-de-pruebas";
process.env.OTP_LOG_EN_DESARROLLO = "1";
process.env.OTP_MAX_POR_IP = "100";
process.env.PUBLIC_API_URL = URL_API;
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = DIR_ALMACEN;
process.env.NODE_ENV = "test";

const PASAJERO = { id: "44444444-4444-4444-4444-444444444444", telefono: "+584144444444" };
const CONDUCTOR = { id: "55555555-5555-5555-5555-555555555555", telefono: "+584145555555" };

let pg;
let clienteSql;
let servidor;
let cerrarPool;

async function sql(consulta, parametros = []) {
  return (await clienteSql.query(consulta, parametros)).rows;
}

async function pedir(metodo, ruta, { cuerpo, token, headers = {} } = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  return { status: respuesta.status, cuerpo: datos, headers: respuesta.headers };
}

async function crearUsuariosDePrueba() {
  await sql(
    `insert into public.usuarios (id, telefono, telefono_verificado, rol, estado, ciudad, saldo_billetera)
     values ($1, $2, true, 'cliente', 'Aragua', 'Maracay', 0)
     on conflict (id) do nothing`,
    [PASAJERO.id, PASAJERO.telefono],
  );
  await sql(
    `insert into public.usuarios (id, telefono, telefono_verificado, rol, estado, ciudad, saldo_billetera)
     values ($1, $2, true, 'conductor', 'Aragua', 'Maracay', 50)
     on conflict (id) do nothing`,
    [CONDUCTOR.id, CONDUCTOR.telefono],
  );
  await sql(
    `insert into public.conductores_detalles (usuario_id, tipo_vehiculo, placa, marca, modelo, verificacion, estado)
     values ($1, 'moto', 'ABC123', 'Yamaha', 'YBR', 'aprobado', 'activo')
     on conflict (usuario_id) do nothing`,
    [CONDUCTOR.id],
  );
}

async function obtenerToken(telefono) {
  const resp = await pedir("POST", "/auth/ingresar", { cuerpo: { telefono } });
  return resp.cuerpo?.access_token;
}

before(async () => {
  pg = await iniciarPostgres({ puerto: PUERTO_PG, base: BASE, datos: DIR_DATOS });
  clienteSql = pg.client;
  await aplicarMigraciones(clienteSql);
  await crearUsuariosDePrueba();

  servidor = await new Promise((resolver) => {
    const s = app.listen(PUERTO_API, "127.0.0.1", () => resolver(s));
  });
  cerrarPool = (await import("../src/db.js")).cerrarPool;
});

after(async () => {
  await cerrarPool();
  await new Promise((resolver) => servidor.close(resolver));
  await pg.terminar();
});

test("conductor verificado puede ver viajes disponibles", async () => {
  const tokenPasajero = await obtenerToken(PASAJERO.telefono);
  assert.ok(tokenPasajero, "debe obtener token de pasajero");

  const viaje = await pedir("POST", "/trips", {
    token: tokenPasajero,
    cuerpo: {
      origen: "Av. Bolivar Este, Maracay",
      destino: "Centro de Maracay",
      precio_usd: "4.00",
      distancia_km: "3.5",
      metodo_pago: "efectivo",
    },
  });
  assert.equal(viaje.status, 201, JSON.stringify(viaje.cuerpo));
  const viajeId = viaje.cuerpo.viaje.id;

  const tokenConductor = await obtenerToken(CONDUCTOR.telefono);
  assert.ok(tokenConductor, "debe obtener token de conductor");

  const respuesta = await pedir("GET", "/trips/disponibles", {
    token: tokenConductor,
  });
  assert.equal(respuesta.status, 200, JSON.stringify(respuesta.cuerpo));
  assert.ok(respuesta.cuerpo.ok);
  assert(Array.isArray(respuesta.cuerpo.viajes));
  assert(
    respuesta.cuerpo.viajes.some((v) => v.id === viajeId),
    "el viaje creado debe aparecer en disponibles",
  );
});

test("pasajero no puede ver viajes disponibles", async () => {
  const tokenPasajero = await obtenerToken(PASAJERO.telefono);
  assert.ok(tokenPasajero);

  const respuesta = await pedir("GET", "/trips/disponibles", {
    token: tokenPasajero,
  });
  assert.equal(respuesta.status, 403, JSON.stringify(respuesta.cuerpo));
});

test("conductor no verificado no puede ver viajes disponibles", async () => {
  await sql(
    `insert into public.usuarios (id, telefono, telefono_verificado, rol, estado, ciudad, saldo_billetera)
     values ('66666666-6666-6666-6666-666666666666', '+584146666666', true, 'conductor', 'Aragua', 'Maracay', 0)
     on conflict (id) do nothing`,
  );
  await sql(
    `insert into public.conductores_detalles (usuario_id, tipo_vehiculo, placa, marca, modelo, verificacion, estado)
     values ('66666666-6666-6666-6666-666666666666', 'moto', 'XYZ999', 'Honda', 'Wave', 'pendiente', 'activo')
     on conflict (usuario_id) do nothing`,
  );

  const resp = await pedir("POST", "/auth/ingresar", {
    cuerpo: { telefono: "+584146666666" },
  });
  const token = resp.cuerpo?.access_token;
  assert.ok(token);

  const respuesta = await pedir("GET", "/trips/disponibles", { token });
  assert.equal(respuesta.status, 403, JSON.stringify(respuesta.cuerpo));
});