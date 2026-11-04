export type LatLng = { lat: number; lng: number };
const p = (lat: number, lng: number): LatLng => ({ lat, lng });
export const PICKUP = p(10.4961, -66.8486);
export const DROPOFF = p(10.48, -66.865);
export const TRIP_ROUTE = [PICKUP, p(10.495, -66.851), p(10.4938, -66.854), p(10.4925, -66.857), p(10.4908, -66.86), p(10.488, -66.862), p(10.485, -66.8635), p(10.4825, -66.8645), DROPOFF];
export const APPROACH_ROUTE = [p(10.501, -66.842), p(10.499, -66.845), p(10.4975, -66.847), PICKUP];
export const MEETING_POINTS = [
  { id: "obelisco", name: "Obelisco de Plaza Francia", hint: "Bien iluminado · 20 m", pos: p(10.4963, -66.8489) },
  { id: "metro", name: "Salida Metro Altamira", hint: "Zona concurrida · 60 m", pos: p(10.4967, -66.848) },
  { id: "esquina", name: "Esquina de la farmacia", hint: "Fácil de parar · 45 m", pos: p(10.4955, -66.8493) },
];
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371; const dLat = ((b.lat - a.lat) * Math.PI) / 180; const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function pathKm(path: LatLng[]) { let d = 0; for (let i = 1; i < path.length; i++) d += haversineKm(path[i - 1]!, path[i]!); return d; }
export function heading(a: LatLng, b: LatLng) { return (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI; }
