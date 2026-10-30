import { useId, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, DemoNote } from "../ui";

function useFieldIds(id: string | undefined, hint: string | undefined, error: string | undefined) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy =
    [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null].filter(Boolean).join(" ") || undefined;
  return { fieldId, describedBy };
}

function FieldMessage({
  fieldId,
  hint,
  error,
}: {
  fieldId: string;
  hint?: string;
  error?: string;
}) {
  if (error) {
    return (
      <span id={`${fieldId}-error`} className="mt-1.5 block text-[11.5px] leading-snug text-red-300">
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span id={`${fieldId}-hint`} className="mt-1.5 block text-[11.5px] leading-snug text-ink-500">
        {hint}
      </span>
    );
  }
  return null;
}

export function TextField({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div>
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field ${error ? "border-red-500/60 focus:border-red-400" : ""} ${className}`}
        {...props}
      />
      <FieldMessage fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string }) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div>
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field appearance-none ${error ? "border-red-500/60 focus:border-red-400" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      <FieldMessage fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div>
      <label htmlFor={fieldId} className="label">
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field min-h-[92px] resize-y ${error ? "border-red-500/60 focus:border-red-400" : ""} ${className}`}
        {...props}
      />
      <FieldMessage fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-[11.5px] leading-snug text-red-300">
      {children}
    </p>
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
