import { Router } from "express";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { driverDetailsSchema } from "../schemas.js";

export const driversRouter = Router();

const DRIVER_COLUMNS =
  "usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio, cedula_url, licencia_url, certificado_medico_url, verificacion, estado, motivo_rechazo, created_at";

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

    res.json({ ok: true, conductor: detalle });
  }),
);
