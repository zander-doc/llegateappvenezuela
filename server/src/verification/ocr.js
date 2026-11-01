import { config } from "../config.js";

// OCR opcional. Sin proveedor configurado la carga del documento sigue
// funcionando: queda `no_configurado` y el operador revisa a mano. Un fallo del
// proveedor tampoco bloquea al piloto; se registra `fallido` para auditoría.

export function ocrDisponible(ocr = config.verification.ocr) {
  if (!ocr.apiKey) return false;
  return ocr.provider === "ocrspace" || ocr.provider === "google_vision";
}

function confianzaOcrSpace(resultado) {
  const palabras = resultado?.TextOverlay?.Lines?.flatMap((linea) => linea.Words ?? []) ?? [];
  const valores = palabras
    .map((palabra) => Number(palabra.WordConfidence))
    .filter((valor) => Number.isFinite(valor) && valor >= 0);
  if (valores.length === 0) return 0.85;
  return Math.min(1, Math.max(0, valores.reduce((suma, valor) => suma + valor, 0) / valores.length / 100));
}

async function ocrSpace({ buffer, mime, ocr, fetchImpl }) {
  const endpoint = ocr.endpoint || "https://api.ocr.space/parse/image";
  const form = new FormData();
  form.append("base64Image", `data:${mime};base64,${buffer.toString("base64")}`);
  form.append("language", "spa");
  form.append("isOverlayRequired", "true");
  form.append("OCREngine", "2");

  const respuesta = await fetchImpl(endpoint, {
    method: "POST",
    headers: { apikey: ocr.apiKey },
    body: form,
  });
  if (!respuesta.ok) throw new Error(`OCR.space respondió ${respuesta.status}`);

  const datos = await respuesta.json();
  if (datos?.IsErroredOnProcessing) {
    const mensaje = Array.isArray(datos.ErrorMessage) ? datos.ErrorMessage.join(" ") : datos.ErrorMessage;
    throw new Error(mensaje || "OCR.space no pudo leer el documento");
  }

  const primero = datos?.ParsedResults?.[0];
  const texto = String(primero?.ParsedText ?? "").trim();
  if (!texto) throw new Error("El OCR no encontró texto legible");

  return {
    texto,
    confianza: confianzaOcrSpace(primero),
    datos: { proveedor: "ocrspace", idioma: "spa" },
  };
}

async function googleVision({ buffer, ocr, fetchImpl }) {
  const endpoint = ocr.endpoint || "https://vision.googleapis.com/v1/images:annotate";
  const url = new URL(endpoint);
  if (!url.searchParams.get("key") && ocr.apiKey) url.searchParams.set("key", ocr.apiKey);

  const respuesta = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!respuesta.ok) throw new Error(`Google Vision respondió ${respuesta.status}`);

  const datos = await respuesta.json();
  const respuestaOcr = datos?.responses?.[0];
  if (respuestaOcr?.error) throw new Error(respuestaOcr.error.message ?? "Google Vision rechazó el documento");

  const texto = String(respuestaOcr?.fullTextAnnotation?.text ?? "").trim();
  if (!texto) throw new Error("El OCR no encontró texto legible");

  const confianza = Number(respuestaOcr?.fullTextAnnotation?.pages?.[0]?.confidence);

  return {
    texto,
    confianza: Number.isFinite(confianza) ? Math.min(1, Math.max(0, confianza)) : 0.85,
    datos: { proveedor: "google_vision", idioma: "es" },
  };
}

export async function extraerTexto({
  buffer,
  mime,
  fetchImpl = globalThis.fetch,
  ocr = config.verification.ocr,
}) {
  if (!ocrDisponible(ocr)) {
    return {
      estado: "no_configurado",
      texto: null,
      confianza: null,
      datos: { proveedor: ocr.provider || "none" },
    };
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), ocr.timeoutMs);

  try {
    const proveedor = ocr.provider === "ocrspace" ? ocrSpace : googleVision;
    const resultado = await proveedor({
      buffer,
      mime,
      ocr,
      fetchImpl: (url, opciones) => fetchImpl(url, { ...opciones, signal: control.signal }),
    });

    return {
      estado: "listo",
      texto: resultado.texto.slice(0, 20000),
      confianza: resultado.confianza,
      datos: resultado.datos,
    };
  } catch (error) {
    return {
      estado: "fallido",
      texto: null,
      confianza: null,
      datos: {
        proveedor: ocr.provider,
        error: error?.name === "AbortError" ? "tiempo_agotado" : String(error?.message ?? "error").slice(0, 300),
      },
    };
  } finally {
    clearTimeout(temporizador);
  }
}
