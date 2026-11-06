// Un solo punto donde un formulario decide si el dato sale a la API o se queda
// en el navegador: sin VITE_API_URL no hay backend que lo reciba, y en ese caso
// la copia honesta es "guardado en este navegador".
import { enviarSolicitud, realAuthEnabled, type SolicitudInput } from "./api";
import { saveDemoLead } from "./demoStorage";

export type DestinoSolicitud = "real" | "demo";

export function guardarSolicitud(
  solicitud: SolicitudInput,
  datosDemo: Record<string, unknown>,
): Promise<DestinoSolicitud> {
  if (!realAuthEnabled) {
    saveDemoLead(`llegate_sim_${solicitud.tipo}`, datosDemo);
    return Promise.resolve("demo");
  }

  return enviarSolicitud(solicitud).then(() => "real");
}
