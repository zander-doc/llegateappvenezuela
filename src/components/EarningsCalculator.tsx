import { useState } from "react";
import { ArrowRight, Calculator, Percent, TrendingUp } from "lucide-react";
import { Badge, Button, Money } from "./ui";
import { useUI } from "../lib/ui";

export function EarningsCalculator() {
  const { openModal } = useUI();
  const [trips, setTrips] = useState(30);
  const [ticket, setTicket] = useState(5);

  const monthlyTrips = trips * 4.33;
  const gross = monthlyTrips * ticket;
  const commission = gross * 0.1;
  const proCost = 12;
  const proNet = gross - proCost;
  const payNet = gross - commission;
  const saving = commission - proCost;
  const recommendPro = saving > 0;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-400" />
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">Calculadora de ganancias</p>
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
            <span className="mono text-[13px] text-racing-400">${ticket}</span>
          </div>
          <input
            id="ticket"
            type="range"
            min={2}
            max={30}
            step={1}
            value={ticket}
            onChange={(e) => setTicket(Number(e.target.value))}
            className="range mt-3 w-full"
            style={{ "--pct": `${((ticket - 2) / 28) * 100}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="border-t border-white/8 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">Facturación estimada al mes</p>
            <Money usd={gross} size="lg" className="mt-1" />
          </div>
          <span className="text-[11.5px] text-ink-500">{Math.round(monthlyTrips)} viajes / mes</span>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <div>
              <p className="text-[12.5px] font-medium text-white">Pago por viaje · 10%</p>
              <p className="text-[10.5px] text-ink-500">Sin cuota mensual</p>
            </div>
            <div className="text-right">
              <p className="mono text-[14px] font-semibold text-ink-100">{formatMoney(payNet)}</p>
              <p className="text-[10px] text-ink-500">comisión {formatMoney(commission)}</p>
            </div>
          </div>

          <div
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
              recommendPro ? "border-brand-500/45 bg-brand-500/[0.08]" : "border-white/8 bg-white/[0.02]"
            }`}
          >
            <div>
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-white">
                Pro Mensual · 0% <Badge tone={recommendPro ? "brand" : "neutral"}>$12/mes</Badge>
              </p>
              <p className="text-[10.5px] text-ink-500">Sin comisión por viaje</p>
            </div>
            <div className="text-right">
              <p className="mono text-[14px] font-semibold text-white">{formatMoney(proNet)}</p>
              <p className="text-[10px] text-ink-500">plan {formatMoney(proCost)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-racing-500/20 bg-racing-500/[0.05] px-3 py-2.5">
          {recommendPro ? (
            <>
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
              <p className="text-[11.5px] leading-relaxed text-ink-200">
                Con <strong className="text-white">Pro Mensual</strong> te quedas con{" "}
                <strong className="mono text-racing-400">{formatMoney(saving)}</strong> más al mes que pagando 10% por
                viaje.
              </p>
            </>
          ) : (
            <>
              <Percent className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
              <p className="text-[11.5px] leading-relaxed text-ink-200">
                Con este volumen, el <strong className="text-white">pago por viaje</strong> cuesta menos que un plan.
                Empieza así y cámbiate cuando aumentes tus viajes.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button full onClick={() => openModal({ type: "driver" })} className="sm:flex-1">
            Registrarme <ArrowRight className="h-4 w-4" />
          </Button>
          <Button full variant="secondary" to="/conductores/planes" className="sm:w-auto">
            Comparar planes
          </Button>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-500">
          Proyección de demostración: no incluye propinas, recargos, impuestos ni días sin conexión. No representa una
          oferta de ingresos garantizados.
        </p>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-VE", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}
