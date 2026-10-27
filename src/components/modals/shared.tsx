import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, DemoNote } from "../ui";

export function TextField({
  label,
  hint,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className={`field ${className}`} {...props} />
      {hint && <span className="mt-1.5 block text-[11.5px] text-ink-500">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className={`field appearance-none ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className={`field min-h-[92px] resize-y ${className}`} {...props} />
    </label>
  );
}

export function OptionCard({
  active,
  onClick,
  title,
  subtitle,
  icon,
  compact = false,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex rounded-xl border transition ${
        compact
          ? "min-h-[72px] flex-col items-center justify-center gap-1.5 p-2 text-center"
          : "min-h-[64px] items-center gap-3 p-3 text-left"
      } ${
        active
          ? "border-brand-500 bg-brand-500/12 shadow-[0_0_0_1px_rgba(255,107,0,0.35)]"
          : "border-white/12 bg-white/[0.025] hover:border-white/25"
      } ${className}`}
    >
      {icon && (
        <span
          className={`flex shrink-0 items-center justify-center rounded-lg ${
            compact ? "h-8 w-8" : "h-9 w-9"
          } ${active ? "bg-brand-500/20 text-brand-300" : "bg-white/[0.05] text-ink-300"}`}
        >
          {icon}
        </span>
      )}
      <span className={compact ? "min-w-0 text-center" : "min-w-0"}>
        <span className={`block font-semibold text-white ${compact ? "text-[12.5px] leading-tight" : "text-[13.5px]"}`}>
          {title}
        </span>
        {subtitle && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-400">{subtitle}</span>}
      </span>
      {!compact && (
        <span
          className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-brand-500 bg-brand-500 text-white" : "border-white/25"
          }`}
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
      )}
    </button>
  );
}

export function FormSuccess({
  title,
  text,
  actions,
  note,
}: {
  title: string;
  text: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="animate-pop py-2 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
      </div>
      <h3 className="heading mt-4 text-[20px] font-bold text-white">{title}</h3>
      <div className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-300">{text}</div>
      {actions && <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>}
      <div className="mt-5 text-left">
        {note ?? <DemoNote>este resultado solo se guarda en tu navegador. No se envió ningún dato.</DemoNote>}
      </div>
    </div>
  );
}

export function saveDemoLead(key: string, payload: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list.slice(-25)));
  } catch {
    /* almacenamiento no disponible: la simulación sigue funcionando */
  }
}

export function FormActions({
  onBack,
  backLabel = "Atrás",
  children,
}: {
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">{children}</div>
    </div>
  );
}
