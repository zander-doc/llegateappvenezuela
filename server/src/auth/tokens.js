import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

const segundos = (ms) => Math.floor(ms / 1000);

function firmar(cabecera, cuerpo) {
  return createHmac("sha256", config.auth.jwtSecret)
    .update(`${cabecera}.${cuerpo}`)
    .digest("base64url");
}

export function firmarAcceso({ usuarioId, rol, sesionId, ahora = Date.now() }) {
  const iat = segundos(ahora);
  const exp = iat + config.auth.accessTtlSegundos;
  const cabecera = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const cuerpo = Buffer.from(
    JSON.stringify({ sub: usuarioId, rol, sid: sesionId, iat, exp, aud: "llegate" }),
  ).toString("base64url");
  return { token: `${cabecera}.${cuerpo}.${firmar(cabecera, cuerpo)}`, expiraEn: exp };
}

export function verificarAcceso(token) {
  const partes = String(token ?? "").split(".");
  if (partes.length !== 3) return null;

  const [cabecera, cuerpo, firma] = partes;
  const esperada = Buffer.from(firmar(cabecera, cuerpo));
  const recibida = Buffer.from(firma);
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;

  let datos;
  try {
    datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!datos?.sub || !datos?.sid) return null;
  if (!Number.isFinite(datos.exp) || datos.exp <= segundos(Date.now())) return null;
  return datos;
}

export function nuevoRefresh() {
  return randomBytes(32).toString("base64url");
}

export function hashRefresh(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function generarCodigo() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCodigo(telefono, codigo) {
  return createHmac("sha256", config.otp.secret).update(`${telefono}:${codigo}`).digest("hex");
}

export function codigoCoincide(telefono, codigo, esperado) {
  const recibido = Buffer.from(hashCodigo(telefono, codigo));
  const guardado = Buffer.from(String(esperado ?? ""));
  return recibido.length === guardado.length && timingSafeEqual(recibido, guardado);
}

export function venceRefresh(ahora = Date.now()) {
  return new Date(ahora + config.auth.refreshTtlDias * 24 * 60 * 60 * 1000);
}
