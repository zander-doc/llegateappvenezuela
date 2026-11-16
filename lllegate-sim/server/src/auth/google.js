import { createPublicKey, verify } from "node:crypto";
import { config } from "../config.js";

// Verifica el ID token que entrega "Ingresar con Google" sin dependencias
// nuevas: firma RS256 contra las claves públicas de Google, emisor, audiencia
// (nuestro ID de cliente), vigencia y correo verificado.

const EMISORES = new Set(["https://accounts.google.com", "accounts.google.com"]);
const CACHE_MS = 60 * 60 * 1000;
const MARGEN_RELOJ_MS = 60 * 1000;

let cache = { url: "", claves: [], hasta: 0 };

export class GoogleTokenError extends Error {
  constructor(motivo) {
    super(motivo);
    this.name = "GoogleTokenError";
    this.motivo = motivo;
  }
}

export function googleDisponible(google = config.google) {
  return google.clientIds.length > 0;
}

async function cargarClaves({ fetchImpl, url, ahora, forzar }) {
  if (!forzar && cache.url === url && cache.hasta > ahora) return cache.claves;

  const respuesta = await fetchImpl(url);
  if (!respuesta.ok) throw new GoogleTokenError("claves_no_disponibles");

  const { keys } = await respuesta.json();
  cache = { url, claves: Array.isArray(keys) ? keys : [], hasta: ahora + CACHE_MS };
  return cache.claves;
}

function decodificar(parte) {
  return JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
}

function fotoSegura(valor) {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    const esGoogle = url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com");
    return url.protocol === "https:" && esGoogle && valor.length <= 500 ? valor : null;
  } catch {
    return null;
  }
}

function nombreDe(datos, email) {
  const candidato = String(datos.name ?? datos.given_name ?? "").replace(/\s+/g, " ").trim();
  const nombre = candidato.length >= 2 ? candidato : email.split("@")[0];
  return nombre.slice(0, 120).padEnd(2, " ").trim() || "Usuario";
}

export async function verificarTokenGoogle(
  idToken,
  { google = config.google, fetchImpl = globalThis.fetch, ahora = Date.now() } = {},
) {
  if (!googleDisponible(google)) throw new GoogleTokenError("google_no_configurado");

  const partes = String(idToken ?? "").split(".");
  if (partes.length !== 3) throw new GoogleTokenError("token_malformado");

  let cabecera;
  let datos;
  try {
    cabecera = decodificar(partes[0]);
    datos = decodificar(partes[1]);
  } catch {
    throw new GoogleTokenError("token_malformado");
  }

  if (cabecera?.alg !== "RS256" || typeof cabecera.kid !== "string") {
    throw new GoogleTokenError("algoritmo_invalido");
  }

  const consulta = { fetchImpl, url: google.jwksUrl, ahora };
  let jwk = (await cargarClaves(consulta)).find((clave) => clave.kid === cabecera.kid);
  if (!jwk) {
    // Google rota sus claves: una sola recarga antes de rechazar.
    jwk = (await cargarClaves({ ...consulta, forzar: true })).find((clave) => clave.kid === cabecera.kid);
  }
  if (!jwk) throw new GoogleTokenError("clave_desconocida");

  let firmaValida = false;
  try {
    firmaValida = verify(
      "RSA-SHA256",
      Buffer.from(`${partes[0]}.${partes[1]}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(partes[2], "base64url"),
    );
  } catch {
    firmaValida = false;
  }
  if (!firmaValida) throw new GoogleTokenError("firma_invalida");

  if (!EMISORES.has(datos.iss)) throw new GoogleTokenError("emisor_invalido");

  const audiencias = [].concat(datos.aud ?? []);
  if (!audiencias.some((audiencia) => google.clientIds.includes(audiencia))) {
    throw new GoogleTokenError("audiencia_invalida");
  }

  if (!Number.isFinite(datos.exp) || datos.exp * 1000 + MARGEN_RELOJ_MS <= ahora) {
    throw new GoogleTokenError("token_vencido");
  }

  if (typeof datos.sub !== "string" || !datos.sub) throw new GoogleTokenError("sin_identificador");

  const email = String(datos.email ?? "").trim().toLowerCase();
  const verificado = datos.email_verified === true || datos.email_verified === "true";
  if (!email || !verificado) throw new GoogleTokenError("correo_no_verificado");

  return {
    sub: datos.sub,
    email,
    nombre: nombreDe(datos, email),
    foto: fotoSegura(datos.picture),
  };
}
