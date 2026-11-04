import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, MessageCircle } from "lucide-react";
import { Badge, Button } from "./ui";
import { useUI } from "../lib/ui";
import type { Vendor } from "../data/vendors";

export function VendorCard({ vendor }: { vendor: Vendor }) {
  const { openModal } = useUI();

  return (
    <article className="card card-hover flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="brand">{vendor.category}</Badge>
        {vendor.verified && (
          <Badge tone="success">
            <BadgeCheck className="h-3 w-3" /> Verificado
          </Badge>
        )}
        {vendor.sponsored && <Badge tone="yellow">Patrocinado</Badge>}
      </div>

      <h3 className="heading mt-3 text-[18px] font-bold text-white">
        <Link to={`/mercado/negocio/${vendor.slug}`} className="hover:text-brand-300">
          {vendor.name}
        </Link>
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-400">
        <MapPin className="h-3.5 w-3.5 text-brand-400" /> {vendor.zone}, {vendor.city}
      </p>

      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-300">{vendor.offer}</p>

      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
        <span className="text-[12px] text-ink-400">
          <span className="mono text-[14px] font-semibold text-white">{vendor.priceLabel}</span>
        </span>
        <div className="flex gap-1.5">
          <Link
            to={`/mercado/negocio/${vendor.slug}`}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-ink-200 transition hover:bg-white/[0.06] hover:text-white"
          >
            Ver ficha <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-[44px] px-3 text-[12.5px]"
            onClick={() => openModal({ type: "vendor", vendorSlug: vendor.slug })}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Contactar
          </Button>
        </div>
      </div>
    </article>
  );
}
