// Texto del aviso cuando el operador decide sobre el registro del piloto.
export function avisoVerificacion({ aprobado, motivo }) {
  if (aprobado) {
    return {
      tipo: "conductor_aprobado",
      titulo: "¡Tu cuenta de piloto fue aprobada!",
      cuerpo: "Ya puedes recibir viajes. Recarga tu saldo prepago para activarte.",
    };
  }
  const detalle = String(motivo ?? "").replace(/\s+/g, " ").trim();
  return {
    tipo: "conductor_rechazado",
    titulo: "Necesitamos correcciones en tu registro",
    cuerpo: detalle
      ? `${detalle} Corrige lo indicado y vuelve a enviarlo a revisión.`
      : "Revisa tus documentos y vuelve a enviarlos a revisión.",
  };
}
