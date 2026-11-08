import { Router } from "express";
import { fila, filas } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { createScheduledRideSchema, uuidSchema } from "../schemas.js";

export const scheduledRidesRouter = Router();

const COLUMNAS = [
  "id",
  "cliente_id",
  "estado",
  "origen",
  "destino",
  "origen_lat",
  "origen_lng",
  "destino_lat",
  "destino_lng",
  "servicio",
  "programado_para",
  "distancia_km",
  "precio_usd",
  "metodo_pago",
  "cancelado_en",
  "created_at",
  "updated_at",
].join(", ");

scheduledRidesRouter.use(requireUser);

scheduledRidesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const viajesProgramados = await filas(
      `select ${COLUMNAS} from public.viajes_programados
        where cliente_id = $1
        order by programado_para asc
        limit 100`,
      [req.user.id],
    );

    res.json({ ok: true, viajes_programados: viajesProgramados });
  }),
);

scheduledRidesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(createScheduledRideSchema, req.body);
    const viajeProgramado = await fila(
      `insert into public.viajes_programados (
         cliente_id, origen, destino, origen_lat, origen_lng, destino_lat, destino_lng,
         servicio, programado_para, distancia_km, precio_usd, metodo_pago
       ) select $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
         where $9 > now()
       returning ${COLUMNAS}`,
      [
        req.user.id,
        body.origen,
        body.destino,
        body.origen_lat ?? null,
        body.origen_lng ?? null,
        body.destino_lat ?? null,
        body.destino_lng ?? null,
        body.servicio,
        body.programado_para,
        body.distancia_km ?? null,
        body.precio_usd,
        body.metodo_pago,
      ],
    );

    if (!viajeProgramado) {
      throw new HttpError(422, "datos_invalidos", "La fecha del viaje debe ser futura");
    }

    res.status(201).json({ ok: true, viaje_programado: viajeProgramado });
  }),
);

scheduledRidesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const viajeProgramado = await fila(
      `select ${COLUMNAS} from public.viajes_programados
        where id = $1 and cliente_id = $2`,
      [id, req.user.id],
    );

    if (!viajeProgramado) {
      throw new HttpError(404, "viaje_programado_no_encontrado", "Viaje programado no encontrado");
    }

    res.json({ ok: true, viaje_programado: viajeProgramado });
  }),
);

scheduledRidesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const viajeProgramado = await fila(
      `update public.viajes_programados
          set estado = 'cancelado', cancelado_en = now()
        where id = $1 and cliente_id = $2 and estado = 'programado'
        returning ${COLUMNAS}`,
      [id, req.user.id],
    );

    if (viajeProgramado) {
      res.json({ ok: true, viaje_programado: viajeProgramado });
      return;
    }

    const existe = await fila(
      "select 1 from public.viajes_programados where id = $1 and cliente_id = $2",
      [id, req.user.id],
    );
    if (!existe) {
      throw new HttpError(404, "viaje_programado_no_encontrado", "Viaje programado no encontrado");
    }
    throw new HttpError(409, "viaje_programado_no_cancelable", "El viaje programado ya fue cancelado");
  }),
);
