export interface Plan {
  id: string;
  name: string;
  audience: "pasajero";
  priceUSD: number;
  period: string;
  per: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export const VIP_PLAN: Plan = {
  id: "club-vip",
  name: "Club VIP",
  audience: "pasajero",
  priceUSD: 4.99,
  period: "mes",
  per: "por mes",
  tagline: "Para quienes usan Llégate todas las semanas.",
  features: [
    "Prioridad de asignación en horas pico",
    "2 cancelaciones sin cargo al mes",
    "Soporte humano en menos de 5 minutos",
    "Precio preferente en rutas frecuentes",
  ],
};
