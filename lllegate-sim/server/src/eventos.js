import { filas } from "./db.js";

// Base para seguimiento de comportamiento y premios. Registrar un evento nunca
// debe romper la acción del usuario: si falla, solo queda en el registro.
export async function registrarEvento(usuarioId, tipo, datos = {}) {
  try {
    await filas(
      "insert into public.eventos_usuario (usuario_id, tipo, datos) values ($1, $2, $3::jsonb)",
      [usuarioId, tipo, JSON.stringify(datos)],
    );
  } catch (error) {
    console.error("evento_no_registrado", tipo, error instanceof Error ? error.message : error);
  }
}
