const usdFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const bsFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const rateFmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const DEMO_BCV_RATE = 887.3;

export function formatUSD(value: number): string {
  return `$${usdFmt.format(value)}`;
}

export function formatBs(valueUSD: number, rate = DEMO_BCV_RATE): string {
  return `Bs. ${bsFmt.format(valueUSD * rate)}`;
}

export function formatRate(rate = DEMO_BCV_RATE): string {
  return rateFmt.format(rate);
}

export interface FareEstimate {
  minUSD: number;
  distanceKm: number;
  distanceUSD: number;
  totalUSD: number;
}

export function estimateTripFare(
  minFareUSD: number,
  perKmUSD: number,
  km: number,
  options: { roundTrip?: boolean; minutes?: number } = {}
): FareEstimate {
  const distanceKm = Math.round(km * (options.roundTrip ? 2 : 1) * 10) / 10;
  const rawDistance = perKmUSD * distanceKm;
  const total = minFareUSD + rawDistance + (options.minutes ?? 0) * 0.04;
  return {
    minUSD: minFareUSD,
    distanceKm,
    distanceUSD: Math.round(rawDistance * 100) / 100,
    totalUSD: Math.round(Math.max(minFareUSD, total) * 100) / 100,
  };
}

export function estimateFare(minFareUSD: number, perKmUSD: number, km: number, minutes = 0): number {
  return estimateTripFare(minFareUSD, perKmUSD, km, { minutes }).totalUSD;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("es-VE", { maximumFractionDigits: 1 })} km`;
}
