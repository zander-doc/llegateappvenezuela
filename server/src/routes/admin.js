import { Router } from "express";
import { fila, filas, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireAdmin, requireUser } from "../middleware.js";
import { estadoVerificacionSchema, rejectSchema, uuidSchema, verifyDriverSchema } from "../schemas.js";
import { urlFirmada } from "../storage.js";

export const adminRouter = Router();

const DRIVER_ADMIN_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, verificado_por, verificado_en, created_at";

adminRouter.use(requireUser, requireAdmin);

adminRouter.get(
  "/recargas",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ?? "pendiente";
    const recargas = await filas(
      `select id, usuario_id, metodo, monto_usd, banco, referencia, comprobante_url,
              billetera, estado, motivo_rechazo, created_at
         from public.transacciones_billetera
        where tipo = 'recarga' and estado = $1::public.estado_transaccion
        order by created_at asc
        limit 100`,
      [estado],
    );

    res.json({ ok: true, recargas });
  }),
);

adminRouter.post(
  "/recargas/:id/aprobar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("aprobar_recarga", { p_transaccion_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.post(
  "/recargas/:id/rechazar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(rejectSchema, req.body);
    const resultado = await rpc(
      "rechazar_recarga",
      { p_transaccion_id: id, p_motivo: body.motivo },
      { usuarioId: req.user.id },
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.get(
  "/pagos",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ?? "en_revision";
    const pagos = await filas(
      `select id, usuario_id, metodo, proveedor, estado, monto_usd, monto_bs, tasa_bs,
              codigo, referencia_reportada, comprobante_url, checkout_url, expira_en,
              confirmado_en, motivo_rechazo, created_at
         from public.pagos
        where estado = $1::public.estado_pago
        order by created_at asc
        limit 100`,
      [estado],
    );

    res.json({ ok: true, pagos });
  }),
);

adminRouter.post(
  "/pagos/:id/confirmar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("confirmar_pago_admin", { p_pago_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.post(
  "/pagos/:id/rechazar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(rejectSchema, req.body);
    const resultado = await rpc(
      "rechazar_pago",
      { p_pago_id: id, p_motivo: body.motivo },
      { usuarioId: req.user.id },
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.get(
  "/conductores",
  asyncHandler(async (req, res) => {
    const verificacion = parse(estadoVerificacionSchema, req.query.verificacion ?? "pendiente", "verificacion");
    const conductores = await filas(
      `select usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, verificacion,
              estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en,
              intentos_verificacion, created_at
         from public.conductores_detalles
        where verificacion = $1::public.estado_verificacion
        order by riesgo_puntaje desc nulls last, created_at asc
        limit 100`,
      [verificacion],
    );

    const ids = conductores.map((conductor) => conductor.usuario_id);
    const [perfiles, documentos] = ids.length
      ? await Promise.all([
          filas(
            "select id, nombre, telefono, whatsapp, email, telefono_verificado from public.usuarios where id = any($1::uuid[])",
            [ids],
          ),
          filas(
            "select usuario_id, tipo, mime, bytes, ocr_estado, ocr_confianza from public.conductores_documentos where usuario_id = any($1::uuid[])",
            [ids],
          ),
        ])
      : [[], []];

    const porUsuario = new Map(perfiles.map((perfil) => [perfil.id, perfil]));
    const docsPorUsuario = new Map();
    for (const documento of documentos) {
      const lista = docsPorUsuario.get(documento.usuario_id) ?? [];
      lista.push(documento);
      docsPorUsuario.set(documento.usuario_id, lista);
    }

    res.json({
      ok: true,
      conductores: conductores.map((conductor) => ({
        ...conductor,
        usuario: porUsuario.get(conductor.usuario_id) ?? null,
        documentos: docsPorUsuario.get(conductor.usuario_id) ?? [],
      })),
    });
  }),
);

adminRouter.get(
  "/conductores/:usuarioId",
  asyncHandler(async (req, res) => {
    const usuarioId = parse(uuidSchema, req.params.usuarioId, "usuarioId");

    const detalle = await fila(
      `select ${DRIVER_ADMIN_COLUMNS} from public.conductores_detalles where usuario_id = $1`,
      [usuarioId],
    );
    if (!detalle) {
      throw new HttpError(404, "conductor_no_encontrado", "Ese conductor no existe");
    }

    const [perfil, documentos, eventos] = await Promise.all([
      fila(
        "select id, nombre, telefono, whatsapp, email, telefono_verificado, created_at from public.usuarios where id = $1",
        [usuarioId],
      ),
      filas(
        `select tipo, storage_path, mime, bytes, hash_sha256, ocr_estado, ocr_texto,
                ocr_confianza, ocr_datos, created_at, updated_at
           from public.conductores_documentos
          where usuario_id = $1
          order by tipo asc`,
        [usuarioId],
      ),
      filas(
        `select id, tipo, severidad, detalle, created_at
           from public.eventos_seguridad
          where usuario_id = $1
          order by created_at desc
          limit 20`,
        [usuarioId],
      ),
    ]);

    const conUrl = documentos.map((documento) => ({
      ...documento,
      url: documento.storage_path ? urlFirmada(documento.storage_path, 900) : null,
    }));

    res.json({
      ok: true,
      conductor: detalle,
      usuario: perfil ?? null,
      documentos: conUrl,
      eventos,
    });
  }),
);

adminRouter.post(
  "/conductores/:usuarioId/verificar",
  asyncHandler(async (req, res) => {
    const usuarioId = parse(uuidSchema, req.params.usuarioId, "usuarioId");
    const body = parse(verifyDriverSchema, req.body);
    const resultado = await rpc(
      "verificar_conductor",
      {
        p_usuario_id: usuarioId,
        p_aprobado: body.aprobado,
        p_motivo: body.motivo ?? null,
      },
      { usuarioId: req.user.id },
    );

    res.json(resultado);
  }),
);
