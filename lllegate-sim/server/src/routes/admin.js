import { Router } from "express";
import { fila, filas, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { PERMISOS_PERSONAL, requireAdmin, requirePermiso, requireUser } from "../middleware.js";
import {
  asignarPersonalSchema,
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
import { avisoVerificacion, notificar } from "../notificaciones.js";
import { registrarEvento } from "../eventos.js";

export const adminRouter = Router();

const DRIVER_ADMIN_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, color, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, verificado_por, verificado_en, created_at";

adminRouter.use(requireUser, requireAdmin);

// Quién soy y qué módulos puedo usar: el panel arma su menú con esto.
adminRouter.get("/yo", (req, res) => {
  res.json({ ok: true, rol_personal: req.staff.rolPersonal, permisos: req.staff.permisos });
});

// Personal: solo el superadmin ve y asigna roles. Quien va a ser personal se
// registra con su teléfono como cualquier persona y el superadmin le da el rol.
adminRouter.get(
  "/personal",
  requirePermiso("personal"),
  asyncHandler(async (_req, res) => {
    const personal = await filas(
      `select id, nombre, telefono, rol_personal, ultimo_acceso_en
         from public.usuarios
        where rol = 'admin'
        order by rol_personal asc, nombre asc`,
    );
    res.json({ ok: true, personal });
  }),
);

adminRouter.post(
  "/personal/asignar",
  requirePermiso("personal"),
  asyncHandler(async (req, res) => {
    const { telefono, rol_personal } = parse(asignarPersonalSchema, req.body);

    const destino = await fila("select id, rol, rol_personal from public.usuarios where telefono = $1", [telefono]);
    if (!destino) {
      throw new HttpError(404, "usuario_no_encontrado", "Esa persona aún no tiene cuenta; debe registrarse primero");
    }
    if (destino.rol === "conductor") {
      throw new HttpError(409, "cuenta_de_conductor", "Esa cuenta es de piloto; el personal usa una cuenta aparte");
    }
    if (destino.id === req.user.id) {
      throw new HttpError(409, "no_te_cambies_el_rol", "No puedes cambiar tu propio rol de personal");
    }

    if (rol_personal === null && destino.rol_personal === "superadmin") {
      const { total } = await fila(
        "select count(*)::int as total from public.usuarios where rol = 'admin' and rol_personal = 'superadmin'",
      );
      if (total <= 1) {
        throw new HttpError(409, "ultimo_superadmin", "Debe quedar al menos un superadmin");
      }
    }

    // Quitar el rol devuelve a la persona a cliente; asignarlo la hace admin.
    const actualizado = await fila(
      `update public.usuarios
          set rol = $2::text::public.rol_usuario,
              rol_personal = $3,
              updated_at = now()
        where id = $1
        returning id, nombre, telefono, rol, rol_personal`,
      [destino.id, rol_personal === null ? "cliente" : "admin", rol_personal],
    );

    await registrarEvento(req.user.id, "personal_asignado", {
      objetivo: destino.id,
      antes: destino.rol_personal,
      despues: rol_personal,
    });

    res.json({ ok: true, usuario: actualizado });
  }),
);

// Meta de arranque: 90 pilotos activos con prepago recurrente al cierre del mes 3.
// "Activo" = piloto aprobado con una recarga confirmada en los últimos 30 días.
const META_PILOTOS_ACTIVOS = 90;

// Resumen para la portada del panel. Cada bloque se entrega solo si el rol de
// la persona puede usarlo: quien no tiene "dinero" nunca recibe cifras de dinero.
adminRouter.get(
  "/resumen",
  asyncHandler(async (req, res) => {
    const permisos = req.staff.permisos;
    const puede = (modulo) => permisos.includes(modulo);
    const hoyCaracas = "(now() at time zone 'America/Caracas')::date";

    const pilotos = await conteosPilotos();

    const hoy = await fila(
      `select
         count(*) filter (where estado = 'finalizado'
           and (finalizado_en at time zone 'America/Caracas')::date = ${hoyCaracas})::int as completados,
         count(*) filter (where estado = 'cancelado'
           and (cancelado_en at time zone 'America/Caracas')::date = ${hoyCaracas})::int as cancelados
       from public.viajes`,
    );

    const porDia = await filas(
      `select to_char(d.dia, 'YYYY-MM-DD') as dia,
              count(v.id)::int as total
         from generate_series(${hoyCaracas} - 6, ${hoyCaracas}, interval '1 day') as d(dia)
         left join public.viajes v
           on v.estado = 'finalizado'
          and (v.finalizado_en at time zone 'America/Caracas')::date = d.dia::date
        group by d.dia
        order by d.dia`,
    );

    const cuentas = await fila(
      `select count(*)::int as total from public.usuarios where rol in ('cliente', 'conductor')`,
    );
    const registros = await fila(
      `select count(*)::int as total from public.conductores_detalles`,
    );

    const pendientes = {};
    if (puede("documentos")) {
      pendientes.pilotos = pilotos.pendientes;
    }
    if (puede("soporte")) {
      pendientes.solicitudes = (
        await fila("select count(*)::int as total from public.solicitudes where estado = 'nueva'")
      ).total;
    }
    if (puede("negocios")) {
      pendientes.negocios = (
        await fila("select count(*)::int as total from public.negocios where estado = 'pendiente'")
      ).total;
    }

    let dinero = null;
    if (puede("dinero")) {
      dinero = await fila(
        `select
           coalesce((select sum(monto_usd) from public.pagos
                      where estado = 'confirmado'
                        and (confirmado_en at time zone 'America/Caracas')::date = ${hoyCaracas}), 0)::float8 as recargas_hoy_usd,
           (select count(*) from public.pagos
             where estado = 'confirmado'
               and (confirmado_en at time zone 'America/Caracas')::date = ${hoyCaracas})::int as recargas_hoy,
           coalesce((select sum(monto_usd) from public.pagos where estado = 'en_revision'), 0)::float8 as por_confirmar_usd,
           (select count(*) from public.pagos where estado = 'en_revision')::int as por_confirmar,
           coalesce((select sum(comision_usd) from public.viajes
                      where estado = 'finalizado'
                        and date_trunc('month', finalizado_en at time zone 'America/Caracas')
                            = date_trunc('month', now() at time zone 'America/Caracas')), 0)::float8 as comision_mes_usd`,
      );
      const recargasPendientes = await fila(
        "select count(*)::int as total from public.transacciones_billetera where tipo = 'recarga' and estado = 'pendiente'",
      );
      pendientes.cobros = dinero.por_confirmar + recargasPendientes.total;
    }

    res.json({
      ok: true,
      rol_personal: req.staff.rolPersonal,
      permisos,
      pilotos: {
        meta: META_PILOTOS_ACTIVOS,
        aprobados: pilotos.aprobados,
        activos_30d: pilotos.activos_30d,
        con_saldo: pilotos.con_saldo,
        en_linea: pilotos.en_linea,
      },
      viajes: { completados_hoy: hoy.completados, cancelados_hoy: hoy.cancelados, por_dia: porDia },
      embudo: {
        cuentas: cuentas.total,
        registros_piloto: registros.total,
        aprobados: pilotos.aprobados,
        activos_30d: pilotos.activos_30d,
      },
      pendientes,
      dinero,
    });
  }),
);

// Conteos de pilotos que comparten el medidor y el resumen.
function conteosPilotos() {
  return fila(
      `select
         count(*) filter (where d.verificacion = 'aprobado')::int as aprobados,
         count(*) filter (where d.verificacion = 'pendiente')::int as pendientes,
         count(*) filter (where d.verificacion = 'aprobado' and d.estado = 'activo')::int as con_saldo,
         count(*) filter (
           where d.verificacion = 'aprobado'
             and d.en_linea
             and d.en_linea_actualizado_en > now() - interval '12 hours'
         )::int as en_linea,
         count(*) filter (
           where d.verificacion = 'aprobado'
             and (
               exists (
                 select 1 from public.pagos p
                  where p.usuario_id = d.usuario_id
                    and p.estado = 'confirmado'
                    and p.confirmado_en > now() - interval '30 days'
               )
               or exists (
                 select 1 from public.transacciones_billetera t
                  where t.usuario_id = d.usuario_id
                    and t.tipo = 'recarga'
                    and t.estado = 'aprobada'
                    and t.created_at > now() - interval '30 days'
               )
             )
         )::int as activos_30d
       from public.conductores_detalles d`
  );
}

adminRouter.get(
  "/metricas/pilotos",
  requirePermiso("metricas"),
  asyncHandler(async (_req, res) => {
    const resumen = await conteosPilotos();

    // Pilotos aprobados por semana, las últimas 8 (la más reciente al final).
    const semanas = await filas(
      `select to_char(s.semana, 'YYYY-MM-DD') as semana,
              count(d.usuario_id)::int as aprobados
         from generate_series(
                date_trunc('week', now()) - interval '7 weeks',
                date_trunc('week', now()),
                interval '1 week'
              ) as s(semana)
         left join public.conductores_detalles d
           on d.verificacion = 'aprobado'
          and d.verificado_en >= s.semana
          and d.verificado_en < s.semana + interval '1 week'
        group by s.semana
        order by s.semana`,
    );

    res.json({ ok: true, meta: META_PILOTOS_ACTIVOS, ...resumen, semanas });
  }),
);

adminRouter.get(
  "/recargas",
  requirePermiso("dinero"),
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
  requirePermiso("dinero"),
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("aprobar_recarga", { p_transaccion_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.post(
  "/recargas/:id/rechazar",
  requirePermiso("dinero"),
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
  requirePermiso("dinero"),
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
  requirePermiso("dinero"),
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("confirmar_pago_admin", { p_pago_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

adminRouter.post(
  "/pagos/:id/rechazar",
  requirePermiso("dinero"),
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
  requirePermiso("documentos"),
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
  requirePermiso("documentos"),
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
  requirePermiso("documentos"),
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

    // Un reenvío de la misma decisión no vuelve a avisar al piloto.
    if (!resultado?.ya_verificado) {
      await notificar(usuarioId, avisoVerificacion({ aprobado: body.aprobado, motivo: body.motivo }));
    }

    res.json(resultado);
  }),
);

adminRouter.get(
  "/solicitudes",
  requirePermiso("soporte"),
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
  requirePermiso("soporte"),
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
  requirePermiso("negocios"),
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
  requirePermiso("negocios"),
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
