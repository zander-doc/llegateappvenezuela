import { Router } from "express";
import { fila, filas, rpc } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { cancelTripSchema, createTripSchema, uuidSchema } from "../schemas.js";

export const tripsRouter = Router();

const VIAJE_COLUMNAS = [
  "id",
  "cliente_id",
  "conductor_id",
  "estado",
  "origen",
  "destino",
  "distancia_km",
  "precio_usd",
  "tasa_bcv",
  "metodo_pago",
  "comision_usd",
  "comision_porcentaje",
  "created_at",
  "aceptado_en",
  "iniciado_en",
  "finalizado_en",
];

const TRIP_COLUMNS = VIAJE_COLUMNAS.join(", ");

/**
 * Quién maneja el viaje, para que el pasajero sepa a quién llamar. Es null mientras
 * ningún piloto lo acepte; la cédula y los documentos del conductor no salen de la base.
 */
const CONDUCTOR_JSON = `
  case when viajes.conductor_id is null then null else jsonb_build_object(
    'nombre', conductor_usuario.nombre,
    'telefono', conductor_usuario.telefono,
    'placa', conductor_detalle.placa,
    'tipo_vehiculo', conductor_detalle.tipo_vehiculo,
    'marca', conductor_detalle.marca,
    'modelo', conductor_detalle.modelo,
    'verificacion', conductor_detalle.verificacion
  ) end as conductor`;

// Cada columna se califica porque el viaje se lee junto con las tablas del piloto.
const SELECT_VIAJE = `
  select ${VIAJE_COLUMNAS.map((columna) => `viajes.${columna}`).join(", ")}, ${CONDUCTOR_JSON}
    from public.viajes
    left join public.usuarios as conductor_usuario on conductor_usuario.id = viajes.conductor_id
    left join public.conductores_detalles as conductor_detalle on conductor_detalle.usuario_id = viajes.conductor_id`;

tripsRouter.use(requireUser);

tripsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    // Los 50 viajes más recientes del pasajero, del más nuevo al más viejo: la app
    // saca de ahí su historial y el viaje que tiene abierto.
    const viajes = await filas(
      `${SELECT_VIAJE} where viajes.cliente_id = $1 order by viajes.created_at desc limit 50`,
      [req.user.id],
    );

    res.json({ ok: true, viajes });
  }),
);

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

    // El viaje nace sin piloto: se devuelve la misma forma que en el listado y el detalle.
    res.status(201).json({ ok: true, viaje: { ...viaje, conductor: null } });
  }),
);

tripsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    // Solo los que participan en el viaje lo ven: el id de un pana no abre su viaje.
    const viaje = await fila(
      `${SELECT_VIAJE} where viajes.id = $1 and (viajes.cliente_id = $2 or viajes.conductor_id = $2)`,
      [id, req.user.id],
    );

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
