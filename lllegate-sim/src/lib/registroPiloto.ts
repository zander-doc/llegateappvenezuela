import type { EstadoVerificacion } from "./api";

// Pasos del registro de piloto, iguales en la web y en la app. El avance se
// deduce de lo que ya está guardado en el servidor, así que se puede retomar
// desde cualquier dispositivo.

export type PasoId = "cuenta" | "vehiculo" | "documentos" | "revision";
export type EstadoPaso = "hecho" | "actual" | "pendiente";

export interface PasoRegistro {
  id: PasoId;
  titulo: string;
  estado: EstadoPaso;
  nota: string;
}

export interface EntradaRegistro {
  conSesion: boolean;
  conVehiculo: boolean;
  documentosCargados: number;
  documentosRequeridos?: number;
  enviadoEn: string | null;
  verificacion: EstadoVerificacion | null;
}

export function pasosRegistro(entrada: EntradaRegistro): { pasos: PasoRegistro[]; actual: number } {
  const requeridos = entrada.documentosRequeridos ?? 4;
  const docsListos = entrada.documentosCargados >= requeridos;
  const aprobado = entrada.verificacion === "aprobado";
  const correcciones = entrada.verificacion === "rechazado";
  const enRevision = Boolean(entrada.enviadoEn) && entrada.verificacion === "pendiente";

  const hecho = [
    entrada.conSesion,
    entrada.conSesion && entrada.conVehiculo,
    entrada.conSesion && entrada.conVehiculo && docsListos,
    aprobado,
  ];

  // El paso actual es el primero sin terminar; con la cuenta aprobada no queda ninguno.
  const primeroPendiente = hecho.findIndex((listo) => !listo);
  const actual = primeroPendiente === -1 ? hecho.length - 1 : primeroPendiente;

  const notaRevision = aprobado
    ? "Aprobado"
    : correcciones
      ? "Correcciones"
      : enRevision
        ? "En revisión"
        : docsListos && entrada.conVehiculo
          ? "Listo para enviar"
          : "Sin enviar";

  const notas: string[] = [
    entrada.conSesion ? "Lista" : "Ingresa",
    entrada.conVehiculo ? "Guardado" : "Por completar",
    `${Math.min(entrada.documentosCargados, requeridos)} de ${requeridos}`,
    notaRevision,
  ];
  const titulos: Array<[PasoId, string]> = [
    ["cuenta", "Cuenta"],
    ["vehiculo", "Vehículo"],
    ["documentos", "Documentos"],
    ["revision", "Revisión"],
  ];

  const pasos = titulos.map(([id, titulo], indice) => ({
    id,
    titulo,
    nota: notas[indice],
    estado: (hecho[indice] ? "hecho" : indice === actual ? "actual" : "pendiente") as EstadoPaso,
  }));

  return { pasos, actual };
}
