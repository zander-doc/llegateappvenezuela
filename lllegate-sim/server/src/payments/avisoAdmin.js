import { fila } from "../db.js";
import { avisoAdminDisponible, enviarAvisoRecarga } from "../security/whatsapp.js";

// Aviso al administrador cuando un cliente reporta una recarga. Nunca debe
// romper el reporte del cliente: cualquier fallo se registra y se ignora.
export async function avisarRecargaAlAdmin({ pagoId, referencia }) {
  try {
    if (!avisoAdminDisponible()) return;

    const datos = await fila(
      `select p.monto_usd, p.monto_bs, u.nombre
         from public.pagos p
         join public.usuarios u on u.id = p.usuario_id
        where p.id = $1`,
      [pagoId],
    );
    if (!datos) return;

    await enviarAvisoRecarga({
      montoUsd: datos.monto_usd,
      montoBs: datos.monto_bs,
      referencia,
      cliente: datos.nombre,
    });
  } catch (error) {
    console.error("aviso_recarga_whatsapp_fallo", error instanceof Error ? error.message : error);
  }
}
