import { useState } from "react";
import { ArrowRight, Calculator, Clock, MapPin, Route } from "lucide-react";
import { Button, Money, RateNote, ServiceIcon } from "./ui";
import { SERVICES, getService } from "../data/services";
import { estimateFare, formatKm, formatUSD } from "../lib/format";

export function FareEstimator({
  initialService = "taxi-pana",
  onPrimary,
  primaryLabel = "Pedir en la app",
  compact = false,
}: {
  initialService?: string;
  onPrimary?: () => void;
  primaryLabel?: string;
  compact?: boolean;
}) {
  const [slug, setSlug] = useState(initialService);
  const [km, setKm] = useState(8);
  const service = getService(slug) ?? SERVICES[0];
  const fare = estimateFare(service.fromUSD, service.perKmUSD, km);
  const speed = service.icon === "bus" || service.icon === "van" ? 0.85 : service.icon === "bike" ? 0.42 : 0.34;
  const minutes = Math.max(5, Math.round(km / speed));
  const pct = ((km - 1) / 59) * 100;

  return (
    <div className={`card overflow-hidden ${compact ? "" : "p-5 sm:p-6"}`}>
      <div className={`flex items-center justify-between gap-3 ${compact ? "px-5 pt-5" : ""}`}>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-400" />
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">Calculadora de viaje</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          Referencial
        </span>
      </div>

      <div className={`${compact ? "px-5" : ""} mt-4`}>
        <div className="flex flex-wrap gap-1.5">
          {SERVICES.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setSlug(s.slug)}
              aria-pressed={slug === s.slug}
              className={`flex min-h-[42px] items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition ${
                slug === s.slug
                  ? "border-brand-500 bg-brand-500/15 text-white"
                  : "border-white/12 bg-white/[0.025] text-ink-300 hover:border-white/25 hover:text-white"
              }`}
            >
              <ServiceIcon icon={s.icon} className="h-4 w-4" />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className={`${compact ? "px-5" : ""} mt-5`}>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="fare-distance" className="text-[13px] font-semibold text-white">
            Distancia del recorrido
          </label>
          <span className="mono text-[15px] font-semibold text-racing-400">{formatKm(km)}</span>
        </div>
        <input
          id="fare-distance"
          type="range"
          min={1}
          max={60}
          step={1}
          value={km}
          onChange={(e) => setKm(Number(e.target.value))}
          className="range mt-3 w-full"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-500">
          <span>1 km</span>
          <span>30 km</span>
          <span>60 km</span>
        </div>
      </div>

      <div className={`${compact ? "mx-5 mb-5" : ""} mt-5 rounded-xl border border-white/10 bg-ink-950/60 p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">Estimado para {formatKm(km)}</p>
            <Money usd={fare} size="lg" className="mt-1" />
          </div>
          <div className="flex flex-col items-end gap-1 text-[11.5px] text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> ~{minutes} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {service.capacity}
            </span>
          </div>
        </div>
        <div className="mt-3 grid gap-1 border-t border-white/8 pt-3 text-[12px] text-ink-400">
          <div className="flex justify-between">
            <span>Tarifa base</span>
            <span className="mono">{formatUSD(service.fromUSD)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              Distancia ({formatKm(km)} × ${service.perKmUSD.toFixed(2)})
            </span>
            <span className="mono">{formatUSD(service.perKmUSD * km)}</span>
          </div>
        </div>
      </div>

      <div className={`${compact ? "px-5 pb-5" : ""} mt-4 flex flex-col gap-2 sm:flex-row`}>
        <Button full onClick={onPrimary} className="sm:flex-1">
          {primaryLabel} <ArrowRight className="h-4 w-4" />
        </Button>
        <Button full variant="secondary" to="/tarifas" className="sm:w-auto">
          <Route className="h-4 w-4" /> Ver todas las tarifas
        </Button>
      </div>

      <div className={`${compact ? "px-5 pb-5" : ""} mt-3`}>
        <RateNote />
      </div>
    </div>
  );
}
