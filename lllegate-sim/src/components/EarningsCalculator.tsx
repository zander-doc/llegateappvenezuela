import { useState } from "react";
import { ArrowRight, Calculator, Percent, ReceiptText, Wallet } from "lucide-react";
import { Badge, Button, Money } from "./ui";
import { useUI } from "../lib/ui";
import { PILOT_RULES, commissionFor, rechargeCoverageWeeks, suggestRechargePack } from "../data/prepaid";
import { LAUNCH_SERVICES } from "../data/services";
import { formatUSD } from "../lib/format";

export function EarningsCalculator() {
  const { openModal } = useUI();
  const [trips, setTrips] = useState(25);
  const [ticket, setTicket] = useState(2);

  const commissionPerTrip = commissionFor(ticket);
  const weeklyGross = trips * ticket;
  const weeklyCommission = trips * commissionPerTrip;
  const weeklyNet = weeklyGross - weeklyCommission;
  const monthlyNet = weeklyNet * 4.33;
  const suggestedPack = suggestRechargePack(weeklyCommission);
  const coverageWeeks = rechargeCoverageWeeks(suggestedPack.amount, weeklyCommission);
  const welcomeTrips = commissionPerTrip > 0 ? Math.floor(PILOT_RULES.welcomeUSD / commissionPerTrip) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-400" />
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">Calculadora de prepago</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Estimado
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <div className="flex items-end justify-between">
            <label htmlFor="trips" className="text-[12.5px] font-semibold text-white">
              Viajes por semana
            </label>
            <span className="mono text-[13px] text-racing-400">{trips}</span>
          </div>
          <input
            id="trips"
            type="range"
            min={5}
            max={100}
            step={5}
            value={trips}
            onChange={(e) => setTrips(Number(e.target.value))}
            className="range mt-3 w-full"
            style={{ "--pct": `${((trips - 5) / 95) * 100}%` } as React.CSSProperties}
          />
        </div>
        <div>
          <div className="flex items-end justify-between">
            <label htmlFor="ticket" className="text-[12.5px] font-semibold text-white">
              Ticket promedio
            </label>
            <span className="mono text-[13px] text-racing-400">{formatUSD(ticket)}</span>
          </div>
          <input
            id="ticket"
            type="range"
            min={1}
            max={20}
            step={0.5}
            value={ticket}
            onChange={(e) => setTicket(Number(e.target.value))}
            className="range mt-3 w-full"
            style={{ "--pct": `${((ticket - 1) / 19) * 100}%` } as React.CSSProperties}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LAUNCH_SERVICES.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setTicket(s.minFareUSD)}
                aria-pressed={ticket === s.minFareUSD}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                  ticket === s.minFareUSD
                    ? "border-brand-500 bg-brand-500/12 text-white"
                    : "border-white/10 text-ink-400 hover:border-white/25 hover:text-white"
                }`}
              >
                {s.name} · {formatUSD(s.minFareUSD)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-ink-500">Toca el mínimo de tu servicio o ajusta tu ticket promedio.</p>
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">Te queda a la semana, después de la comisión</p>
            <Money usd={weeklyNet} size="lg" className="mt-1" />
          </div>
          <span className="text-right text-[11.5px] text-ink-500">
            {trips} viajes / semana · {formatUSD(weeklyGross)} facturados
            <span className="mt-0.5 block text-[10.5px] text-ink-600">≈ {formatUSD(monthlyNet)} al mes al mismo ritmo</span>
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-white">
              <Percent className="h-3.5 w-3.5 text-brand-400" /> Comisión · 10% por carrera
            </p>
            <p className="mono mt-1 text-[15px] font-semibold text-white">-{formatUSD(weeklyCommission)}</p>
            <p className="text-[10px] text-ink-500">
              por semana · {formatUSD(commissionPerTrip)} por viaje, desde tu saldo prepago
            </p>
          </div>

          <div className="rounded-lg border border-brand-500/40 bg-brand-500/[0.08] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-white">
              <Wallet className="h-3.5 w-3.5 text-brand-400" /> Recarga sugerida
            </p>
            <p className="mono mt-1 text-[15px] font-semibold text-white">{formatUSD(suggestedPack.amount)}</p>
            <p className="text-[10px] text-ink-500">
              Cubre ~{coverageWeeks} semanas de comisión a este ritmo
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-racing-500/20 bg-racing-500/[0.05] px-3 py-2.5">
          <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
          <p className="text-[11.5px] leading-relaxed text-ink-200">
            No se cobra al aceptar: la comisión se reserva y se descuenta al completar cada viaje, con recibo. El saldo
            de bienvenida de {formatUSD(PILOT_RULES.welcomeUSD)} cubre unos{" "}
            <strong className="text-white">{welcomeTrips} viajes</strong> a este ticket. Sin mensualidad.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10.5px] text-ink-500">
          <span className="rounded-lg border border-white/8 px-2.5 py-2">Saldo mínimo para operar: {formatUSD(PILOT_RULES.minBalanceUSD)}</span>
          <span className="rounded-lg border border-white/8 px-2.5 py-2">Comisión mínima: {formatUSD(PILOT_RULES.minCommissionUSD)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button full onClick={() => openModal({ type: "driver" })} className="sm:flex-1">
            Registrarme <ArrowRight className="h-4 w-4" />
          </Button>
          <Button full variant="secondary" to="/conductores/planes#billetera" className="sm:w-auto">
            Probar la billetera
          </Button>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-500">
          Proyección de demostración: no incluye propinas, recargos, impuestos ni días sin conexión. No representa una
          oferta de ingresos garantizados.
        </p>
        <Badge tone="success" className="mt-3">
          Sin cuota mensual
        </Badge>
      </div>
    </div>
  );
}
