import { Router } from "express";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { driverDetailsSchema, driverDocumentSchema } from "../schemas.js";
import {
  decodificarDocumento,
  hashDocumento,
  rutaDocumento,
} from "../verification/documents.js";
import { extraerTexto } from "../verification/ocr.js";
import { config } from "../config.js";

export const driversRouter = Router();

const BUCKET = "documentos-conductores";

const DRIVER_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, created_at";

const DOCUMENT_COLUMNS = "tipo, mime, bytes, ocr_estado, ocr_confianza, created_at, updated_at";

async function guardarEnStorage(cliente, path, buffer, mime) {
  const { error } = await cliente.storage.from(BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
    cacheControl: "3600",
  });

  if (!error) return true;

  const estado = String(error.statusCode ?? error.status ?? "");
  if (estado === "409" || /already exists|duplicate/i.test(error.message ?? "")) {
    return false;
  }

  throw new HttpError(502, "almacenamiento_error", "No pudimos guardar el documento. Intenta de nuevo.");
}

driversRouter.use(requireUser);

driversRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const body = parse(driverDetailsSchema, req.body);

    const existente = unwrap(
      await req.supabase
        .from("conductores_detalles")
        .select("usuario_id, verificacion")
        .eq("usuario_id", req.user.id)
        .maybeSingle(),
    );

    if (existente && existente.verificacion !== "rechazado") {
      throw new HttpError(
        409,
        "registro_existente",
        "Ya tienes un registro de conductor en revisión o aprobado",
      );
    }

    const query = existente
      ? req.supabase
          .from("conductores_detalles")
          .update({ ...body, verificacion: "pendiente", motivo_rechazo: null })
          .eq("usuario_id", req.user.id)
      : req.supabase
          .from("conductores_detalles")
          .insert({ usuario_id: req.user.id, ...body });

    const detalle = unwrap(await query.select(DRIVER_COLUMNS).single());

    res.status(existente ? 200 : 201).json({ ok: true, conductor: detalle });
  }),
);

driversRouter.post(
  "/me/enviar",
  asyncHandler(async (req, res) => {
    const resultado = unwrap(await req.supabase.rpc("enviar_verificacion_conductor"));
    res.json(resultado);
  }),
);

driversRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const detalle = unwrap(
      await req.supabase
        .from("conductores_detalles")
        .select(DRIVER_COLUMNS)
        .eq("usuario_id", req.user.id)
        .maybeSingle(),
    );

    if (!detalle) throw new HttpError(404, "conductor_no_registrado", "Aún no tienes registro de conductor");

    const documentos = unwrap(
      await req.supabase
        .from("conductores_documentos")
        .select(DOCUMENT_COLUMNS)
        .eq("usuario_id", req.user.id)
        .order("tipo", { ascending: true }),
    );

    res.json({ ok: true, conductor: detalle, documentos: documentos ?? [] });
  }),
);

// ---------------------------------------------------------------------------
// Documentos: router aparte para aceptar cuerpos de hasta ~7 MB
//
// Se monta en app.js antes del parser JSON global (256 KB). La validación real
// ocurre sobre los bytes: el MIME declarado solo se usa para compararlo con la
// firma del archivo.
// ---------------------------------------------------------------------------
export const driverDocumentsRouter = Router();

driverDocumentsRouter.use(requireUser);

driverDocumentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(driverDocumentSchema, req.body);
    const archivo = decodificarDocumento(body, { maxBytes: config.verification.maxBytes });
    const hash = hashDocumento(archivo.buffer);
    const path = rutaDocumento({
      usuarioId: req.user.id,
      tipo: body.tipo,
      hash,
      mime: archivo.mime,
    });

    const subido = await guardarEnStorage(req.supabase, path, archivo.buffer, archivo.mime);
    const ocr = await extraerTexto({ buffer: archivo.buffer, mime: archivo.mime });

    try {
      const resultado = unwrap(
        await req.supabase.rpc("registrar_documento_conductor", {
          p_tipo: body.tipo,
          p_storage_path: path,
          p_mime: archivo.mime,
          p_bytes: archivo.bytes,
          p_hash_sha256: hash,
          p_ocr_estado: ocr.estado,
          p_ocr_texto: ocr.texto,
          p_ocr_confianza: ocr.confianza,
          p_ocr_datos: ocr.datos,
        }),
      );

      res.status(201).json(resultado);
    } catch (error) {
      // Si la fila no se registró, el archivo recién subido no debe quedar
      // huérfano. Si ya existía (409 de Storage), no se borra: puede ser el
      // documento vigente del piloto.
      if (subido) {
        await req.supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      }
      throw error;
    }
  }),
);
