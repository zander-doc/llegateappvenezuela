import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Gift,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Badge } from "./ui";
import { PILOT_RULES, RECHARGE_PACKS, type PilotBalanceStatus } from "../data/prepaid";
import { usePilotWallet, type PilotMovement } from "../lib/pilotWallet";
import { formatUSD } from "../lib/format";

const STATUS_COPY: Record<PilotBalanceStatus, { label: string; tone: "success" | "yellow" | "danger" }> = {
  active: { label: "Activo", tone: "success" },
  low: { label: "Saldo bajo", tone: "yellow" },
  empty: { label: "Sin saldo", tone: "danger" },
};

const dateFmt = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function movementMeta(movement: PilotMovement) {
  if (movement.kind === "recarga") {
    return {
      icon: ArrowDownLeft,
      iconClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      amountClass: "text-emerald-300",
      label: "Recarga",
    };
  }
  if (movement.kind === "bienvenida") {
    return {
      icon: Gift,
      iconClass: "border-racing-500/30 bg-racing-500/10 text-racing-400",
      amountClass: "text-racing-400",
      label: "Bienvenida",
    };
  }
  return {
    icon: ArrowUpRight,
    iconClass: "border-brand-500/30 bg-brand-500/10 text-brand-400",
    amountClass: "text-ink-100",
    label: "Comisión",
  };
}

function MovementRow({ movement }: { movement: PilotMovement }) {
  const meta = movementMeta(movement);
  const Icon = meta.icon;
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.iconClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-semibold text-white">{meta.label}</p>
            <p className="truncate text-[11px] text-ink-400">{movement.note}</p>
          </div>
          <div className="text-right">
            <p className={`mono text-[12.5px] font-semibold ${meta.amountClass}`}>
              {movement.amountUSD > 0 ? "+" : ""}
              {formatUSD(movement.amountUSD)}
            </p>
            <p className="text-[10px] text-ink-500">{formatUSD(movement.balanceAfter)}</p>
          </div>
        </div>
        {movement.trip && (
          <div className="mt-1.5 grid gap-0.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[10.5px] text-ink-400 sm:grid-cols-3">
            <span>Tarifa {formatUSD(movement.trip.fareUSD)}</span>
            <span>Comisión -{formatUSD(movement.trip.commissionUSD)}</span>
            <span className="text-ink-200">Neto {formatUSD(movement.trip.netUSD)}</span>
          </div>
        )}
        <p className="mt-1 text-[10px] text-ink-500">{dateFmt.format(new Date(movement.createdAt))}</p>
      </div>
    </li>
  );
}

export function PilotWalletPanel() {
  const {
    balance,
    reserved,
    available,
    status,
    movements,
    hold,
    pendingRecharge,
    requestRecharge,
    resetWallet,
  } = usePilotWallet();
  const statusCopy = STATUS_COPY[status];

  return (
    <section id="billetera" className="card scroll-mt-28 overflow-hidden" aria-label="Billetera piloto de demostración">
      <div className="relative border-b border-white/8 bg-[linear-gradient(155deg,rgba(255,107,0,0.14),rgba(255,210,0,0.03)_45%,transparent)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-300">
              <Wallet className="h-4 w-4 text-brand-400" /> Billetera piloto
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={statusCopy.tone}>{statusCopy.label}</Badge>
              <span className="text-[10.5px] text-ink-500">Simulación local · no es dinero real</span>
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            Solo demo
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="mono text-[42px] font-semibold leading-none text-white sm:text-[52px]" aria-live="polite">
            {formatUSD(available)}
          </p>
          <p className="pb-1 text-[12.5px] text-ink-400">disponible para recibir viajes</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Saldo total", value: formatUSD(balance) },
            { label: "Reservado en viaje", value: formatUSD(reserved) },
            { label: "Mínimo para operar", value: formatUSD(PILOT_RULES.minBalanceUSD) },
            { label: "Comisión por viaje", value: `${Math.round(PILOT_RULES.commissionRate * 100)}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/8 bg-ink-950/40 px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">{item.label}</dt>
              <dd className="mono mt-0.5 text-[13.5px] font-semibold text-ink-100">{item.value}</dd>
            </div>
          ))}
        </dl>

        {hold && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-racing-500/20 bg-racing-500/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-ink-300">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
            Viaje en curso {hold.origin} → {hold.destination}: reservamos {formatUSD(hold.amountUSD)} para la comisión.
            Se descuenta al completar; si cancelas, vuelve a tu saldo.
          </p>
        )}
      </div>

      <div className="border-b border-white/8 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="heading text-[18px] font-bold text-white">Recargar saldo</h3>
            <p className="mt-0.5 text-[12px] text-ink-400">
              Pago Móvil o Binance. Aprobación manual con SLA de {PILOT_RULES.approvalSlaMinutes} minutos.
            </p>
          </div>
          <span className="text-[10.5px] text-ink-500">
            Recargas de {formatUSD(PILOT_RULES.minRechargeUSD)} a {formatUSD(PILOT_RULES.maxRechargeUSD)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RECHARGE_PACKS.map((pack) => (
            <button
              key={pack.amount}
              type="button"
              disabled={pendingRecharge !== null}
              onClick={() => requestRecharge(pack.amount)}
              className={`group rounded-xl border p-3 text-left transition disabled:opacity-45 ${
                pack.recommended
                  ? "border-brand-500/45 bg-brand-500/[0.09] hover:border-brand-500"
                  : "border-white/10 bg-white/[0.025] hover:border-brand-500/45 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{pack.name}</span>
              <span className="mono mt-1 block text-[20px] font-semibold leading-none text-white">
                {formatUSD(pack.amount)}
              </span>
              <span className="mt-1 block text-[10px] text-ink-500">{pack.note}</span>
            </button>
          ))}
        </div>

        {pendingRecharge && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-lg border border-racing-500/25 bg-racing-500/[0.07] px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-200"
          >
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-racing-500" />
            <span>
              Recarga de <strong className="text-white">{formatUSD(pendingRecharge.amount)}</strong> en revisión. En
              esta demo se aprueba en unos segundos; en producción el SLA es de {PILOT_RULES.approvalSlaMinutes}{" "}
              minutos.
            </span>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
          No se procesa ningún pago real. El saldo se guarda solo en este navegador y no se envía a ningún servidor.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-300">
            <History className="h-4 w-4 text-brand-400" /> Movimientos
          </p>
          <button
            type="button"
            onClick={resetWallet}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-400 transition hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reiniciar billetera
          </button>
        </div>

        {movements.length === 0 ? (
          <p className="px-5 pb-5 text-[12px] text-ink-400">Aún no hay movimientos.</p>
        ) : (
          <ul className="divide-y divide-white/8 border-t border-white/8">
            {movements.slice(0, 8).map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/8 bg-ink-950/40 px-5 py-4 sm:px-6">
        {[
          { icon: CheckCircle2, label: "Sin vencimiento" },
          { icon: CheckCircle2, label: "Sin saldo negativo" },
          { icon: CheckCircle2, label: "Sin bonos ni cuotas" },
          { icon: CheckCircle2, label: "Recibo por viaje" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-400">
              <Icon className="h-3.5 w-3.5 text-emerald-400" /> {item.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function PilotWalletMini() {
  const { available, reserved, hold, status, pendingRecharge, requestRecharge } = usePilotWallet();
  const low = available < PILOT_RULES.minBalanceUSD;
  const statusCopy = STATUS_COPY[status];

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-[9px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-ink-300">
          <Wallet className="h-3 w-3 text-brand-400" /> Saldo piloto
          <strong className="mono text-[11px] text-white">{formatUSD(available)}</strong>
        </span>
        <Badge tone={statusCopy.tone} className="!px-1.5 !py-0.5 !text-[8px]">
          {statusCopy.label}
        </Badge>
      </div>

      {hold && (
        <p className="mt-1 text-ink-400">
          Reservado {formatUSD(hold.amountUSD)} · se descuenta al completar
        </p>
      )}

      {pendingRecharge ? (
        <p className="mt-1 flex items-center gap-1 text-racing-400">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Recarga {formatUSD(pendingRecharge.amount)} en revisión
        </p>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className={low ? "text-racing-400" : "text-ink-500"}>
            {low ? `Mínimo ${formatUSD(PILOT_RULES.minBalanceUSD)} para recibir` : "Recargar"}
          </span>
          <span className="flex gap-1">
            {[5, 10].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => requestRecharge(amount)}
                className="rounded border border-white/12 px-1.5 py-0.5 text-[8.5px] text-ink-200 transition hover:border-brand-500/60 hover:text-white"
              >
                +{formatUSD(amount)}
              </button>
            ))}
          </span>
        </div>
      )}
      {reserved > 0 && <span className="sr-only">Reservado {formatUSD(reserved)}</span>}
    </div>
  );
}
