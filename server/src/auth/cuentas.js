import { config } from "../config.js";
import { fila, filas } from "../db.js";
import {
  codigoCoincide,
  firmarAcceso,
  hashRefresh,
  nuevoRefresh,
  venceRefresh,
} from "./tokens.js";

export async function crearOActualizarCuenta({ telefono, rol, nombre, estado, ciudad }) {
  const metadata = { rol: rol ?? "cliente", ...(nombre ? { nombre } : {}) };

  const cuenta = await fila(
    `insert into auth.users (phone, raw_user_meta_data)
     values ($1, $2::jsonb)
     on conflict (phone) do update
        set raw_user_meta_data = auth.users.raw_user_meta_data || excluded.raw_user_meta_data
     returning id, phone, phone_confirmed_at`,
    [telefono, JSON.stringify(metadata)],
  );

  // El trigger solo crea el perfil al insertar; en un registro repetido la
  // ciudad se actualiza aquí.
  if (cuenta && (estado || ciudad)) {
    await filas(
      `update public.usuarios
          set estado = coalesce($2, estado),
              ciudad = coalesce($3, ciudad)
        where id = $1`,
      [cuenta.id, estado ?? null, ciudad ?? null],
    );
  }

  return cuenta;
}

export async function guardarCodigo(telefono, hash) {
  // Un código nuevo anula el anterior y reinicia el contador de intentos.
  await filas(
    `insert into auth.otp_codigos (telefono, codigo_hash, expira_en, intentos, creado_en)
     values ($1, $2, now() + make_interval(mins => $3), 0, now())
     on conflict (telefono) do update
        set codigo_hash = excluded.codigo_hash,
            expira_en = excluded.expira_en,
            intentos = 0,
            creado_en = now()`,
    [telefono, hash, config.otp.ttlMinutos],
  );
}

export async function validarCodigo(telefono, codigo) {
  const registro = await fila(
    `select codigo_hash, expira_en, intentos, expira_en <= now() as vencido
       from auth.otp_codigos
      where telefono = $1`,
    [telefono],
  );

  if (!registro) return { ok: false, motivo: "codigo_invalido" };

  if (registro.vencido || registro.intentos >= config.otp.maxIntentos) {
    await filas("delete from auth.otp_codigos where telefono = $1", [telefono]);
    return { ok: false, motivo: registro.vencido ? "codigo_expirado" : "codigo_invalido" };
  }

  if (!codigoCoincide(telefono, codigo, registro.codigo_hash)) {
    await filas(
      "update auth.otp_codigos set intentos = intentos + 1 where telefono = $1",
      [telefono],
    );
    return { ok: false, motivo: "codigo_invalido" };
  }

  await filas("delete from auth.otp_codigos where telefono = $1", [telefono]);

  const usuario = await fila(
    `update auth.users
        set phone_confirmed_at = coalesce(phone_confirmed_at, now()),
            last_sign_in_at = now()
      where phone = $1
      returning id, phone`,
    [telefono],
  );

  if (!usuario) return { ok: false, motivo: "cuenta_no_encontrada" };
  return { ok: true, usuario };
}

async function rolDe(usuarioId) {
  const perfil = await fila("select rol from public.usuarios where id = $1", [usuarioId]);
  return perfil?.rol ?? "cliente";
}

function tokensDe(usuario, rol, sesionId, refresh) {
  const acceso = firmarAcceso({ usuarioId: usuario.id, rol, sesionId });
  return {
    access_token: acceso.token,
    refresh_token: refresh,
    expires_at: acceso.expiraEn,
    usuario: { id: usuario.id, telefono: usuario.phone ?? usuario.telefono ?? null },
  };
}

export async function crearSesion(usuario, userAgent) {
  const refresh = nuevoRefresh();
  const rol = await rolDe(usuario.id);

  const sesion = await fila(
    `insert into auth.sesiones (usuario_id, refresh_hash, user_agent, expira_en)
     values ($1, $2, $3, $4)
     returning id`,
    [usuario.id, hashRefresh(refresh), userAgent ?? null, venceRefresh()],
  );

  await filas("delete from auth.otp_codigos where expira_en < now() - interval '1 day'");

  return tokensDe(usuario, rol, sesion.id, refresh);
}

export async function rotarSesion(refreshToken, userAgent) {
  const refresh = nuevoRefresh();

  // El update atómico evita que dos refrescos simultáneos reutilicen el mismo
  // token: el segundo ya no encuentra la fila.
  const sesion = await fila(
    `update auth.sesiones
        set refresh_hash = $2,
            ultimo_uso = now(),
            expira_en = $3,
            user_agent = coalesce($4, user_agent)
      where refresh_hash = $1
        and revocada_en is null
        and expira_en > now()
      returning id, usuario_id`,
    [hashRefresh(refreshToken), hashRefresh(refresh), venceRefresh(), userAgent ?? null],
  );

  if (!sesion) return null;

  const usuario = await fila("select id, phone from auth.users where id = $1", [sesion.usuario_id]);
  if (!usuario) return null;

  return tokensDe(usuario, await rolDe(usuario.id), sesion.id, refresh);
}

export async function revocarSesion(sesionId, usuarioId) {
  await filas(
    `update auth.sesiones
        set revocada_en = now()
      where id = $1 and usuario_id = $2 and revocada_en is null`,
    [sesionId, usuarioId],
  );
}
