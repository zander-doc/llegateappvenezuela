import { Check } from "lucide-react";
import { Badge, Button, Money } from "./ui";
import { useUI } from "../lib/ui";
import type { Plan } from "../data/plans";

export function PlanCard({ plan, compact = false }: { plan: Plan; compact?: boolean }) {
  const { openModal } = useUI();

  return (
    <article
      className={`card relative flex h-full flex-col p-5 ${
        plan.highlight
          ? "border-brand-500/45 bg-[linear-gradient(165deg,rgba(255,107,0,0.12),rgba(255,255,255,0.02))]"
          : ""
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-2.5 left-5">
          <Badge tone={plan.highlight ? "brand" : "yellow"}>{plan.badge}</Badge>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="heading text-[18px] font-bold text-white">{plan.name}</h3>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-400">{plan.tagline}</p>
        </div>
      </div>

      <div className="mt-4">
        <span className="mono text-[32px] font-semibold leading-none text-white">
          ${plan.priceUSD.toFixed(2)}
        </span>
        <span className="ml-1 text-[12px] text-ink-400">/ {plan.period}</span>
        <div className="mt-1">
          <Money usd={plan.priceUSD} size="sm" showBoth className="text-[11.5px]" />
        </div>
      </div>

      <ul className="mt-4 grid flex-1 gap-2 border-t border-white/8 pt-4">
        {plan.features.slice(0, compact ? 4 : 6).map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-200">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} />
            {f}
          </li>
        ))}
      </ul>

      <Button
        className="mt-5 w-full"
        variant={plan.highlight ? "primary" : "secondary"}
        onClick={() => openModal({ type: "plan", planId: plan.id })}
      >
        Elegir {plan.name}
      </Button>
    </article>
  );
}
