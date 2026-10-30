export const PILOT_RULES = {
  commissionRate: 0.1,
  minCommissionUSD: 0.1,
  minBalanceUSD: 1,
  lowBalanceUSD: 2,
  welcomeUSD: 2,
  minRechargeUSD: 5,
  maxRechargeUSD: 50,
  approvalSlaMinutes: 15,
} as const;

export interface RechargePack {
  amount: number;
  name: string;
  note: string;
  recommended?: boolean;
}

export const RECHARGE_PACKS: RechargePack[] = [
  { amount: 5, name: "Arranque", note: "Para empezar el día" },
  { amount: 10, name: "Ritmo", note: "La más pedida", recommended: true },
  { amount: 20, name: "Semana", note: "Menos recargas" },
  { amount: 50, name: "Turno largo", note: "Mayor cobertura" },
];

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function commissionFor(fareUSD: number): number {
  if (!Number.isFinite(fareUSD) || fareUSD <= 0) return 0;
  return Math.min(
    roundMoney(fareUSD),
    Math.max(PILOT_RULES.minCommissionUSD, roundMoney(fareUSD * PILOT_RULES.commissionRate))
  );
}

export function requiredBalanceFor(fareUSD: number): number {
  return Math.max(PILOT_RULES.minBalanceUSD, commissionFor(fareUSD));
}

export type PilotBalanceStatus = "active" | "low" | "empty";

export function pilotBalanceStatus(availableUSD: number): PilotBalanceStatus {
  if (availableUSD <= 0) return "empty";
  if (availableUSD < PILOT_RULES.lowBalanceUSD) return "low";
  return "active";
}

export function suggestRechargePack(weeklyCommissionUSD: number): RechargePack {
  if (weeklyCommissionUSD <= 0) return RECHARGE_PACKS[0];
  const target = weeklyCommissionUSD * 2;
  return RECHARGE_PACKS.find((pack) => pack.amount >= target) ?? RECHARGE_PACKS[RECHARGE_PACKS.length - 1];
}

export function rechargeCoverageWeeks(packUSD: number, weeklyCommissionUSD: number): number {
  if (weeklyCommissionUSD <= 0) return 0;
  return roundMoney(packUSD / weeklyCommissionUSD);
}
