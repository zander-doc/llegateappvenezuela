import { Router } from "express";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { otpRequestSchema, otpVerifySchema, refreshTokenSchema } from "../schemas.js";
import { supabaseAnon } from "../supabase.js";

export const authRouter = Router();

const PERFIL_COLUMNS = [
  "id",
  "rol",
  "nombre",
  "telefono",
  "telefono_verificado",
  "email",
  "whatsapp",
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

    const { error } = await supabaseAnon.auth.signInWithOtp({
      phone: body.telefono,
      options: {
        shouldCreateUser: true,
        data: {
          rol: body.rol,
          ...(body.nombre ? { nombre: body.nombre } : {}),
        },
      },
    });

    if (error) throw new HttpError(400, "otp_error", error.message);

    res.status(202).json({ ok: true, mensaje: "Código enviado por SMS" });
  }),
);

authRouter.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const body = parse(otpVerifySchema, req.body);

    const { data, error } = await supabaseAnon.auth.verifyOtp({
      phone: body.telefono,
      token: body.token,
      type: "sms",
    });

    if (error || !data.session) {
      throw new HttpError(401, "codigo_invalido", error?.message ?? "Código incorrecto o expirado");
    }

    res.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      usuario: { id: data.user.id, telefono: data.user.phone },
    });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = parse(refreshTokenSchema, req.body);

    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: body.refresh_token,
    });

    if (error || !data.session) {
      throw new HttpError(401, "sesion_invalida", "La sesión expiró; vuelve a ingresar con tu código SMS");
    }

    res.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      usuario: { id: data.user.id, telefono: data.user.phone },
    });
  }),
);

authRouter.post(
  "/logout",
  requireUser,
  asyncHandler(async (req, res) => {
    // scope "local" cierra solo esta sesión: la web y la app mantienen sesiones
    // independientes sobre la misma cuenta.
    const { error } = await req.supabase.auth.admin.signOut(req.accessToken, "local");
    if (error && ![401, 403, 404].includes(error.status)) {
      throw new HttpError(502, "logout_error", "No se pudo cerrar la sesión en el proveedor");
    }

    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  requireUser,
  asyncHandler(async (req, res) => {
    const perfil = unwrap(
      await req.supabase
        .from("perfil_usuario")
        .select(PERFIL_COLUMNS)
        .eq("id", req.user.id)
        .maybeSingle(),
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
