export interface AppConfigService {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  description: string;
  icon: string;
  minFareUSD: number;
  perKmUSD: number;
  capacity: string;
  eta: string;
  status: "launch" | "upcoming";
  phase: string | null;
}

export interface AppWalletRules {
  commissionRate: number;
  minCommissionUSD: number;
  minBalanceUSD: number;
  lowBalanceUSD: number;
  welcomeUSD: number;
  minRechargeUSD: number;
  maxRechargeUSD: number;
  approvalSlaMinutes: number;
}

export interface AppRechargePack {
  amount: number;
  name: string;
  note: string;
  recommended: boolean;
}

export interface AppFareRules {
  model: string;
  perKm: boolean;
  perMinuteUSD: number;
  roundTripDoublesDistance: boolean;
  minFareChargedOnce: boolean;
  currency: string;
}

export interface AppConfig {
  version: number;
  services: AppConfigService[];
  fareRules: AppFareRules;
  walletRules: AppWalletRules;
  rechargePacks: AppRechargePack[];
}

export const APP_CONFIG_VERSION: number;
export const APP_SERVICES: AppConfigService[];
export const APP_WALLET_RULES: AppWalletRules;
export const APP_RECHARGE_PACKS: AppRechargePack[];
export const APP_FARE_RULES: AppFareRules;
export const APP_CONFIG: AppConfig;
