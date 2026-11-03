import { Router } from "express";
import {
  crearOActualizarCuenta,
  crearSesion,
  guardarCodigo,
  revocarSesion,
  rotarSesion,
  validarCodigo,
} from "../auth/cuentas.js";
import { generarCodigo, hashCodigo } from "../auth/tokens.js";
import { config } from "../config.js";
import { fila } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { otpRequestSchema, otpVerifySchema, refreshTokenSchema } from "../schemas.js";
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
].join(", ");

authRouter.post(
  "/otp",
  asyncHandler(async (req, res) => {
    const body = parse(otpRequestSchema, req.body);
    limitarEnvioOtp(req, res, body.telefono);

    const canal = canalOtp();
    if (!canal) {
      throw new HttpError(
        503,
        "otp_no_configurado",
        "Todavía no podemos enviarte el código. Escríbenos por WhatsApp para terminar tu registro.",
      );
    }

    const cuenta = await crearOActualizarCuenta(body);
    if (!cuenta) {
      throw new HttpError(500, "cuenta_error", "No pudimos preparar tu cuenta. Intenta de nuevo.");
    }

    const codigo = generarCodigo();
    await guardarCodigo(body.telefono, hashCodigo(body.telefono, codigo));

    try {
      await enviarCodigoOtp({ telefono: body.telefono, codigo });
    } catch (error) {
      console.error("[otp] no se pudo enviar el código:", error.message);
      throw new HttpError(502, "otp_envio_error", "No pudimos enviarte el código. Intenta de nuevo.");
    }

    res.status(202).json({
      ok: true,
      mensaje: {
        whatsapp: "Código enviado por WhatsApp",
        sms: "Código enviado por SMS",
        log: "Código generado; revisa el registro del servidor",
      }[canal],
    });
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
    res.json({ ok: true, ...tokens });
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
    const perfil = await fila(
      `select ${PERFIL_COLUMNS} from public.perfil_usuario where id = $1`,
      [req.user.id],
    );

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

    res.json({
      ok: true,
      usuario,
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
    });
  }),
);
