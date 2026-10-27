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

export function estimateFare(fromUSD: number, perKmUSD: number, km: number, minutes = 0): number {
  return Math.round((fromUSD + perKmUSD * km + minutes * 0.04) * 100) / 100;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString("es-VE", { maximumFractionDigits: 1 })} km`;
}
