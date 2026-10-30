import { Router } from "express";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { cancelTripSchema, createTripSchema, uuidSchema } from "../schemas.js";

export const tripsRouter = Router();

const TRIP_COLUMNS =
  "id, cliente_id, conductor_id, estado, origen, destino, distancia_km, precio_usd, tasa_bcv, metodo_pago, comision_usd, comision_porcentaje, created_at, aceptado_en, iniciado_en, finalizado_en";

tripsRouter.use(requireUser);

tripsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(createTripSchema, req.body);
    const viaje = unwrap(
      await req.supabase
        .from("viajes")
        .insert({ cliente_id: req.user.id, ...body })
        .select(TRIP_COLUMNS)
        .single()
    );

    res.status(201).json({ ok: true, viaje });
  })
);

tripsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const viaje = unwrap(await req.supabase.from("viajes").select(TRIP_COLUMNS).eq("id", id).maybeSingle());

    if (!viaje) throw new HttpError(404, "viaje_no_encontrado", "Viaje no encontrado");

    res.json({ ok: true, viaje });
  })
);

tripsRouter.post(
  "/:id/aceptar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("aceptar_viaje", { p_viaje_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

tripsRouter.post(
  "/:id/iniciar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("iniciar_viaje", { p_viaje_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

tripsRouter.post(
  "/:id/finalizar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("procesar_comision_viaje", { p_viaje_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

tripsRouter.post(
  "/:id/cancelar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(cancelTripSchema, req.body);
    const resultado = unwrap(
      await req.supabase.rpc("cancelar_viaje", {
        p_viaje_id: id,
        p_motivo: body.motivo ?? null,
      })
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);

tripsRouter.post(
  "/:id/pagar-saldo",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("pagar_viaje_con_saldo", { p_viaje_id: id }));

    res.status(resultado.ok ? 200 : 409).json(resultado);
  })
);
