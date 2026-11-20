import { Router } from "express";
import { asyncHandler, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { listarNotificaciones, marcarLeidas } from "../notificaciones.js";
import { leerNotificacionSchema } from "../schemas.js";

export const notificacionesRouter = Router();

notificacionesRouter.use(requireUser);

notificacionesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { items, sinLeer } = await listarNotificaciones(req.user.id);
    res.json({ ok: true, sin_leer: sinLeer, notificaciones: items });
  }),
);

// Sin cuerpo marca todas como leídas; con { id } solo esa.
notificacionesRouter.post(
  "/leer",
  asyncHandler(async (req, res) => {
    const body = parse(leerNotificacionSchema, req.body ?? {});
    await marcarLeidas(req.user.id, body.id ?? null);
    res.json({ ok: true });
  }),
);
