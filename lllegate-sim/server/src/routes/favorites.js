import { Router } from "express";
import { fila, filas } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { favoriteAddressSchema, favoriteDriverSchema, uuidSchema } from "../schemas.js";

export const favoritesRouter = Router();

favoritesRouter.use(requireUser);

favoritesRouter.get(
  "/direcciones",
  asyncHandler(async (req, res) => {
    const direcciones = await filas(
      `select id, etiqueta, direccion_texto, lat, lng, created_at, updated_at
         from public.direcciones_favoritas
        where usuario_id = $1
        order by lower(etiqueta), created_at`,
      [req.user.id],
    );
    res.json({ ok: true, direcciones });
  }),
);

favoritesRouter.post(
  "/direcciones",
  asyncHandler(async (req, res) => {
    const body = parse(favoriteAddressSchema, req.body);
    const direccion = await fila(
      `insert into public.direcciones_favoritas (usuario_id, etiqueta, direccion_texto, lat, lng)
       values ($1, $2, $3, $4, $5)
       on conflict (usuario_id, (lower(etiqueta))) do update
         set etiqueta = excluded.etiqueta,
             direccion_texto = excluded.direccion_texto,
             lat = excluded.lat,
             lng = excluded.lng
       returning id, etiqueta, direccion_texto, lat, lng, created_at, updated_at`,
      [req.user.id, body.etiqueta, body.direccion_texto, body.lat, body.lng],
    );
    res.status(201).json({ ok: true, direccion });
  }),
);

favoritesRouter.delete(
  "/direcciones/:id",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const borrada = await fila(
      `delete from public.direcciones_favoritas
        where id = $1 and usuario_id = $2
        returning id`,
      [id, req.user.id],
    );
    if (!borrada) {
      throw new HttpError(404, "direccion_favorita_no_encontrada", "Dirección favorita no encontrada");
    }
    res.json({ ok: true, id: borrada.id });
  }),
);

favoritesRouter.get(
  "/conductores",
  asyncHandler(async (req, res) => {
    const conductores = await filas(
      `select u.id as conductor_id, u.nombre, d.tipo_vehiculo, d.placa, d.marca, d.modelo,
              d.verificacion, f.created_at
         from public.conductores_favoritos f
         join public.usuarios u on u.id = f.conductor_id
         join public.conductores_detalles d on d.usuario_id = u.id
        where f.usuario_id = $1
        order by f.created_at desc`,
      [req.user.id],
    );
    res.json({ ok: true, conductores });
  }),
);

favoritesRouter.post(
  "/conductores",
  asyncHandler(async (req, res) => {
    const body = parse(favoriteDriverSchema, req.body);
    const favorito = await fila(
      `insert into public.conductores_favoritos (usuario_id, conductor_id)
       select $1, u.id
         from public.usuarios u
         join public.conductores_detalles d on d.usuario_id = u.id
        where u.id = $2 and u.rol = 'conductor'
       on conflict (usuario_id, conductor_id) do update set conductor_id = excluded.conductor_id
       returning conductor_id, created_at`,
      [req.user.id, body.conductor_id],
    );
    if (!favorito) {
      throw new HttpError(404, "conductor_no_encontrado", "Ese piloto no está registrado");
    }
    res.status(201).json({ ok: true, favorito });
  }),
);

favoritesRouter.delete(
  "/conductores/:conductorId",
  asyncHandler(async (req, res) => {
    const conductorId = parse(uuidSchema, req.params.conductorId, "conductorId");
    const borrado = await fila(
      `delete from public.conductores_favoritos
        where usuario_id = $1 and conductor_id = $2
        returning conductor_id`,
      [req.user.id, conductorId],
    );
    if (!borrado) {
      throw new HttpError(404, "conductor_favorito_no_encontrado", "Piloto favorito no encontrado");
    }
    res.json({ ok: true, conductor_id: borrado.conductor_id });
  }),
);
