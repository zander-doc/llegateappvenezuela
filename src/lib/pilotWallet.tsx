import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PILOT_RULES,
  commissionFor,
  requiredBalanceFor,
  roundMoney,
  type PilotBalanceStatus,
  pilotBalanceStatus,
} from "../data/prepaid";
import { formatUSD } from "./format";
import { useUI } from "./ui";

const STORAGE_KEY = "llegate_sim_pilot_wallet_v1";
const MAX_MOVEMENTS = 40;

export type PilotMovementKind = "bienvenida" | "recarga" | "comision";

export interface PilotTripReceipt {
  fareUSD: number;
  commissionUSD: number;
  netUSD: number;
  origin: string;
  destination: string;
  balanceAfter: number;
}

export interface PilotMovement {
  id: string;
  kind: PilotMovementKind;
  amountUSD: number;
  balanceAfter: number;
  createdAt: string;
  note: string;
  method?: string;
  trip?: PilotTripReceipt;
}

export interface PilotHold {
  tripId: string;
  amountUSD: number;
  fareUSD: number;
  origin: string;
  destination: string;
  createdAt: string;
}

interface PilotWalletState {
  balance: number;
  movements: PilotMovement[];
}

export interface PendingRecharge {
  id: string;
  amount: number;
  method: string;
  requestedAt: string;
}

export type HoldResult =
  | { ok: true; hold: PilotHold }
  | {
      ok: false;
      reason: "active_hold" | "insufficient";
      commissionUSD: number;
      availableUSD: number;
      neededUSD: number;
    };

interface PilotWalletContextValue {
  balance: number;
  reserved: number;
  available: number;
  status: PilotBalanceStatus;
  movements: PilotMovement[];
  hold: PilotHold | null;
  pendingRecharge: PendingRecharge | null;
  requestRecharge: (amountUSD: number) => boolean;
  holdCommission: (input: { fareUSD: number; origin: string; destination: string }) => HoldResult;
  captureCommission: (tripId: string) => PilotTripReceipt | null;
  releaseHold: (tripId?: string) => void;
  resetWallet: () => void;
}

const PilotWalletContext = createContext<PilotWalletContextValue | null>(null);

let sequence = 0;

function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

function welcomeMovement(): PilotMovement {
  return {
    id: nextId("bienvenida"),
    kind: "bienvenida",
    amountUSD: PILOT_RULES.welcomeUSD,
    balanceAfter: PILOT_RULES.welcomeUSD,
    createdAt: new Date().toISOString(),
    note: "Saldo de bienvenida del piloto",
  };
}

function initialState(): PilotWalletState {
  return { balance: PILOT_RULES.welcomeUSD, movements: [welcomeMovement()] };
}

function readStoredWallet(): PilotWalletState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<PilotWalletState>;
    if (typeof parsed.balance !== "number" || !Number.isFinite(parsed.balance) || !Array.isArray(parsed.movements)) {
      return initialState();
    }
    return {
      balance: Math.max(0, roundMoney(parsed.balance)),
      movements: parsed.movements.slice(0, MAX_MOVEMENTS),
    };
  } catch {
    return initialState();
  }
}

export function PilotWalletProvider({ children }: { children: ReactNode }) {
  const { notify } = useUI();
  const [wallet, setWallet] = useState<PilotWalletState>(readStoredWallet);
  const [hold, setHold] = useState<PilotHold | null>(null);
  const [pendingRecharge, setPendingRecharge] = useState<PendingRecharge | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    } catch {
      /* almacenamiento no disponible: la simulación sigue funcionando */
    }
  }, [wallet]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const requestRecharge = useCallback(
    (amountUSD: number) => {
      const amount = roundMoney(amountUSD);
      if (amount < PILOT_RULES.minRechargeUSD || amount > PILOT_RULES.maxRechargeUSD) return false;
      if (pendingRecharge) return false;

      const pending: PendingRecharge = {
        id: nextId("recarga"),
        amount,
        method: "Pago Móvil · simulado",
        requestedAt: new Date().toISOString(),
      };
      setPendingRecharge(pending);

      timerRef.current = window.setTimeout(() => {
        setWallet((prev) => {
          const balance = roundMoney(prev.balance + amount);
          const movement: PilotMovement = {
            id: pending.id,
            kind: "recarga",
            amountUSD: amount,
            balanceAfter: balance,
            createdAt: new Date().toISOString(),
            note: "Recarga aprobada",
            method: "Pago Móvil",
          };
          return { balance, movements: [movement, ...prev.movements].slice(0, MAX_MOVEMENTS) };
        });
        setPendingRecharge(null);
        timerRef.current = null;
        notify(`Recarga de ${formatUSD(amount)} aprobada (simulación).`);
      }, 3200);

      return true;
    },
    [notify, pendingRecharge]
  );

  const holdCommission = useCallback(
    (input: { fareUSD: number; origin: string; destination: string }): HoldResult => {
      const commissionUSD = commissionFor(input.fareUSD);
      const availableUSD = roundMoney(wallet.balance - (hold?.amountUSD ?? 0));

      if (hold) {
        return {
          ok: false,
          reason: "active_hold",
          commissionUSD,
          availableUSD,
          neededUSD: requiredBalanceFor(input.fareUSD),
        };
      }

      const required = requiredBalanceFor(input.fareUSD);
      if (availableUSD < required) {
        return {
          ok: false,
          reason: "insufficient",
          commissionUSD,
          availableUSD,
          neededUSD: roundMoney(required - availableUSD),
        };
      }

      const nextHold: PilotHold = {
        tripId: nextId("viaje"),
        amountUSD: commissionUSD,
        fareUSD: input.fareUSD,
        origin: input.origin,
        destination: input.destination,
        createdAt: new Date().toISOString(),
      };
      setHold(nextHold);
      return { ok: true, hold: nextHold };
    },
    [hold, wallet.balance]
  );

  const captureCommission = useCallback(
    (tripId: string): PilotTripReceipt | null => {
      if (!hold || hold.tripId !== tripId) return null;

      const charged = roundMoney(Math.min(hold.amountUSD, wallet.balance));
      const balanceAfter = roundMoney(wallet.balance - charged);
      const receipt: PilotTripReceipt = {
        fareUSD: hold.fareUSD,
        commissionUSD: charged,
        netUSD: roundMoney(hold.fareUSD - charged),
        origin: hold.origin,
        destination: hold.destination,
        balanceAfter,
      };
      const movement: PilotMovement = {
        id: nextId("comision"),
        kind: "comision",
        amountUSD: -charged,
        balanceAfter,
        createdAt: new Date().toISOString(),
        note: `Comisión del viaje ${hold.origin} → ${hold.destination}`,
        trip: receipt,
      };

      setWallet((prev) => ({
        balance: roundMoney(prev.balance - charged),
        movements: [movement, ...prev.movements].slice(0, MAX_MOVEMENTS),
      }));
      setHold(null);
      return receipt;
    },
    [hold, wallet.balance]
  );

  const releaseHold = useCallback((tripId?: string) => {
    setHold((current) => {
      if (!current) return null;
      if (tripId && current.tripId !== tripId) return current;
      return null;
    });
  }, []);

  const resetWallet = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPendingRecharge(null);
    setHold(null);
    setWallet(initialState());
    notify("Billetera piloto reiniciada con el saldo de bienvenida.");
  }, [notify]);

  const available = roundMoney(wallet.balance - (hold?.amountUSD ?? 0));

  const value = useMemo<PilotWalletContextValue>(
    () => ({
      balance: wallet.balance,
      reserved: hold?.amountUSD ?? 0,
      available,
      status: pilotBalanceStatus(available),
      movements: wallet.movements,
      hold,
      pendingRecharge,
      requestRecharge,
      holdCommission,
      captureCommission,
      releaseHold,
      resetWallet,
    }),
    [
      wallet.balance,
      wallet.movements,
      hold,
      pendingRecharge,
      available,
      requestRecharge,
      holdCommission,
      captureCommission,
      releaseHold,
      resetWallet,
    ]
  );

  return <PilotWalletContext.Provider value={value}>{children}</PilotWalletContext.Provider>;
}

export function usePilotWallet() {
  const context = useContext(PilotWalletContext);
  if (!context) throw new Error("usePilotWallet must be used inside PilotWalletProvider");
  return context;
}
