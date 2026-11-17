import { Router } from "express";
import {
  crearSesion,
  guardarCodigo,
  ingresarConGoogle,
  revocarSesion,
  rotarSesion,
  validarCodigo,
  vincularGoogle,
} from "../auth/cuentas.js";
import { etiquetaRol } from "../auth/etiquetaRol.js";
import { GoogleTokenError, googleDisponible, verificarTokenGoogle } from "../auth/google.js";
import { generarCodigo, hashCodigo } from "../auth/tokens.js";
import { config } from "../config.js";
import { fila, filas } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import {
  googleCredentialSchema,
  otpRequestSchema,
  otpVerifySchema,
  perfilPatchSchema,
  refreshTokenSchema,
} from "../schemas.js";
import { canalOtp, enviarCodigoOtp } from "../security/otp-delivery.js";
import { hitRateLimit, resetRateLimit } from "../security/rateLimit.js";

export const authRouter = Router();

function ipDe(req) {
  return req.ip || req.socket?.remoteAddress || "desconocida";
}

function bloquearPorLimite(res, retryAfter, mensaje) {
  res.set("Retry-After", String(retryAfter));
  throw new HttpError(429, "demasiados_intentos", mensaje, { retry_after: retryAfter });
}

function limitarEnvioOtp(req, res, telefono) {
  const { limits } = config.otp;
  const windowMs = limits.ventanaMinutos * 60_000;

  const porTelefono = hitRateLimit(`otp:telefono:${telefono}`, {
    limit: limits.porTelefono,
    windowMs,
  });
  if (!porTelefono.ok) {
    bloquearPorLimite(
      res,
      porTelefono.retryAfter,
      `Ese número pidió demasiados códigos. Espera ${porTelefono.retryAfter} segundos.`,
    );
  }

  const porIp = hitRateLimit(`otp:ip:${ipDe(req)}`, {
    limit: limits.porIp,
    windowMs,
  });
  if (!porIp.ok) {
    bloquearPorLimite(
      res,
      porIp.retryAfter,
      `Se pidieron demasiados códigos desde esta conexión. Espera ${porIp.retryAfter} segundos.`,
    );
  }
}

function limitarVerificacion(req, res, telefono) {
  const { limits } = config.otp;
  const limite = hitRateLimit(`otp:verificar:${telefono}`, {
    limit: limits.porVerificacion,
    windowMs: limits.ventanaMinutos * 60_000,
  });
  if (!limite.ok) {
    bloquearPorLimite(
      res,
      limite.retryAfter,
      `Demasiados intentos con ese código. Espera ${limite.retryAfter} segundos.`,
    );
  }
}

const PERFIL_COLUMNS = [
  "id",
  "rol",
  "nombre",
  "telefono",
  "telefono_verificado",
  "email",
  "whatsapp",
  "estado",
  "ciudad",
  "saldo_billetera",
  "es_conductor",
  "tipo_vehiculo",
  "placa",
  "verificacion",
  "estado_conductor",
  "motivo_rechazo",
  "verificado_en",
  "puede_pedir_viajes",
  "puede_conducir",
  "foto_url",
  "acepta_promociones",
  "origen_registro",
  "tiene_google",
  "preferencias",
].join(", ");

// GET /me y PATCH /auth/perfil responden con el mismo envoltorio, así que el
// cliente no tiene dos caminos para leer la cuenta.
async function leerPerfil(usuarioId) {
  const perfil = await fila(`select ${PERFIL_COLUMNS} from public.perfil_usuario where id = $1`, [usuarioId]);

  if (!perfil) throw new HttpError(404, "perfil_no_encontrado", "El perfil aún no está creado");

  const {
    es_conductor,
    tipo_vehiculo,
    placa,
    verificacion,
    estado_conductor,
    motivo_rechazo,
    verificado_en,
    puede_pedir_viajes,
    puede_conducir,
    ...usuario
  } = perfil;

  return {
    ok: true,
    usuario: {
      ...usuario,
      etiqueta_rol: etiquetaRol({ rol: usuario.rol, es_conductor, tipo_vehiculo, puede_conducir }),
    },
    conductor: es_conductor
      ? {
          tipo_vehiculo,
          placa,
          verificacion,
          estado: estado_conductor,
          motivo_rechazo,
          verificado_en,
        }
      : null,
    capacidades: { puede_pedir_viajes, puede_conducir },
  };
}

authRouter.post(
  "/otp",
  asyncHandler(async (req, res) => {
    const body = parse(otpRequestSchema, req.body);
    limitarEnvioOtp(req, res, body.telefono);

    if (!canalOtp()) {
      throw new HttpError(
        503,
        "otp_no_configurado",
        "Todavía no podemos enviarte el código. Escríbenos por WhatsApp para terminar tu registro.",
      );
    }

    const codigo = generarCodigo();
    const { telefono, ...datosRegistro } = body;
    await guardarCodigo(telefono, hashCodigo(telefono, codigo), datosRegistro);

    let canal;
    try {
      canal = await enviarCodigoOtp({ telefono: body.telefono, codigo });
    } catch (error) {
      console.error("[otp] no se pudo enviar el código:", error.message);
      throw new HttpError(502, "otp_envio_error", "No pudimos enviarte el código. Intenta de nuevo.");
    }

    const mensajes = {
      whatsapp: "Código enviado por WhatsApp",
      sms: "Código enviado por SMS",
      log: "No pudimos enviarte el código. Intenta de nuevo en unos minutos.",
    };

    // El cliente pinta este aviso según el canal: "log" significa que la entrega falló,
    // así que nunca debe mostrarse como un éxito.
    res.status(202).json({ ok: true, canal, mensaje: mensajes[canal] });
  }),
);

authRouter.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const body = parse(otpVerifySchema, req.body);
    limitarVerificacion(req, res, body.telefono);

    const resultado = await validarCodigo(body.telefono, body.token);
    if (!resultado.ok) {
      const mensaje =
        resultado.motivo === "codigo_expirado"
          ? "El código expiró; pide uno nuevo"
          : "Código incorrecto o expirado";
      throw new HttpError(401, "codigo_invalido", mensaje);
    }

    resetRateLimit(`otp:verificar:${body.telefono}`);

    const tokens = await crearSesion(resultado.usuario, req.get("user-agent"));
    void registrarEvento(resultado.usuario.id, "ingreso", { via: "telefono" });
    res.json({ ok: true, ...tokens });
  }),
);

// ---- Ingresar con Google ---------------------------------------------------

const MOTIVOS_GOOGLE = {
  google_no_configurado: [503, "google_no_disponible", "Ingresar con Google aún no está disponible"],
  claves_no_disponibles: [503, "google_no_disponible", "No pudimos validar con Google. Intenta de nuevo"],
  token_vencido: [401, "google_token_invalido", "La sesión de Google venció. Intenta de nuevo"],
  correo_no_verificado: [401, "google_correo_no_verificado", "Tu correo de Google no está verificado"],
};

async function validarCredencialGoogle(req, res) {
  if (!googleDisponible()) {
    throw new HttpError(503, "google_no_disponible", "Ingresar con Google aún no está disponible");
  }

  const limite = hitRateLimit(`google:ip:${ipDe(req)}`, { limit: 20, windowMs: 10 * 60_000 });
  if (!limite.ok) {
    bloquearPorLimite(res, limite.retryAfter, `Demasiados intentos. Espera ${limite.retryAfter} segundos.`);
  }

  const { credential } = parse(googleCredentialSchema, req.body);
  try {
    return await verificarTokenGoogle(credential);
  } catch (error) {
    if (!(error instanceof GoogleTokenError)) throw error;
    const [status, code, mensaje] =
      MOTIVOS_GOOGLE[error.motivo] ?? [401, "google_token_invalido", "No pudimos validar tu cuenta de Google"];
    throw new HttpError(status, code, mensaje);
  }
}

// La web necesita el ID de cliente para dibujar el botón. No es un secreto.
authRouter.get("/google/config", (_req, res) => {
  const disponible = googleDisponible();
  res.json({ ok: true, disponible, client_id: disponible ? config.google.clientIds[0] : null });
});

authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const google = await validarCredencialGoogle(req, res);

    const resultado = await ingresarConGoogle(google);
    if (!resultado.ok) {
      throw new HttpError(
        409,
        "correo_ya_registrado",
        "Ese correo ya tiene una cuenta. Ingresa con tu teléfono y vincula Google desde tu perfil.",
      );
    }

    const tokens = await crearSesion(resultado.usuario, req.get("user-agent"));
    void registrarEvento(resultado.usuario.id, resultado.nuevo ? "registro" : "ingreso", { via: "google" });
    res.json({ ok: true, nuevo: resultado.nuevo, ...tokens });
  }),
);

authRouter.post(
  "/google/vincular",
  requireUser,
  asyncHandler(async (req, res) => {
    const google = await validarCredencialGoogle(req, res);

    const resultado = await vincularGoogle(req.user.id, google);
    if (!resultado.ok) {
      const mensajes = {
        google_ya_vinculado: "Esa cuenta de Google ya está vinculada a otro usuario",
        cuenta_con_google: "Tu cuenta ya tiene una cuenta de Google vinculada",
      };
      throw new HttpError(409, resultado.motivo, mensajes[resultado.motivo] ?? "No pudimos vincular Google");
    }

    void registrarEvento(req.user.id, "google_vinculado", {});
    res.json(await leerPerfil(req.user.id));
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = parse(refreshTokenSchema, req.body);
    const tokens = await rotarSesion(body.refresh_token, req.get("user-agent"));

    if (!tokens) {
      throw new HttpError(401, "sesion_invalida", "La sesión expiró; vuelve a ingresar con tu código SMS");
    }

    res.json({ ok: true, ...tokens });
  }),
);

authRouter.post(
  "/logout",
  requireUser,
  asyncHandler(async (req, res) => {
    // Se revoca solo esta sesión: la web y la app mantienen sesiones
    // independientes sobre la misma cuenta.
    await revocarSesion(req.sesionId, req.user.id);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    res.json(await leerPerfil(req.user.id));
  }),
);

authRouter.patch(
  "/perfil",
  requireUser,
  asyncHandler(async (req, res) => {
    const cambios = parse(perfilPatchSchema, req.body);

    await filas(
      `update public.usuarios
          set nombre = coalesce($2, nombre),
              estado = coalesce($3, estado),
              ciudad = coalesce($4, ciudad),
              whatsapp = coalesce($5, whatsapp),
              acepta_promociones = coalesce($6, acepta_promociones),
              preferencias = preferencias || coalesce($7::jsonb, '{}'::jsonb),
              updated_at = now()
        where id = $1`,
      [
        req.user.id,
        cambios.nombre ?? null,
        cambios.estado ?? null,
        cambios.ciudad ?? null,
        cambios.whatsapp ?? null,
        cambios.acepta_promociones ?? null,
        cambios.preferencias ? JSON.stringify(cambios.preferencias) : null,
      ],
    );

    res.json(await leerPerfil(req.user.id));
  }),
);
