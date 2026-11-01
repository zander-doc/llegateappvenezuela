import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { AwsClient } from "aws4fetch";
import { config } from "./config.js";
import { HttpError } from "./http.js";

const almacen = config.storage;

const MIME_POR_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function clienteR2() {
  const { accountId, accessKeyId, secretAccessKey, endpoint } = almacen.r2;
  if (!accessKeyId || !secretAccessKey || !(endpoint || accountId)) return null;
  return new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
}

export function almacenamientoDisponible() {
  return almacen.driver === "local" || Boolean(clienteR2());
}

function urlObjeto(ruta) {
  const base =
    almacen.r2.endpoint || `https://${almacen.r2.accountId}.r2.cloudflarestorage.com`;
  const codificada = ruta.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/${almacen.bucket}/${codificada}`;
}

function rutaLocal(ruta) {
  const base = resolve(almacen.localDir);
  const destino = resolve(base, ruta);
  if (destino !== base && !destino.startsWith(base + sep)) {
    throw new HttpError(400, "ruta_invalida", "Ruta de archivo inválida");
  }
  return destino;
}

// Devuelve false cuando el archivo ya existía: los documentos son inmutables y
// el nombre incluye el hash, así que un duplicado es el mismo contenido.
export async function subir(ruta, buffer, mime) {
  if (almacen.driver === "local") {
    const destino = rutaLocal(ruta);
    await mkdir(dirname(destino), { recursive: true });
    try {
      await writeFile(destino, buffer, { flag: "wx" });
      return true;
    } catch (error) {
      if (error.code === "EEXIST") return false;
      throw error;
    }
  }

  const cliente = clienteR2();
  if (!cliente) {
    throw new HttpError(503, "almacenamiento_no_configurado", "El almacenamiento de documentos no está configurado");
  }

  const peticion = new Request(urlObjeto(ruta), {
    method: "PUT",
    headers: { "content-type": mime, "if-none-match": "*" },
    body: buffer,
  });
  const respuesta = await fetch(await cliente.sign(peticion));
  if (respuesta.status === 412) return false;
  if (!respuesta.ok) {
    throw new HttpError(502, "almacenamiento_error", "No pudimos guardar el documento. Intenta de nuevo.");
  }
  return true;
}

export async function borrar(ruta) {
  if (almacen.driver === "local") {
    await rm(rutaLocal(ruta), { force: true });
    return;
  }

  const cliente = clienteR2();
  if (!cliente) return;
  const respuesta = await fetch(await cliente.sign(urlObjeto(ruta), { method: "DELETE" }));
  if (!respuesta.ok && respuesta.status !== 404) {
    throw new Error(`r2_delete_${respuesta.status}`);
  }
}

export async function leer(ruta) {
  if (almacen.driver === "local") {
    try {
      const buffer = await readFile(rutaLocal(ruta));
      return { buffer, mime: MIME_POR_EXTENSION[extname(ruta).toLowerCase()] ?? "application/octet-stream" };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  const cliente = clienteR2();
  if (!cliente) return null;
  const respuesta = await fetch(await cliente.sign(urlObjeto(ruta), { method: "GET" }));
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) {
    throw new HttpError(502, "almacenamiento_error", "No pudimos leer el documento");
  }
  return {
    buffer: Buffer.from(await respuesta.arrayBuffer()),
    mime:
      respuesta.headers.get("content-type") ??
      MIME_POR_EXTENSION[extname(ruta).toLowerCase()] ??
      "application/octet-stream",
  };
}

// Enlaces de descarga firmados por la propia API: el token lleva la ruta y el
// vencimiento, y la firma impide alterarlos. Funciona igual con R2 o con disco,
// y caduca a los pocos minutos como una URL firmada de Storage.
export function urlFirmada(ruta, segundos = almacen.urlSegundos) {
  const expira = Math.floor(Date.now() / 1000) + Math.max(Number(segundos) || 0, 30);
  const firma = crearFirma(ruta, expira);
  const token = Buffer.from(JSON.stringify({ p: ruta, e: expira, s: firma })).toString("base64url");
  return `${config.publicBaseUrl.replace(/\/$/, "")}/files/${token}`;
}

function crearFirma(ruta, expira) {
  return createHmac("sha256", almacen.secret).update(`${ruta}:${expira}`).digest("base64url");
}

export function rutaDeToken(token) {
  let datos;
  try {
    datos = JSON.parse(Buffer.from(String(token), "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!datos?.p || !Number.isFinite(datos?.e) || typeof datos?.s !== "string") return null;
  if (datos.e <= Math.floor(Date.now() / 1000)) return null;

  const esperada = Buffer.from(crearFirma(datos.p, datos.e));
  const recibida = Buffer.from(datos.s);
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;

  return datos.p;
}
