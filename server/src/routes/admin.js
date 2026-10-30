import { Router } from "express";
import { asyncHandler, parse, unwrap } from "../http.js";
import { requireAdmin, requireUser } from "../middleware.js";
import { rejectSchema, uuidSchema, verifyDriverSchema } from "../schemas.js";

export const adminRouter = Router();

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
  "/conductores",
  asyncHandler(async (req, res) => {
    const verificacion = req.query.verificacion ?? "pendiente";
    const conductores = unwrap(
      await req.supabase
        .from("conductores_detalles")
        .select(
          "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, created_at"
        )
        .eq("verificacion", verificacion)
        .order("created_at", { ascending: true })
        .limit(100)
    );

    res.json({ ok: true, conductores });
  })
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
      })
    );

    res.json(resultado);
  })
);
