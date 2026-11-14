import { Router } from "express";
import { fila, filas, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireAdmin, requireUser } from "../middleware.js";
import {
  estadoNegocioSchema,
  estadoSolicitudSchema,
  estadoVerificacionSchema,
  negocioEstadoSchema,
  rejectSchema,
  solicitudEstadoSchema,
  tipoSolicitudSchema,
  uuidSchema,
  verifyDriverSchema,
} from "../schemas.js";
import { urlFirmada } from "../storage.js";

export const adminRouter = Router();

const DRIVER_ADMIN_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, color, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, verificado_por, verificado_en, created_at";

adminRouter.use(requireUser, requireAdmin);

adminRouter.get(
  "/recargas",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ?? "pendiente";
    const recargas = await filas(
      `select t.id, t.usuario_id, t.metodo, t.monto_usd, t.banco, t.referencia, t.comprobante_url,
              t.billetera, t.estado, t.motivo_rechazo, t.created_at,
              u.nombre as usuario_nombre, u.telefono as usuario_telefono
         from public.transacciones_billetera t
         left join public.usuarios u on u.id = t.usuario_id
        where t.tipo = 'recarga' and t.estado = $1::public.estado_transaccion
        order by t.created_at asc
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
      `select p.id, p.usuario_id, p.metodo, p.proveedor, p.estado, p.monto_usd, p.monto_bs, p.tasa_bs,
              p.codigo, p.referencia_reportada, p.comprobante_url, p.checkout_url, p.expira_en,
              p.confirmado_en, p.motivo_rechazo, p.created_at,
              u.nombre as usuario_nombre, u.telefono as usuario_telefono
         from public.pagos p
         left join public.usuarios u on u.id = p.usuario_id
        where p.estado = $1::public.estado_pago
        order by p.created_at asc
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

adminRouter.get(
  "/solicitudes",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ? parse(estadoSolicitudSchema, req.query.estado, "estado") : null;
    const tipo = req.query.tipo ? parse(tipoSolicitudSchema, req.query.tipo, "tipo") : null;

    const solicitudes = await filas(
      `select id, tipo, estado, nombre, contacto, ciudad, mensaje, datos, origen,
              nota_admin, atendida_en, created_at, updated_at
         from public.solicitudes
        where ($1::public.estado_solicitud is null or estado = $1)
          and ($2::public.tipo_solicitud is null or tipo = $2)
        order by created_at desc
        limit 200`,
      [estado, tipo],
    );

    res.json({ ok: true, solicitudes });
  }),
);

adminRouter.post(
  "/solicitudes/:id/estado",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(solicitudEstadoSchema, req.body);

    // Volver a `nueva` borra la fecha: la restricción de la tabla exige que
    // todo estado gestionado la tenga. $2 lleva el cast explícito en los dos
    // sitios: sin él, el `$2 = 'nueva'` del CASE lo deduce text y choca con el
    // estado_solicitud del SET ("inconsistent types deduced for parameter $2").
    const actualizada = await fila(
      `update public.solicitudes
          set estado = $2::public.estado_solicitud,
              nota_admin = coalesce($3, nota_admin),
              atendida_en = case
                when $2::public.estado_solicitud = 'nueva' then null
                else coalesce(atendida_en, now())
              end
        where id = $1
        returning id, tipo, estado, nota_admin, atendida_en`,
      [id, body.estado, body.nota ?? null],
    );

    if (!actualizada) {
      throw new HttpError(404, "solicitud_no_encontrada", "Esa solicitud ya no está en la bandeja");
    }

    res.json({ ok: true, solicitud: actualizada });
  }),
);

adminRouter.get(
  "/negocios",
  asyncHandler(async (req, res) => {
    const estado = parse(estadoNegocioSchema, req.query.estado ?? "pendiente", "estado");
    const negocios = await filas(
      `select id, slug, nombre, categoria, estado, ciudad, zona, direccion, horario,
              oferta, descripcion, sitio, contacto, telefono_publico, verificado,
              motivo_rechazo, nota_admin, publicada_en, created_at, updated_at
         from public.negocios
        where estado = $1::public.estado_negocio
        order by created_at asc
        limit 200`,
      [estado],
    );

    res.json({ ok: true, negocios });
  }),
);

adminRouter.post(
  "/negocios/:id/estado",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(negocioEstadoSchema, req.body);

    // Publicar deja la fecha; cualquier otro estado la borra, porque la
    // restricción de la tabla solo admite `publicada_en` en fichas publicadas.
    // El sello Verificado solo se mueve si el cuerpo lo trae explícito.
    const actualizado = await fila(
      `update public.negocios
          set estado = $2::public.estado_negocio,
              motivo_rechazo = case
                when $2::public.estado_negocio = 'rechazado' then $3
                else null
              end,
              nota_admin = coalesce($4, nota_admin),
              verificado = coalesce($5::boolean, verificado),
              publicada_en = case
                when $2::public.estado_negocio = 'publicado' then coalesce(publicada_en, now())
                else null
              end
        where id = $1
        returning id, slug, nombre, categoria, estado, ciudad, verificado,
                  motivo_rechazo, nota_admin, publicada_en`,
      [id, body.estado, body.motivo ?? null, body.nota ?? null, body.verificado ?? null],
    );

    if (!actualizado) {
      throw new HttpError(404, "negocio_no_encontrado", "Esa ficha ya no está en la cola");
    }

    res.json({ ok: true, negocio: actualizado });
  }),
);
