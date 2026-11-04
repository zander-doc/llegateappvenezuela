import { useState } from "react";
import { ArrowDownUp, ArrowRight, Info, Wallet } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { DEMO_BCV_RATE, formatBs, formatRate, formatUSD } from "../../lib/format";

export function BcvModal({ onClose }: { onClose: () => void }) {
  const [direction, setDirection] = useState<"usd" | "bs">("usd");
  const [raw, setRaw] = useState("10");

  const numeric = Number.parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
  const usd = direction === "usd" ? numeric : numeric / DEMO_BCV_RATE;

  return (
    <Modal
      onClose={onClose}
      title="Tasa BCV y conversión"
      subtitle="Una sola tasa oficial para la web, la app y el recibo del viaje."
      eyebrow="Pagos"
      size="sm"
    >
      <div className="rounded-2xl border border-racing-500/25 bg-racing-500/[0.06] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-300">
            <Wallet className="h-3.5 w-3.5 text-racing-500" />
            Tasa BCV
          </span>
          <span className="rounded-full border border-racing-500/30 bg-racing-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-racing-400">
            Demo
          </span>
        </div>
        <p className="mono mt-2 text-[34px] font-semibold leading-none text-white">
          {formatRate(DEMO_BCV_RATE)} <span className="text-[15px] font-normal text-ink-300">Bs / USD</span>
        </p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
          Valor fijo de demostración. En producción se toma de la fuente oficial y se actualiza a diario.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="label mb-0">Convertir</span>
        <button
          type="button"
          onClick={() => setDirection(direction === "usd" ? "bs" : "usd")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1 text-[11.5px] font-semibold text-ink-200 transition hover:border-brand-400/50 hover:text-white"
        >
          <ArrowDownUp className="h-3 w-3 text-brand-400" />
          {direction === "usd" ? "USD → Bs" : "Bs → USD"}
        </button>
      </div>

      <div className="mt-2 grid gap-3">
        <label className="block">
          <span className="sr-only">Monto a convertir</span>
          <div className="relative">
            <span className="mono pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-400">
              {direction === "usd" ? "$" : "Bs."}
            </span>
            <input
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="field mono pl-11 text-[20px]"
              placeholder="0,00"
              aria-label="Monto a convertir"
            />
          </div>
        </label>

        <div className="rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-ink-500">Equivale a</p>
          <p className="mono mt-1 text-[24px] font-semibold text-white">
            {direction === "usd" ? formatBs(usd) : formatUSD(usd)}
          </p>
          <p className="mt-0.5 text-[11.5px] text-ink-400">
            {direction === "usd"
              ? `Con la tasa de ${formatRate(DEMO_BCV_RATE)} Bs/USD`
              : `Calculado con la tasa de ${formatRate(DEMO_BCV_RATE)} Bs/USD`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[1, 5, 10, 20, 50].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setDirection("usd");
              setRaw(String(amount));
            }}
            className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-ink-200 transition hover:border-brand-400/50 hover:text-white"
          >
            ${amount}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11.5px] leading-relaxed text-ink-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
        <span>
          El monto del viaje se confirma antes de pedir. En el recibo verás el precio en dólares, la tasa aplicada y
          el total en bolívares.
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" to="/tarifas" onClick={onClose}>
          Ver tarifas
        </Button>
        <Button to="/ayuda" onClick={onClose}>
          Cómo pagar <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Modal>
  );
}
