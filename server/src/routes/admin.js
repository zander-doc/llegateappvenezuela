import { Router } from "express";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireAdmin, requireUser } from "../middleware.js";
import { estadoVerificacionSchema, rejectSchema, uuidSchema, verifyDriverSchema } from "../schemas.js";

export const adminRouter = Router();

const BUCKET = "documentos-conductores";

const DRIVER_ADMIN_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, verificado_por, verificado_en, created_at";

adminRouter.use(requireUser, requireAdmin);

adminRouter.get(
  "/recargas",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ?? "pendiente";
    const recargas = unwrap(
      await req.supabase
        .from("transacciones_billetera")
        .select(
          "id, usuario_id, metodo, monto_usd, banco, referencia, comprobante_url, billetera, estado, motivo_rechazo, created_at"
        )
        .eq("tipo", "recarga")
        .eq("estado", estado)
        .order("created_at", { ascending: true })
        .limit(100)
    );

    res.json({ ok: true, recargas });
  })
);

adminRouter.post(
  "/recargas/:id/aprobar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("aprobar_recarga", { p_transaccion_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

adminRouter.post(
  "/recargas/:id/rechazar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(rejectSchema, req.body);
    const resultado = unwrap(
      await req.supabase.rpc("rechazar_recarga", {
        p_transaccion_id: id,
        p_motivo: body.motivo,
      })
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

adminRouter.get(
  "/pagos",
  asyncHandler(async (req, res) => {
    const estado = req.query.estado ?? "en_revision";
    const pagos = unwrap(
      await req.supabase
        .from("pagos")
        .select(
          "id, usuario_id, metodo, proveedor, estado, monto_usd, monto_bs, tasa_bs, codigo, referencia_reportada, comprobante_url, checkout_url, expira_en, confirmado_en, motivo_rechazo, created_at"
        )
        .eq("estado", estado)
        .order("created_at", { ascending: true })
        .limit(100)
    );

    res.json({ ok: true, pagos });
  })
);

adminRouter.post(
  "/pagos/:id/confirmar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("confirmar_pago_admin", { p_pago_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

adminRouter.post(
  "/pagos/:id/rechazar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(rejectSchema, req.body);
    const resultado = unwrap(
      await req.supabase.rpc("rechazar_pago", {
        p_pago_id: id,
        p_motivo: body.motivo,
      })
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

adminRouter.get(
  "/conductores",
  asyncHandler(async (req, res) => {
    const verificacion = parse(estadoVerificacionSchema, req.query.verificacion ?? "pendiente", "verificacion");
    const conductores = unwrap(
      await req.supabase
        .from("conductores_detalles")
        .select(
          "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, verificacion, estado, motivo_rechazo, riesgo_puntaje, riesgo_motivos, enviado_en, intentos_verificacion, created_at",
        )
        .eq("verificacion", verificacion)
        .order("riesgo_puntaje", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(100),
    );

    const ids = conductores.map((conductor) => conductor.usuario_id);
    const [perfiles, documentos] = ids.length
      ? await Promise.all([
          req.supabase
            .from("usuarios")
            .select("id, nombre, telefono, whatsapp, email, telefono_verificado")
            .in("id", ids),
          req.supabase
            .from("conductores_documentos")
            .select("usuario_id, tipo, mime, bytes, ocr_estado, ocr_confianza")
            .in("usuario_id", ids),
        ])
      : [{ data: [] }, { data: [] }];

    const porUsuario = new Map((perfiles.data ?? []).map((perfil) => [perfil.id, perfil]));
    const docsPorUsuario = new Map();
    for (const documento of documentos.data ?? []) {
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

    const detalle = unwrap(
      await req.supabase
        .from("conductores_detalles")
        .select(DRIVER_ADMIN_COLUMNS)
        .eq("usuario_id", usuarioId)
        .maybeSingle(),
    );
    if (!detalle) {
      throw new HttpError(404, "conductor_no_encontrado", "Ese conductor no existe");
    }

    const [perfil, documentos, eventos] = await Promise.all([
      req.supabase
        .from("usuarios")
        .select("id, nombre, telefono, whatsapp, email, telefono_verificado, created_at")
        .eq("id", usuarioId)
        .maybeSingle(),
      req.supabase
        .from("conductores_documentos")
        .select(
          "tipo, storage_path, mime, bytes, hash_sha256, ocr_estado, ocr_texto, ocr_confianza, ocr_datos, created_at, updated_at",
        )
        .eq("usuario_id", usuarioId)
        .order("tipo", { ascending: true }),
      req.supabase
        .from("eventos_seguridad")
        .select("id, tipo, severidad, detalle, created_at")
        .eq("usuario_id", usuarioId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (perfil.error) throw perfil.error;
    if (documentos.error) throw documentos.error;
    if (eventos.error) throw eventos.error;

    const conUrl = await Promise.all(
      (documentos.data ?? []).map(async (documento) => {
        const { data, error } = await req.supabase.storage
          .from(BUCKET)
          .createSignedUrl(documento.storage_path, 900);
        return { ...documento, url: error ? null : (data?.signedUrl ?? null) };
      }),
    );

    res.json({
      ok: true,
      conductor: detalle,
      usuario: perfil.data ?? null,
      documentos: conUrl,
      eventos: eventos.data ?? [],
    });
  }),
);

adminRouter.post(
  "/conductores/:usuarioId/verificar",
  asyncHandler(async (req, res) => {
    const usuarioId = parse(uuidSchema, req.params.usuarioId, "usuarioId");
    const body = parse(verifyDriverSchema, req.body);
    const resultado = unwrap(
      await req.supabase.rpc("verificar_conductor", {
        p_usuario_id: usuarioId,
        p_aprobado: body.aprobado,
        p_motivo: body.motivo ?? null,
      }),
    );

    res.json(resultado);
  }),
);
