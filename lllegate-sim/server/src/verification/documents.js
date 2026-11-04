import { createHash } from "node:crypto";
import { HttpError } from "../http.js";

const MIME_POR_FIRMA = [
  { mime: "image/jpeg", firma: [0xff, 0xd8, 0xff] },
  { mime: "image/png", firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "application/pdf", firma: [0x25, 0x50, 0x44, 0x46] },
];

const EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const TIPOS = ["cedula_frente", "cedula_reverso", "licencia", "certificado_medico"];

export { TIPOS as TIPOS_DOCUMENTO };

function esWebp(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function detectarMime(buffer) {
  for (const { mime, firma } of MIME_POR_FIRMA) {
    if (buffer.length >= firma.length && firma.every((byte, indice) => buffer[indice] === byte)) {
      return mime;
    }
  }
  return esWebp(buffer) ? "image/webp" : null;
}

export function decodificarDocumento(body, { maxBytes }) {
  const limpio = body.contenido_base64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) {
    throw new HttpError(422, "documento_invalido", "El archivo no está codificado en base64 válido");
  }

  const buffer = Buffer.from(limpio, "base64");
  if (buffer.length === 0) {
    throw new HttpError(422, "documento_vacio", "El archivo está vacío");
  }
  if (buffer.length > maxBytes) {
    throw new HttpError(
      413,
      "documento_muy_grande",
      `El archivo supera el máximo de ${Math.round(maxBytes / (1024 * 1024))} MB`,
    );
  }

  // El MIME declarado por el navegador no es confiable: se compara con los
  // bytes reales del archivo.
  const detectado = detectarMime(buffer);
  if (!detectado) {
    throw new HttpError(
      422,
      "formato_no_soportado",
      "Sube una foto JPG, PNG, WebP o un PDF del documento",
    );
  }
  if (body.mime !== detectado) {
    throw new HttpError(
      422,
      "mime_no_coincide",
      "El contenido del archivo no coincide con el formato declarado",
    );
  }

  return { buffer, mime: detectado, bytes: buffer.length };
}

export function hashDocumento(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function rutaDocumento({ usuarioId, tipo, hash, mime }) {
  return `${usuarioId}/${tipo}-${hash.slice(0, 16)}.${EXTENSION[mime]}`;
}

export function extensionDeMime(mime) {
  return EXTENSION[mime] ?? null;
}
