import { Router } from "express";
import { config } from "../config.js";
import { fila, filas, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { driverDetailsSchema, driverDocumentSchema } from "../schemas.js";
import { borrar, subir } from "../storage.js";
import {
  decodificarDocumento,
  hashDocumento,
  rutaDocumento,
} from "../verification/documents.js";
import { extraerTexto } from "../verification/ocr.js";

export const driversRouter = Router();

const DRIVER_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, color, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, created_at";

const DOCUMENT_COLUMNS = "tipo, mime, bytes, ocr_estado, ocr_confianza, created_at, updated_at";

// Columnas que el piloto puede escribir; el resto (verificación, riesgo y
// fechas) solo cambia por RPC.
const CAMPOS_ESCRIBIBLES = [
  "cedula",
  "tipo_vehiculo",
  "placa",
  "marca",
  "modelo",
  "color",
  "anio",
  "cedula_url",
  "licencia_url",
  "certificado_medico_url",
];

driversRouter.use(requireUser);

driversRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const body = parse(driverDetailsSchema, req.body);

    const existente = await fila(
      "select usuario_id, verificacion from public.conductores_detalles where usuario_id = $1",
      [req.user.id],
    );

    if (existente && existente.verificacion !== "rechazado") {
      throw new HttpError(
        409,
        "registro_existente",
        "Ya tienes un registro de conductor en revisión o aprobado",
      );
    }

    const valores = CAMPOS_ESCRIBIBLES.map((campo) => body[campo] ?? null);
    let detalle;

    if (existente) {
      const asignaciones = CAMPOS_ESCRIBIBLES.map((campo, indice) => `${campo} = $${indice + 1}`).join(", ");
      detalle = await fila(
        `update public.conductores_detalles
            set ${asignaciones}, verificacion = 'pendiente', motivo_rechazo = null
          where usuario_id = $${valores.length + 1}
          returning ${DRIVER_COLUMNS}`,
        [...valores, req.user.id],
      );
    } else {
      const columnas = ["usuario_id", ...CAMPOS_ESCRIBIBLES].join(", ");
      const marcadores = valores.map((_, indice) => `$${indice + 2}`).join(", ");
      detalle = await fila(
        `insert into public.conductores_detalles (${columnas})
         values ($1, ${marcadores})
         returning ${DRIVER_COLUMNS}`,
        [req.user.id, ...valores],
      );
    }

    res.status(existente ? 200 : 201).json({ ok: true, conductor: detalle });
  }),
);

driversRouter.post(
  "/me/enviar",
  asyncHandler(async (req, res) => {
    const resultado = await rpc("enviar_verificacion_conductor", {}, { usuarioId: req.user.id });
    res.json(resultado);
  }),
);

driversRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const detalle = await fila(
      `select ${DRIVER_COLUMNS} from public.conductores_detalles where usuario_id = $1`,
      [req.user.id],
    );

    if (!detalle) throw new HttpError(404, "conductor_no_registrado", "Aún no tienes registro de conductor");

    const documentos = await filas(
      `select ${DOCUMENT_COLUMNS}
         from public.conductores_documentos
        where usuario_id = $1
        order by tipo asc`,
      [req.user.id],
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

    const subido = await subir(path, archivo.buffer, archivo.mime);
    const ocr = await extraerTexto({ buffer: archivo.buffer, mime: archivo.mime });

    try {
      const resultado = await rpc(
        "registrar_documento_conductor",
        {
          p_tipo: body.tipo,
          p_storage_path: path,
          p_mime: archivo.mime,
          p_bytes: archivo.bytes,
          p_hash_sha256: hash,
          p_ocr_estado: ocr.estado,
          p_ocr_texto: ocr.texto,
          p_ocr_confianza: ocr.confianza,
          p_ocr_datos: ocr.datos,
        },
        { usuarioId: req.user.id },
      );

      res.status(201).json(resultado);
    } catch (error) {
      // Si la fila no se registró, el archivo recién subido no debe quedar
      // huérfano. Si ya existía (mismo hash), no se borra: puede ser el
      // documento vigente del piloto.
      if (subido) {
        await borrar(path).catch(() => {});
      }
      throw error;
    }
  }),
);
