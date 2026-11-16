import { config } from "../config.js";
import { fila, filas } from "../db.js";
import {
  codigoCoincide,
  firmarAcceso,
  hashRefresh,
  nuevoRefresh,
  venceRefresh,
} from "./tokens.js";

async function crearCuentaSiNoExiste({ telefono, rol, nombre, estado, ciudad }) {
  const metadata = { rol: rol ?? "cliente", ...(nombre ? { nombre } : {}) };

  const nuevaCuenta = await fila(
    `insert into auth.users (phone, raw_user_meta_data)
     values ($1, $2::jsonb)
     on conflict (phone) do nothing
     returning id, phone, phone_confirmed_at`,
    [telefono, JSON.stringify(metadata)],
  );

  const cuenta =
    nuevaCuenta ??
    (await fila(
      `select id, phone, phone_confirmed_at
         from auth.users
        where phone = $1`,
      [telefono],
    ));

  if (nuevaCuenta && (estado || ciudad)) {
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

export async function guardarCodigo(telefono, hash, datosRegistro) {
  // Un código nuevo anula el anterior y reinicia el contador de intentos.
  await filas(
    `insert into auth.otp_codigos (telefono, codigo_hash, datos_registro, expira_en, intentos, creado_en)
     values ($1, $2, $3::jsonb, now() + make_interval(mins => $4), 0, now())
     on conflict (telefono) do update
        set codigo_hash = excluded.codigo_hash,
            datos_registro = excluded.datos_registro,
            expira_en = excluded.expira_en,
            intentos = 0,
            creado_en = now()`,
    [telefono, hash, JSON.stringify(datosRegistro), config.otp.ttlMinutos],
  );
}

export async function validarCodigo(telefono, codigo) {
  const registro = await fila(
    `select codigo_hash, datos_registro, expira_en, intentos, expira_en <= now() as vencido
       from auth.otp_codigos
      where telefono = $1`,
    [telefono],
  );

  if (!registro) return { ok: false, motivo: "codigo_invalido" };

  if (registro.vencido || registro.intentos >= config.otp.maxIntentos) {
    await filas(
      "delete from auth.otp_codigos where telefono = $1 and codigo_hash = $2",
      [telefono, registro.codigo_hash],
    );
    return { ok: false, motivo: registro.vencido ? "codigo_expirado" : "codigo_invalido" };
  }

  if (!codigoCoincide(telefono, codigo, registro.codigo_hash)) {
    await filas(
      `update auth.otp_codigos
          set intentos = intentos + 1
        where telefono = $1 and codigo_hash = $2 and expira_en > now()`,
      [telefono, registro.codigo_hash],
    );
    return { ok: false, motivo: "codigo_invalido" };
  }

  // DELETE is the one-time consume operation. Concurrent verifications can
  // read the challenge, but only one can delete and receive its pending data.
  const [consumido] = await filas(
    `delete from auth.otp_codigos
      where telefono = $1
        and codigo_hash = $2
        and expira_en > now()
        and intentos < $3
      returning datos_registro`,
    [telefono, registro.codigo_hash, config.otp.maxIntentos],
  );
  if (!consumido) return { ok: false, motivo: "codigo_invalido" };

  const cuenta = await crearCuentaSiNoExiste({
    telefono,
    ...(consumido.datos_registro ?? {}),
  });
  if (!cuenta) return { ok: false, motivo: "cuenta_no_encontrada" };

  const usuario = await fila(
    `update auth.users
        set phone_confirmed_at = coalesce(phone_confirmed_at, now()),
            last_sign_in_at = now()
      where id = $1
      returning id, phone`,
    [cuenta.id],
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

// Cuentas de Google. Se identifica a la persona por el "sub" de Google. NO se
// une por correo a una cuenta existente: el correo de un perfil de teléfono lo
// escribe el usuario sin verificarlo, y unirlas así permitiría tomar la cuenta
// de otra persona. Para juntar teléfono y Google hay que estar ya dentro de la
// cuenta (vincularGoogle).
const UNICA_VIOLADA = "23505";

export async function ingresarConGoogle(google) {
  const existente = await fila(
    `select u.id, a.phone
       from public.usuarios u
       join auth.users a on a.id = u.id
      where u.google_sub = $1`,
    [google.sub],
  );

  if (existente) {
    await filas(
      `update auth.users set last_sign_in_at = now() where id = $1`,
      [existente.id],
    );
    await filas(
      `update public.usuarios
          set ultimo_acceso_en = now(),
              foto_url = coalesce(foto_url, $2)
        where id = $1`,
      [existente.id, google.foto],
    );
    return { ok: true, usuario: { id: existente.id, phone: existente.phone }, nuevo: false };
  }

  const metadata = { rol: "cliente", nombre: google.nombre, email: google.email };
  const creada = await fila(
    `insert into auth.users (email, email_confirmed_at, raw_user_meta_data, last_sign_in_at)
     values ($1, now(), $2::jsonb, now())
     on conflict (email) do nothing
     returning id, phone`,
    [google.email, JSON.stringify(metadata)],
  );
  if (!creada) return { ok: false, motivo: "correo_ya_registrado" };

  try {
    await filas(
      `update public.usuarios
          set google_sub = $2,
              foto_url = $3,
              origen_registro = 'google',
              ultimo_acceso_en = now()
        where id = $1`,
      [creada.id, google.sub, google.foto],
    );
  } catch (error) {
    // Dos pestañas entrando a la vez con la misma cuenta nueva: gana la primera.
    if (error?.code !== UNICA_VIOLADA) throw error;
    await filas("delete from auth.users where id = $1", [creada.id]);
    return ingresarConGoogle(google);
  }

  return { ok: true, usuario: { id: creada.id, phone: creada.phone }, nuevo: true };
}

export async function vincularGoogle(usuarioId, google) {
  const dueno = await fila("select id from public.usuarios where google_sub = $1", [google.sub]);
  if (dueno) {
    return dueno.id === usuarioId ? { ok: true } : { ok: false, motivo: "google_ya_vinculado" };
  }

  try {
    const [cambio] = await filas(
      `update public.usuarios
          set google_sub = $2,
              foto_url = coalesce(foto_url, $3),
              email = coalesce(email, $4),
              updated_at = now()
        where id = $1 and google_sub is null
        returning id`,
      [usuarioId, google.sub, google.foto, google.email],
    );
    return cambio ? { ok: true } : { ok: false, motivo: "cuenta_con_google" };
  } catch (error) {
    if (error?.code === UNICA_VIOLADA) return { ok: false, motivo: "google_ya_vinculado" };
    throw error;
  }
}
