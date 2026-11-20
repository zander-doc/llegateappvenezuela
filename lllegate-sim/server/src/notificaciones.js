import { fila, filas } from "./db.js";

export { avisoVerificacion } from "./notificacionesTexto.js";

// Avisos que el piloto o el cliente ven en la web y en la app. Crear un aviso
// nunca debe romper la acción que lo origina (aprobar, rechazar...).
export async function notificar(usuarioId, { tipo, titulo, cuerpo = "" }) {
  try {
    await filas(
      "insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo) values ($1, $2, $3, $4)",
      [usuarioId, tipo, String(titulo).slice(0, 120), String(cuerpo).slice(0, 600)],
    );
  } catch (error) {
    console.error("notificacion_no_creada", tipo, error instanceof Error ? error.message : error);
  }
}

export async function listarNotificaciones(usuarioId, limite = 20) {
  const [items, total] = await Promise.all([
    filas(
      `select id, tipo, titulo, cuerpo, leida_en, creado_en
         from public.notificaciones
        where usuario_id = $1
        order by creado_en desc, id desc
        limit $2`,
      [usuarioId, limite],
    ),
    fila(
      "select count(*)::int as n from public.notificaciones where usuario_id = $1 and leida_en is null",
      [usuarioId],
    ),
  ]);
  return { items: items ?? [], sinLeer: total?.n ?? 0 };
}

export async function marcarLeidas(usuarioId, id = null) {
  await filas(
    `update public.notificaciones
        set leida_en = now()
      where usuario_id = $1 and leida_en is null and ($2::bigint is null or id = $2)`,
    [usuarioId, id],
  );
}
