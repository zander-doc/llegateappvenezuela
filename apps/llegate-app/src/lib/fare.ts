export type ServiceId = "moto" | "taxi" | "delivery";
export interface Service { id: ServiceId; name: string; min: number; perKm: number; seats: string; eta: string; }
export const SERVICES: Service[] = [
  { id: "moto", name: "Mototaxi", min: 1, perKm: 0.3, seats: "1 pasajero", eta: "3–7 min" },
  { id: "taxi", name: "Taxi Pana", min: 3, perKm: 0.6, seats: "Hasta 4", eta: "5–10 min" },
  { id: "delivery", name: "Delivery Express", min: 1, perKm: 0.35, seats: "Hasta 5 kg", eta: "20–45 min" },
];
export const BCV_DEMO = 887.3;
export function fareUsd(service: Service, km: number) { return Math.round((service.min + service.perKm * km) * 100) / 100; }
export function toBs(usd: number, rate = BCV_DEMO) { return Math.round(usd * rate); }
export const fmtUsd = (n: number) => `$${n.toFixed(2).replace(".", ",")}`;
export const fmtBs = (n: number) => `Bs. ${n.toLocaleString("es-VE")}`;
export const driverCommission = (usd: number) => Math.round(usd * 0.1 * 100) / 100;
