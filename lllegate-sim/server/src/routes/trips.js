import { Router } from "express";
import { fila, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
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
    const viaje = await fila(
      `insert into public.viajes (cliente_id, origen, destino, precio_usd, distancia_km, metodo_pago)
       values ($1, $2, $3, $4, $5, $6)
       returning ${TRIP_COLUMNS}`,
      [
        req.user.id,
        body.origen,
        body.destino,
        body.precio_usd,
        body.distancia_km ?? null,
        body.metodo_pago,
      ],
    );

    res.status(201).json({ ok: true, viaje });
  }),
);

tripsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const viaje = await fila(`select ${TRIP_COLUMNS} from public.viajes where id = $1`, [id]);

    if (!viaje) throw new HttpError(404, "viaje_no_encontrado", "Viaje no encontrado");

    res.json({ ok: true, viaje });
  }),
);

tripsRouter.post(
  "/:id/aceptar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("aceptar_viaje", { p_viaje_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

tripsRouter.post(
  "/:id/iniciar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("iniciar_viaje", { p_viaje_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

tripsRouter.post(
  "/:id/finalizar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("procesar_comision_viaje", { p_viaje_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

tripsRouter.post(
  "/:id/cancelar",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(cancelTripSchema, req.body);
    const resultado = await rpc(
      "cancelar_viaje",
      { p_viaje_id: id, p_motivo: body.motivo ?? null },
      { usuarioId: req.user.id },
    );

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);

tripsRouter.post(
  "/:id/pagar-saldo",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = await rpc("pagar_viaje_con_saldo", { p_viaje_id: id }, { usuarioId: req.user.id });

    res.status(resultado.ok ? 200 : 409).json(resultado);
  }),
);
