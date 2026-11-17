// Texto del rol que ve la persona en su perfil, en la web y en la app. Se
// calcula en el servidor para que ambas muestren exactamente lo mismo.
export function etiquetaRol({ rol, es_conductor, tipo_vehiculo, puede_conducir }) {
  if (rol === "admin") return "Administrador";

  if (rol === "conductor" || es_conductor) {
    if (puede_conducir) return tipo_vehiculo === "moto" ? "Piloto mototaxi" : "Taxista";
    return "Conductor en verificación";
  }

  return "Pasajero";
}
