export interface Plan {
  id: string;
  name: string;
  audience: "conductor" | "pasajero";
  priceUSD: number;
  period: string;
  per: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export const DRIVER_PLANS: Plan[] = [
  {
    id: "pro-semanal",
    name: "Pro Semanal",
    audience: "conductor",
    priceUSD: 3.5,
    period: "semana",
    per: "por semana",
    tagline: "Prueba el modelo sin compromiso mensual.",
    features: [
      "0% de comisión por viaje",
      "Solicitudes en tu ciudad",
      "Cobro en bolívares o dólares",
      "Renovación semanal, cancelas cuando quieras",
    ],
  },
  {
    id: "pro-mensual",
    name: "Pro Mensual",
    audience: "conductor",
    priceUSD: 12,
    period: "mes",
    per: "por mes",
    tagline: "El plan de la mayoría de los conductores.",
    features: [
      "0% de comisión por viaje",
      "Solicitudes en todas las ciudades con cobertura",
      "Prioridad en horas pico",
      "Reporte de ganancias y recibos",
      "Soporte preferente por WhatsApp",
    ],
    highlight: true,
    badge: "Más elegido",
  },
  {
    id: "conductoras-rosa",
    name: "Conductoras Rosa",
    audience: "conductor",
    priceUSD: 9,
    period: "mes",
    per: "por mes",
    tagline: "Para conductoras verificadas y pasajeras que lo prefieren.",
    features: [
      "0% de comisión por viaje",
      "Perfil verificado Conductoras Rosa",
      "Solicitudes de pasajeras que eligen el modo Rosa",
      "Acompañamiento del equipo Rosa",
    ],
    badge: "Verificación especial",
  },
];

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

export const COMMISSION_PAY_PER_RIDE = 0.1;

export function suggestDriverPlan(tripsPerWeek: number, avgTicketUSD: number): {
  recommendedId: string;
  commissionUSD: number;
  savingsMonthly: number;
} {
  const monthlyCommission = tripsPerWeek * 4.33 * avgTicketUSD * COMMISSION_PAY_PER_RIDE;
  const weeklyCommission = tripsPerWeek * avgTicketUSD * COMMISSION_PAY_PER_RIDE;
  let recommendedId = "pro-semanal";
  if (monthlyCommission - 12 >= weeklyCommission - 3.5) recommendedId = "pro-mensual";
  const planCost = recommendedId === "pro-mensual" ? 12 : 3.5;
  const planPeriodCost = recommendedId === "pro-mensual" ? 12 : 3.5 * 4.33;
  return {
    recommendedId,
    commissionUSD: Math.max(0, monthlyCommission - planPeriodCost),
    savingsMonthly: Math.max(0, monthlyCommission - planCost),
  };
}
