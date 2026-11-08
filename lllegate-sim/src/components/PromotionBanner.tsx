import { Link } from "react-router-dom";
import { MapPin, Truck, Wallet } from "lucide-react";

type Promotion = {
  type: "convenio" | "peaje" | "referido";
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
};

export const PROMOTIONS: Promotion[] = [
  {
    type: "convenio",
    title: "Convenio Duncan",
    description: "Compra en Duncan y aplica tu descuento en la app.",
    actionLabel: "Ver convivencia",
    actionPath: "/convenios/duncan",
  },
  {
    type: "convenio",
    title: "Keeway San José",
    description: "Repuestos originales con descuento especial.",
    actionLabel: "Ver Keeway",
    actionPath: "/convenios/keeway",
  },
  {
    type: "peaje",
    title: "Peajes ARC",
    description: "Pago de peajes en línea para EVs con tarjeta ".concat("Llégate."),
    actionLabel: "Cargar tarjeta",
    actionPath: "/peajes/arc",
  },
  {
    type: "referido",
    title: "Programa de referidos",
    description: "Invita a un pana y recibe Bs. por cada viaje.",
    actionLabel: "Invitar un pana",
    actionPath: "/referidos",
  },
];

const icons = {
  convenio: MapPin,
  peaje: Truck,
  referido: Wallet,
};

export function PromotionBanner({ promo }: { promo: Promotion }) {
  const Icon = icons[promo.type];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-asphalt-900/60 p-5 transition hover:border-brand-500/40">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/5 blur-2xl" aria-hidden="true" />
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">{promo.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{promo.description}</p>
          <Link
            to={promo.actionPath}
            className="mt-3 inline-flex items-center gap-1.5 font-semibold text-brand-400 transition hover:text-brand-300"
          >
            {promo.actionLabel}
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
