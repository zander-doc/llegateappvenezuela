// La propuesta de una ficha tiene el mismo punto de decisión que los formularios
// del sitio: sin VITE_API_URL no hay vitrina real donde publicarla, y la copia
// honesta es "guardado en este navegador".
import { crearNegocio, realAuthEnabled, type NegocioInput } from "./api";
import { saveDemoLead } from "./demoStorage";

export type DestinoNegocio = "real" | "demo";

export function proponerNegocio(input: NegocioInput): Promise<DestinoNegocio> {
  if (!realAuthEnabled) {
    saveDemoLead("llegate_sim_negocio", {
      nombre: input.nombre,
      categoria: input.categoria,
      ciudad: input.ciudad,
      zona: input.zona,
      oferta: input.oferta,
    });
    return Promise.resolve("demo");
  }

  return crearNegocio(input).then(() => "real");
}
