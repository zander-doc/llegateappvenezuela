import { VENEZUELA_LOCATIONS } from "./locations";

export const SITE = {
  name: "Llégate App",
  tagline: "Tu carrera con panas.",
  demoRate: 887.3,
  email: "hola@llegate.app",
  domain: "llegateappvenezuela.pages.dev",
};

export type CoverageStatus = "launch" | "pilot" | "waitlist";

export const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  launch: "Cobertura de lanzamiento",
  pilot: "Ciudad piloto",
  waitlist: "Lista de espera",
};

const LAUNCH = new Set([
  "distrito_capital",
  "miranda",
  "carabobo",
  "zulia",
  "lara",
  "tachira",
  "anzoategui",
  "bolivar",
]);

const PILOT = new Set([
  "la_guaira",
  "aragua",
  "merida",
  "nueva_esparta",
  "falcon",
  "monagas",
  "sucre",
  "trujillo",
]);

export function coverageForState(stateId: string): CoverageStatus {
  if (LAUNCH.has(stateId)) return "launch";
  if (PILOT.has(stateId)) return "pilot";
  return "waitlist";
}

export interface Hub {
  city: string;
  stateId: string;
  stateName: string;
  status: CoverageStatus;
}

const HUB_IDS = [
  "distrito_capital",
  "miranda",
  "carabobo",
  "zulia",
  "lara",
  "tachira",
  "anzoategui",
  "bolivar",
  "la_guaira",
  "aragua",
  "merida",
  "nueva_esparta",
];

export const HUBS: Hub[] = HUB_IDS.map((id) => {
  const state = VENEZUELA_LOCATIONS.find((s) => s.id === id)!;
  return {
    city: state.cities[0].split(" / ")[0],
    stateId: state.id,
    stateName: state.name.replace(/\s*\(.*\)$/, ""),
    status: coverageForState(state.id),
  };
});

export function hubCityLabel(stateName: string) {
  return stateName
    .replace("Distrito Capital (Caracas)", "Caracas")
    .replace("Miranda (Gran Caracas & Valles)", "Gran Caracas")
    .replace("La Guaira (Vargas)", "La Guaira")
    .replace("Nueva Esparta (Margarita & Coche)", "Margarita");
}

export const STATS = [
  {
    value: "3",
    label: "servicios desde el día uno",
    detail: "Mototaxi, taxi y delivery; el resto llega por fases",
  },
  { value: "2", label: "monedas de pago", detail: "Bolívares a tasa BCV o dólares en efectivo" },
  { value: "0%", label: "de comisión con plan Pro", detail: "Pagas el plan, no un porcentaje por viaje" },
  { value: "3", label: "pasos para pedir", detail: "Elige, confirma y muévete" },
];

export const STEPS = [
  {
    n: "01",
    title: "Elige tu servicio",
    text: "Moto para lo rápido, carro para el grupo o delivery para un paquete. Minivan, autobús y carga se suman en próximas fases.",
  },
  {
    n: "02",
    title: "Confirma el precio",
    text: "Ves la tarifa en dólares y en bolívares antes de pedir. Sin regateo y sin sorpresas al final.",
  },
  {
    n: "03",
    title: "Muévete y comparte",
    text: "Sigue el viaje en el mapa y comparte tu ruta con quien quieras, sin salir de la app.",
  },
];

export const SAFETY_POINTS = [
  {
    title: "Conductores verificados",
    text: "Revisamos identidad, licencia, documentos del vehículo y antecedentes antes de activar una cuenta.",
  },
  {
    title: "Ruta compartida",
    text: "Envía un enlace en vivo a un contacto de confianza. No necesita instalar nada para ver el recorrido.",
  },
  {
    title: "Botón de emergencia",
    text: "Comparte tu ubicación y llama a emergencias desde el viaje activo. El equipo recibe la alerta al instante.",
  },
  {
    title: "Precio antes de subir",
    text: "El monto se confirma antes de pedir y queda en el recibo, junto con la tasa BCV aplicada.",
  },
];
