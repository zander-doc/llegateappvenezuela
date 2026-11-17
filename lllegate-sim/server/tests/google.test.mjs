import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import "./setup.mjs";

const { GoogleTokenError, googleDisponible, verificarTokenGoogle } = await import("../src/auth/google.js");
const { etiquetaRol } = await import("../src/auth/etiquetaRol.js");

const CLIENT_ID = "123-abc.apps.googleusercontent.com";
const AHORA = Date.UTC(2026, 10, 16, 12, 0, 0);

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "clave-1", alg: "RS256", use: "sig" };

function b64(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString("base64url");
}

function firmar(datos, { kid = "clave-1", alg = "RS256", llave = privateKey } = {}) {
  const cuerpo = `${b64({ alg, kid, typ: "JWT" })}.${b64(datos)}`;
  const firma = createSign("RSA-SHA256").update(cuerpo).sign(llave).toString("base64url");
  return `${cuerpo}.${firma}`;
}

function datosValidos(extra = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "1234567890",
    email: "Ana.Perez@Example.com",
    email_verified: true,
    name: "Ana Pérez",
    picture: "https://lh3.googleusercontent.com/a/foto=s96-c",
    exp: Math.floor(AHORA / 1000) + 3600,
    ...extra,
  };
}

let descargas = 0;
function opciones(extra = {}) {
  return {
    google: { clientIds: [CLIENT_ID], jwksUrl: `https://claves.test/${Math.random()}` },
    ahora: AHORA,
    fetchImpl: async () => {
      descargas += 1;
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    },
    ...extra,
  };
}

async function motivoDe(token, extra) {
  try {
    await verificarTokenGoogle(token, opciones(extra));
  } catch (error) {
    assert.ok(error instanceof GoogleTokenError, String(error));
    return error.motivo;
  }
  return "sin_error";
}

test("un token válido entrega correo en minúsculas, nombre y foto", async () => {
  const perfil = await verificarTokenGoogle(firmar(datosValidos()), opciones());
  assert.deepEqual(perfil, {
    sub: "1234567890",
    email: "ana.perez@example.com",
    nombre: "Ana Pérez",
    foto: "https://lh3.googleusercontent.com/a/foto=s96-c",
  });
});

test("una foto que no es de Google se descarta", async () => {
  const perfil = await verificarTokenGoogle(
    firmar(datosValidos({ picture: "https://sitio-malicioso.test/x.png" })),
    opciones(),
  );
  assert.equal(perfil.foto, null);
});

test("rechaza audiencia, emisor, vencimiento y correo no verificado", async () => {
  assert.equal(await motivoDe(firmar(datosValidos({ aud: "otro.apps.googleusercontent.com" }))), "audiencia_invalida");
  assert.equal(await motivoDe(firmar(datosValidos({ iss: "https://falso.test" }))), "emisor_invalido");
  assert.equal(await motivoDe(firmar(datosValidos({ exp: Math.floor(AHORA / 1000) - 600 }))), "token_vencido");
  assert.equal(await motivoDe(firmar(datosValidos({ email_verified: false }))), "correo_no_verificado");
});

test("rechaza firma ajena, algoritmo distinto y clave desconocida", async () => {
  const otra = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  assert.equal(await motivoDe(firmar(datosValidos(), { llave: otra })), "firma_invalida");
  assert.equal(await motivoDe(firmar(datosValidos(), { alg: "none" })), "algoritmo_invalido");
  assert.equal(await motivoDe(firmar(datosValidos(), { kid: "no-existe" })), "clave_desconocida");
  assert.equal(await motivoDe("esto.no-es-un-token"), "token_malformado");
});

test("sin ID de cliente configurado, Google queda apagado", async () => {
  assert.equal(googleDisponible({ clientIds: [] }), false);
  assert.equal(
    await motivoDe(firmar(datosValidos()), { google: { clientIds: [], jwksUrl: "https://claves.test/x" } }),
    "google_no_configurado",
  );
});

test("las claves de Google se guardan y no se piden en cada ingreso", async () => {
  const config = opciones();
  descargas = 0;
  await verificarTokenGoogle(firmar(datosValidos()), config);
  await verificarTokenGoogle(firmar(datosValidos({ sub: "otro" })), config);
  assert.equal(descargas, 1);
});

test("la etiqueta de rol coincide para web y app", () => {
  assert.equal(etiquetaRol({ rol: "cliente", es_conductor: false }), "Pasajero");
  assert.equal(etiquetaRol({ rol: "admin", es_conductor: false }), "Administrador");
  assert.equal(
    etiquetaRol({ rol: "conductor", es_conductor: true, tipo_vehiculo: "moto", puede_conducir: true }),
    "Piloto mototaxi",
  );
  assert.equal(
    etiquetaRol({ rol: "conductor", es_conductor: true, tipo_vehiculo: "carro", puede_conducir: true }),
    "Taxista",
  );
  assert.equal(
    etiquetaRol({ rol: "cliente", es_conductor: true, tipo_vehiculo: "moto", puede_conducir: false }),
    "Conductor en verificación",
  );
});
