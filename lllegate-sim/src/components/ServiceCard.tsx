import { Link } from "react-router-dom";
import { ArrowUpRight, Clock, Users } from "lucide-react";
import { Badge, ServiceIcon } from "./ui";
import { formatUSD } from "../lib/format";
import type { Service } from "../data/services";

export function ServiceCard({ service, index }: { service: Service; index?: number }) {
  return (
    <Link
      to={`/servicios/${service.slug}`}
      className="card card-hover group relative flex h-full flex-col overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/[0.06] blur-2xl transition group-hover:bg-brand-500/[0.14]" />
      <div className="relative flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
          <ServiceIcon icon={service.icon} className="h-6 w-6" />
        </span>
        {service.status === "upcoming" ? (
          <Badge tone="yellow">Próximamente · {service.phase}</Badge>
        ) : (
          index !== undefined && <span className="mono text-[11px] font-medium text-ink-600">0{index + 1}</span>
        )}
      </div>

      <h3 className="heading relative mt-4 text-[20px] font-bold text-white">{service.name}</h3>
      <p className="relative mt-1.5 text-[13.5px] leading-snug text-ink-300">{service.short}</p>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {service.eta}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {service.capacity}
        </span>
      </div>

      <div className="relative mt-auto flex items-end justify-between border-t border-white/8 pt-4">
        <span className="text-[11.5px] text-ink-400">
          {service.status === "launch" ? "Desde" : "Ref."}{" "}
          <span className="mono ml-1 text-[15px] font-semibold text-white">{formatUSD(service.minFareUSD)}</span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-ink-300 transition group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-asphalt-950">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
