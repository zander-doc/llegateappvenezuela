import { Router } from "express";
import { config } from "../config.js";
import { fila } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { solicitudSchema } from "../schemas.js";
import { hitRateLimit } from "../security/rateLimit.js";

export const solicitudesRouter = Router();

function ipDe(req) {
  return req.ip || req.socket?.remoteAddress || "desconocida";
}

// La bandeja la lee gente, no un sistema: un formulario público sin límite se
// llena de spam. Se corta por conexión y por contacto repetido.
function limitarSolicitud(req, res, contacto) {
  const { limits } = config.solicitudes;
  const windowMs = limits.ventanaMinutos * 60_000;

  const controles = [
    {
      clave: `solicitudes:ip:${ipDe(req)}`,
      limit: limits.porIp,
      mensaje: `Envías muchas solicitudes seguidas. Espera ${limits.ventanaMinutos} minutos.`,
    },
    {
      clave: `solicitudes:contacto:${contacto.toLowerCase()}`,
      limit: limits.porContacto,
      mensaje: "Ya tenemos varias solicitudes tuyas. Te responderemos por el contacto que diste.",
    },
  ];

  for (const control of controles) {
    const limite = hitRateLimit(control.clave, { limit: control.limit, windowMs });
    if (!limite.ok) {
      res.set("Retry-After", String(limite.retryAfter));
      throw new HttpError(429, "demasiados_intentos", control.mensaje, { retry_after: limite.retryAfter });
    }
  }
}

solicitudesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(solicitudSchema, req.body);
    limitarSolicitud(req, res, body.contacto);

    const creada = await fila(
      `insert into public.solicitudes (tipo, nombre, contacto, ciudad, mensaje, datos, origen)
       values ($1, $2, $3, $4, $5, coalesce($6::jsonb, '{}'::jsonb), $7)
       returning id, estado, created_at`,
      [
        body.tipo,
        body.nombre ?? null,
        body.contacto,
        body.ciudad ?? null,
        body.mensaje ?? null,
        body.datos ? JSON.stringify(body.datos) : null,
        body.origen ?? null,
      ],
    );

    if (!creada) {
      throw new HttpError(500, "solicitud_error", "No pudimos registrar tu solicitud. Intenta de nuevo.");
    }

    res.status(201).json({ ok: true, id: creada.id, estado: creada.estado });
  }),
);
