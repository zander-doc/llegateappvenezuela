import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { extraerTexto, ocrDisponible } = await import("../src/verification/ocr.js");

const BUFFER = Buffer.from("documento-de-prueba");

test("sin proveedor configurado el OCR no se intenta", async () => {
  let llamado = false;
  const resultado = await extraerTexto({
    buffer: BUFFER,
    mime: "image/png",
    ocr: { provider: "none", apiKey: "" },
    fetchImpl: async () => {
      llamado = true;
    },
  });

  assert.equal(llamado, false);
  assert.equal(resultado.estado, "no_configurado");
  assert.equal(resultado.texto, null);
  assert.equal(resultado.confianza, null);
});

test("ocrDisponible exige proveedor conocido y clave", () => {
  assert.equal(ocrDisponible({ provider: "ocrspace", apiKey: "k" }), true);
  assert.equal(ocrDisponible({ provider: "google_vision", apiKey: "k" }), true);
  assert.equal(ocrDisponible({ provider: "ocrspace", apiKey: "" }), false);
  assert.equal(ocrDisponible({ provider: "otro", apiKey: "k" }), false);
});

test("OCR.space envía el documento en base64 y promedia la confianza", async () => {
  let solicitud;
  const fetchImpl = async (url, opciones) => {
    solicitud = { url, opciones };
    return new Response(
      JSON.stringify({
        ParsedResults: [
          {
            ParsedText: "República Bolivariana\nV-12345678",
            TextOverlay: {
              Lines: [{ Words: [{ WordConfidence: 90 }, { WordConfidence: 70 }] }],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const resultado = await extraerTexto({
    buffer: BUFFER,
    mime: "image/png",
    ocr: { provider: "ocrspace", apiKey: "clave", endpoint: "", timeoutMs: 2000 },
    fetchImpl,
  });

  assert.equal(solicitud.url, "https://api.ocr.space/parse/image");
  assert.equal(solicitud.opciones.headers.apikey, "clave");
  assert.equal(solicitud.opciones.body.get("language"), "spa");
  assert.equal(
    solicitud.opciones.body.get("base64Image"),
    `data:image/png;base64,${BUFFER.toString("base64")}`,
  );
  assert.equal(resultado.estado, "listo");
  assert.equal(resultado.texto, "República Bolivariana\nV-12345678");
  assert.equal(resultado.confianza, 0.8);
  assert.equal(resultado.datos.proveedor, "ocrspace");
});

test("Google Vision usa la clave en la URL y la confianza de la página", async () => {
  let urlPedida;
  const fetchImpl = async (url) => {
    urlPedida = new URL(url);
    return new Response(
      JSON.stringify({
        responses: [
          {
            fullTextAnnotation: {
              text: "V-12345678 ANA CLIENTE",
              pages: [{ confidence: 0.93 }],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const resultado = await extraerTexto({
    buffer: BUFFER,
    mime: "image/jpeg",
    ocr: { provider: "google_vision", apiKey: "clave-google", endpoint: "", timeoutMs: 2000 },
    fetchImpl,
  });

  assert.equal(urlPedida.origin, "https://vision.googleapis.com");
  assert.equal(urlPedida.searchParams.get("key"), "clave-google");
  assert.equal(resultado.estado, "listo");
  assert.equal(resultado.texto, "V-12345678 ANA CLIENTE");
  assert.equal(resultado.confianza, 0.93);
  assert.equal(resultado.datos.proveedor, "google_vision");
});

test("un fallo del proveedor no bloquea la carga del documento", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: "sin cuota" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });

  const resultado = await extraerTexto({
    buffer: BUFFER,
    mime: "image/png",
    ocr: { provider: "ocrspace", apiKey: "clave", endpoint: "", timeoutMs: 2000 },
    fetchImpl,
  });

  assert.equal(resultado.estado, "fallido");
  assert.equal(resultado.texto, null);
  assert.match(resultado.datos.error, /429/);
});

test("un documento sin texto legible queda como fallido", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ ParsedResults: [{ ParsedText: "   " }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const resultado = await extraerTexto({
    buffer: BUFFER,
    mime: "image/png",
    ocr: { provider: "ocrspace", apiKey: "clave", endpoint: "", timeoutMs: 2000 },
    fetchImpl,
  });

  assert.equal(resultado.estado, "fallido");
  assert.match(resultado.datos.error, /texto legible/);
});
