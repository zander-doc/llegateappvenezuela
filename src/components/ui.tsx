import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  Bus,
  Car,
  Check,
  ChevronDown,
  Crown,
  Download,
  Package,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { DEMO_BCV_RATE, formatBs, formatUSD } from "../lib/format";
import { Reveal } from "./Motion";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "yellow";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-heading font-bold tracking-tight transition-all duration-200 select-none disabled:opacity-45 disabled:pointer-events-none [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-asphalt-950 shadow-[0_10px_30px_-10px_rgba(255,107,0,0.7)] hover:bg-brand-400 hover:shadow-[0_0_25px_rgba(255,107,0,0.35)] hover:scale-[1.02] active:scale-[0.98] active:bg-brand-600",
  secondary:
    "border border-asphalt-700 bg-asphalt-900 text-ink-200 hover:border-brand-500/50 hover:bg-asphalt-850 hover:text-white",
  ghost: "text-ink-200 hover:text-white hover:bg-white/[0.06]",
  dark: "bg-asphalt-950 text-white border border-asphalt-700 hover:border-brand-500/60",
  yellow: "bg-racing-500 text-asphalt-950 hover:bg-racing-400 hover:scale-[1.02] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[40px] px-4 text-[13.5px]",
  md: "min-h-[48px] px-5 text-[15px]",
  lg: "min-h-[54px] px-7 text-[16px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  to?: string;
  href?: string;
  full?: boolean;
  className?: string;
  children: ReactNode;
  [key: string]: any;
}

export function Button({
  variant = "primary",
  size = "md",
  to,
  href,
  full = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls = buttonClass(variant, size, `${full ? "w-full" : ""} ${className}`);
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400 ${className}`}>
      <span className="stripe-mark" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHead({
  kicker,
  title,
  text,
  align = "left",
  action,
}: {
  kicker?: string;
  title: ReactNode;
  text?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-5 ${
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={`max-w-2xl ${align === "center" ? "mx-auto" : ""}`}>
        {kicker && <Eyebrow className={align === "center" ? "justify-center" : ""}>{kicker}</Eyebrow>}
        <h2 className="heading mt-3 text-3xl font-bold text-white sm:text-4xl">{title}</h2>
        {text && <p className="mt-3 text-[16px] leading-relaxed text-ink-300">{text}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "yellow" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/12 bg-white/[0.05] text-ink-200",
    brand: "border-brand-500/40 bg-brand-500/15 text-brand-400",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    yellow: "border-racing-500/30 bg-racing-500/10 text-racing-400",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function CheckList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-200">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 text-left text-[15.5px] font-semibold text-white transition hover:bg-white/[0.03] sm:px-6">
            {item.q}
            <ChevronDown className="h-4.5 w-4.5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 text-[14.5px] leading-relaxed text-ink-300 sm:px-6">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

export function Money({
  usd,
  size = "md",
  showBoth = true,
  className = "",
}: {
  usd: number;
  size?: "sm" | "md" | "lg";
  showBoth?: boolean;
  className?: string;
}) {
  const sizeCls = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`mono ${sizeCls} font-semibold text-white`}>{formatUSD(usd)}</span>
      {showBoth && (
        <span className="text-[12.5px] text-ink-400">
          ≈ {formatBs(usd)}
          <span className="ml-1 text-ink-500">· BCV demo</span>
        </span>
      )}
    </span>
  );
}

export function RateNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-relaxed text-ink-400 ${className}`}>
      Conversión de demostración a la tasa BCV de {DEMO_BCV_RATE.toLocaleString("es-VE", {
        minimumFractionDigits: 2,
      })} Bs/USD. En la app se usa una sola tasa oficial, actualizada a diario.
    </p>
  );
}

const serviceIcons = {
  bike: Bike,
  car: Car,
  van: Car,
  bus: Bus,
  package: Package,
  truck: Truck,
};

export function ServiceIcon({
  icon,
  className = "h-6 w-6",
}: {
  icon: keyof typeof serviceIcons;
  className?: string;
}) {
  const Icon = serviceIcons[icon] ?? Car;
  return <Icon className={className} strokeWidth={1.8} />;
}

export function PageHero({
  kicker,
  title,
  description,
  crumbs = [],
  actions,
  aside,
  compact = false,
}: {
  kicker: string;
  title: ReactNode;
  description: ReactNode;
  crumbs?: { label: string; to: string }[];
  actions?: ReactNode;
  aside?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="asphalt relative overflow-hidden border-b border-white/8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] stripes-h opacity-80" aria-hidden="true" />
      <div className="wrap relative py-10 sm:py-14 lg:py-16">
        <nav aria-label="Migas de pan" className="mb-6 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-400">
          <Link to="/" className="inline-flex min-h-[28px] items-center transition hover:text-white">
            Inicio
          </Link>
          {crumbs.map((c) => (
            <span key={c.to} className="flex items-center gap-1.5">
              <span className="text-ink-600">/</span>
              <Link to={c.to} className="inline-flex min-h-[28px] items-center transition hover:text-white">
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
        <Reveal className={`grid items-end gap-10 ${aside ? "lg:grid-cols-[1.35fr_1fr]" : ""}`}>
          <div>
            <Eyebrow>{kicker}</Eyebrow>
            <h1
              className={`display mt-4 text-white ${
                compact ? "text-[46px] sm:text-[60px]" : "text-[54px] sm:text-[72px] lg:text-[84px]"
              }`}
            >
              {title}
            </h1>
            <div className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-300 sm:text-[17px]">{description}</div>
            {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
          </div>
          {aside && <div>{aside}</div>}
        </Reveal>
      </div>
    </section>
  );
}

export function IconTile({
  icon,
  className = "",
}: {
  icon: "shield" | "building" | "wrench" | "crown" | "download";
  className?: string;
}) {
  const map = { shield: ShieldCheck, building: Building2, wrench: Wrench, crown: Crown, download: Download };
  const Icon = map[icon];
  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400 ${className}`}>
      <Icon className="h-5 w-5" strokeWidth={1.9} />
    </span>
  );
}

export function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-brand-400 transition hover:text-brand-300"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-racing-500/20 bg-racing-500/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-300">
      <span className="font-semibold text-racing-400">Simulación:</span>{" "}
      {children ?? "los formularios no envían datos reales ni se conectan a un servicio en producción."}
    </p>
  );
}

export function TableHint({ children = "Desliza la tabla para ver todas las columnas" }: { children?: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-500 sm:hidden">
      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
