import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Badge, Button, DemoNote } from "../components/ui";
import { Reveal } from "../components/Motion";
import { saveDemoLead } from "../components/modals/shared";
import { HUBS } from "../data/site";

type FieldKey = "name" | "email" | "phone" | "idCard" | "city" | "password" | "confirm" | "consent";
type Errors = Partial<Record<FieldKey, string>>;

type FormValues = {
  name: string;
  email: string;
  phone: string;
  idCard: string;
  city: string;
  password: string;
  confirm: string;
  consent: boolean;
  newsletter: boolean;
};

const FIELD_ORDER: FieldKey[] = ["name", "email", "phone", "idCard", "password", "confirm", "city", "consent"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{3,}$/;

function validate(field: FieldKey, form: FormValues): string | undefined {
  switch (field) {
    case "name": {
      const value = form.name.trim();
      if (!value) return "Escribe tu nombre y apellido.";
      if (!NAME_RE.test(value)) return "Usa al menos 3 caracteres y evita números o símbolos.";
      return undefined;
    }
    case "email":
      if (!form.email.trim()) return "Escribe tu correo electrónico.";
      if (!EMAIL_RE.test(form.email.trim())) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
      return undefined;
    case "phone": {
      const digits = form.phone.replace(/\D/g, "");
      if (!digits) return "Escribe tu número de teléfono.";
      if (!/^(0\d{10}|58\d{10}|\d{10})$/.test(digits)) {
        return "Escribe un número venezolano, por ejemplo 0414 1234567.";
      }
      return undefined;
    }
    case "idCard": {
      const value = form.idCard.trim().replace(/[-.\s]/g, "").toUpperCase();
      if (!value) return "Escribe tu cédula de identidad.";
      if (!/^[VE]\d{6,9}$/.test(value)) return "Usa el formato V-12345678 o E-12345678.";
      return undefined;
    }
    case "city":
      if (!form.city) return "Elige la ciudad donde vas a usar Llégate.";
      return undefined;
    case "password":
      if (!form.password) return "Crea una contraseña.";
      if (form.password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
      if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
        return "Incluye al menos una letra y un número.";
      }
      return undefined;
    case "confirm":
      if (!form.confirm) return "Repite tu contraseña.";
      if (form.confirm !== form.password) return "Las contraseñas no coinciden.";
      return undefined;
    case "consent":
      if (!form.consent) return "Acepta los términos y la política de privacidad para continuar.";
      return undefined;
  }
}

function validateAll(form: FormValues): Errors {
  const next: Errors = {};
  for (const field of FIELD_ORDER) {
    const message = validate(field, form);
    if (message) next[field] = message;
  }
  return next;
}

function passwordScore(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
  return score;
}

const strengthMeta = [
  { label: "Muy débil", bar: "bg-red-500", text: "text-red-300" },
  { label: "Débil", bar: "bg-racing-500", text: "text-racing-400" },
  { label: "Media", bar: "bg-brand-500", text: "text-brand-400" },
  { label: "Fuerte", bar: "bg-emerald-400", text: "text-emerald-400" },
] as const;

function Field({
  label,
  icon: Icon,
  error,
  hint,
  valid,
  action,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ComponentType<{ className?: string }>;
  error?: string;
  hint?: string;
  valid?: boolean;
  action?: ReactNode;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          id={id}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`field pl-10 ${action ? "pr-12" : valid ? "pr-10" : ""} ${
            error ? "border-red-500/60 focus:border-red-400" : ""
          } ${className}`}
          {...props}
        />
        {valid && !action && (
          <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
        )}
        {action && <span className="absolute right-1 top-1/2 -translate-y-1/2">{action}</span>}
      </div>
      {error ? (
        <span id={`${id}-error`} className="mt-1.5 block text-[11.5px] leading-snug text-red-300">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1.5 block text-[11.5px] leading-snug text-ink-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function PasswordButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-400 transition hover:text-white"
    >
      {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
    </button>
  );
}

function FormSection({
  n,
  title,
  hint,
  children,
}: {
  n: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 border-t border-white/8 pt-6">
      <div className="flex items-start gap-3">
        <span className="mono mt-0.5 text-[11px] font-bold tracking-[0.12em] text-brand-400">{n}</span>
        <div>
          <h2 className="heading text-[16px] font-bold text-white">{title}</h2>
          {hint && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{hint}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CuentaRegistroPage() {
  const [form, setForm] = useState<FormValues>({
    name: "",
    email: "",
    phone: "",
    idCard: "",
    city: HUBS[0].city,
    password: "",
    confirm: "",
    consent: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const idCardId = useId();
  const cityId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const consentId = useId();

  useEffect(() => {
    if (done) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [done]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setErrors((prev) => {
      if (!prev[key as FieldKey] && !(key === "password" && prev.confirm)) return prev;
      const nextErrors = { ...prev };
      if (prev[key as FieldKey]) {
        const message = validate(key as FieldKey, next);
        if (message) nextErrors[key as FieldKey] = message;
        else delete nextErrors[key as FieldKey];
      }
      if (key === "password" && prev.confirm) {
        const message = validate("confirm", next);
        if (message) nextErrors.confirm = message;
        else delete nextErrors.confirm;
      }
      return nextErrors;
    });
  }

  function handleBlur(field: FieldKey) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => {
      const next = { ...prev };
      const message = validate(field, form);
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function valid(field: FieldKey) {
    if (!touched[field] || errors[field]) return false;
    return field === "consent" ? form.consent : Boolean(form[field]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateAll(form);
    setTouched(
      FIELD_ORDER.reduce<Partial<Record<FieldKey, boolean>>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {})
    );
    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      setSubmitError("Revisa los campos marcados antes de crear tu cuenta.");
      const ids: Record<FieldKey, string> = {
        name: nameId,
        email: emailId,
        phone: phoneId,
        idCard: idCardId,
        city: cityId,
        password: passwordId,
        confirm: confirmId,
        consent: consentId,
      };
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }

    setSubmitError("");
    setLoading(true);
    window.setTimeout(() => {
      saveDemoLead("llegate_sim_waitlist", {
        intent: "register",
        name: form.name.trim(),
        contact: form.email.trim(),
        city: form.city,
      });
      setLoading(false);
      setDone(true);
    }, 900);
  }

  const score = passwordScore(form.password);
  const strength = strengthMeta[score];
  const firstName = form.name.trim().split(/\s+/)[0] ?? "";

  return (
    <section className="asphalt relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-32 top-[-10%] h-[420px] w-[420px] rounded-full bg-brand-500/[0.08] blur-3xl"
        aria-hidden="true"
      />
      <div className="wrap relative py-8 lg:py-12">
        <Reveal>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/ingresar"
              className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-ink-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a ingresar
            </Link>
            <span className="mono text-[11px] uppercase tracking-[0.14em] text-ink-500">Registro · 3 minutos</span>
          </div>
        </Reveal>

        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-10">
          <Reveal className="hidden lg:block lg:self-stretch">
            <aside className="relative overflow-hidden rounded-2xl border border-asphalt-800 bg-asphalt-900/80 p-8 lg:sticky lg:top-[116px]">
              <div className="flex items-center justify-between">
                <Badge tone="brand" className="uppercase tracking-[0.14em]">
                  <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" aria-hidden="true" />
                  Cuenta de pasajero
                </Badge>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Gratis</span>
              </div>

              <div className="mt-14 max-w-md">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">Únete a Llégate</p>
                <h2 className="heading mt-4 text-[52px] font-black uppercase leading-[0.95] tracking-tight text-white">
                  Tu cuenta,
                  <br />
                  lista en
                  <br />
                  <span className="italic text-brand-500">minutos.</span>
                </h2>
                <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-300">
                  Registra tus datos una vez y pide moto, carro, minivan o delivery sin volver a escribir direcciones.
                </p>
              </div>

              <ol className="mt-9 grid gap-4">
                {[
                  { n: "01", title: "Completa tus datos", text: "Nombre, contacto y ciudad en un solo paso." },
                  { n: "02", title: "Protege tu cuenta", text: "Creas tu contraseña y aceptas las condiciones." },
                  { n: "03", title: "Empieza a moverte", text: "Elige tu servicio y pide tu primer viaje." },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-[11px] font-bold text-brand-400">
                      {step.n}
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-semibold text-white">{step.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-400">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-9 rounded-2xl border border-asphalt-800 bg-asphalt-950/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">Incluido en tu cuenta</p>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {[
                    { icon: Wallet, label: "Pago en Bs y USD" },
                    { icon: MapPin, label: "Direcciones guardadas" },
                    { icon: ShieldCheck, label: "Ruta compartida" },
                    { icon: Smartphone, label: "Soporte desde la app" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-[12px] text-ink-300">
                      <item.icon className="h-4 w-4 shrink-0 text-brand-400" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 h-[3px] w-full stripes-h rounded-full opacity-70" aria-hidden="true" />
            </aside>
          </Reveal>

          <Reveal delay={0.08}>
            <div ref={cardRef} className="card scroll-mt-28 overflow-hidden p-5 sm:p-7 lg:p-8">
              {done ? (
                <div className="animate-pop py-4 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/15 text-brand-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </span>
                  <Badge tone="brand" className="mt-5 uppercase tracking-[0.14em]">
                    <Sparkles className="h-3 w-3" /> Cuenta de demostración
                  </Badge>
                  <h1 className="heading mt-4 text-[26px] font-extrabold text-white sm:text-[30px]">
                    Lista, {firstName}.
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-300">
                    Guardamos solo tu nombre, correo y ciudad en este navegador para la demo. No se creó una cuenta
                    real ni se envió nada a un servidor.
                  </p>

                  <dl className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2">
                    <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Correo</dt>
                      <dd className="mt-1 truncate text-[13px] text-ink-200">{form.email}</dd>
                    </div>
                    <div className="rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Ciudad</dt>
                      <dd className="mt-1 text-[13px] text-ink-200">{form.city}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                    <Button to="/app">
                      Probar la demo <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" to="/ingresar">
                      <ArrowLeft className="h-4 w-4" /> Volver a ingresar
                    </Button>
                  </div>

                  <div className="mt-6 text-left">
                    <DemoNote>
                      no hay registro real, no se guardaron tu cédula, teléfono ni contraseña, y ningún dato se
                      transmitió a un servidor.
                    </DemoNote>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge tone="brand" className="uppercase tracking-[0.14em]">
                        <Sparkles className="h-3 w-3" /> Cuenta de pasajero
                      </Badge>
                      <h1 className="heading mt-4 text-3xl font-extrabold text-white sm:text-[34px]">Crea tu cuenta.</h1>
                      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-300">
                        Un solo registro para viajar, pagar y guardar tus direcciones favoritas.
                      </p>
                    </div>
                    <div className="hidden sm:block sm:text-right">
                      <p className="text-[11px] text-ink-500">¿Ya tienes cuenta?</p>
                      <Link
                        to="/ingresar"
                        className="mt-1 inline-flex min-h-[40px] items-center gap-1 text-[12.5px] font-semibold text-brand-400 transition hover:text-brand-300"
                      >
                        Ingresar <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
                    <Badge tone="neutral">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Datos de ejemplo
                    </Badge>
                    <Badge tone="neutral">
                      <Smartphone className="h-3.5 w-3.5 text-brand-400" /> 3 minutos
                    </Badge>
                  </div>

                  <form className="mt-2" onSubmit={submit} noValidate>
                    <FormSection n="01" title="Datos personales" hint="Usa los datos tal como aparecen en tu cédula.">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Field
                            id={nameId}
                            name="name"
                            label="Nombre y apellido"
                            icon={User}
                            placeholder="María Rodríguez"
                            autoComplete="name"
                            value={form.name}
                            error={errors.name}
                            valid={valid("name")}
                            onChange={(e) => update("name", e.target.value)}
                            onBlur={() => handleBlur("name")}
                          />
                        </div>
                        <Field
                          id={emailId}
                          name="email"
                          type="email"
                          inputMode="email"
                          label="Correo electrónico"
                          icon={Mail}
                          placeholder="tucorreo@ejemplo.com"
                          autoComplete="email"
                          value={form.email}
                          error={errors.email}
                          valid={valid("email")}
                          onChange={(e) => update("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                        />
                        <Field
                          id={phoneId}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          label="Teléfono"
                          icon={Phone}
                          placeholder="0414 1234567"
                          autoComplete="tel"
                          hint="Puedes escribirlo con +58 o empezando por 0."
                          value={form.phone}
                          error={errors.phone}
                          valid={valid("phone")}
                          onChange={(e) => update("phone", e.target.value)}
                          onBlur={() => handleBlur("phone")}
                        />
                        <Field
                          id={idCardId}
                          name="idCard"
                          label="Cédula de identidad"
                          icon={Fingerprint}
                          placeholder="V-12345678"
                          autoComplete="off"
                          hint="Se usa para verificar tu identidad en producción."
                          value={form.idCard}
                          error={errors.idCard}
                          valid={valid("idCard")}
                          onChange={(e) => update("idCard", e.target.value)}
                          onBlur={() => handleBlur("idCard")}
                        />
                        <div>
                          <label htmlFor={cityId} className="label">
                            Ciudad
                          </label>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                            <select
                              id={cityId}
                              name="city"
                              required
                              autoComplete="address-level2"
                              aria-invalid={Boolean(errors.city)}
                              aria-describedby={errors.city ? `${cityId}-error` : undefined}
                              value={form.city}
                              onChange={(e) => update("city", e.target.value)}
                              onBlur={() => handleBlur("city")}
                              className={`field appearance-none pl-10 pr-10 ${
                                errors.city ? "border-red-500/60 focus:border-red-400" : ""
                              }`}
                            >
                              {HUBS.map((hub) => (
                                <option key={hub.city} value={hub.city}>
                                  {hub.city}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                          </div>
                          {errors.city && (
                            <span id={`${cityId}-error`} className="mt-1.5 block text-[11.5px] text-red-300">
                              {errors.city}
                            </span>
                          )}
                        </div>
                      </div>
                    </FormSection>

                    <FormSection n="02" title="Protege tu cuenta" hint="Mínimo 8 caracteres con letras y números.">
                      <div className="grid gap-4">
                        <div>
                          <Field
                            id={passwordId}
                            name="password"
                            type={showPassword ? "text" : "password"}
                            label="Contraseña"
                            icon={LockKeyhole}
                            placeholder="Crea una contraseña"
                            autoComplete="new-password"
                            value={form.password}
                            error={errors.password}
                            valid={valid("password")}
                            onChange={(e) => update("password", e.target.value)}
                            onBlur={() => handleBlur("password")}
                            action={
                              <PasswordButton visible={showPassword} onClick={() => setShowPassword((v) => !v)} />
                            }
                          />

                          {form.password && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex flex-1 gap-1" aria-hidden="true">
                                {[0, 1, 2].map((i) => (
                                  <span
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${
                                      i < Math.max(1, score) ? strength.bar : "bg-white/10"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${strength.text}`}>
                                {strength.label}
                              </span>
                            </div>
                          )}

                          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                            {[
                              { label: "Mínimo 8 caracteres", ok: form.password.length >= 8 },
                              {
                                label: "Al menos una letra y un número",
                                ok: /[A-Za-z]/.test(form.password) && /\d/.test(form.password),
                              },
                            ].map((rule) => (
                              <li key={rule.label} className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
                                <Check
                                  className={`h-3 w-3 ${rule.ok ? "text-emerald-400" : "text-ink-600"}`}
                                  strokeWidth={3}
                                />
                                {rule.label}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Field
                          id={confirmId}
                          name="confirm"
                          type={showConfirm ? "text" : "password"}
                          label="Confirmar contraseña"
                          icon={LockKeyhole}
                          placeholder="Repite tu contraseña"
                          autoComplete="new-password"
                          value={form.confirm}
                          error={errors.confirm}
                          valid={valid("confirm")}
                          onChange={(e) => update("confirm", e.target.value)}
                          onBlur={() => handleBlur("confirm")}
                          action={<PasswordButton visible={showConfirm} onClick={() => setShowConfirm((v) => !v)} />}
                        />
                      </div>
                    </FormSection>

                    <FormSection n="03" title="Confirma y crea tu cuenta">
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            id={consentId}
                            type="checkbox"
                            required
                            checked={form.consent}
                            aria-invalid={Boolean(errors.consent)}
                            aria-describedby={errors.consent ? `${consentId}-error` : undefined}
                            onChange={(e) => update("consent", e.target.checked)}
                            onBlur={() => handleBlur("consent")}
                            className="mt-1.5 h-4 w-4 shrink-0 rounded border-asphalt-600 bg-asphalt-900 accent-brand-500"
                          />
                          <label htmlFor={consentId} className="text-[12px] leading-relaxed text-ink-400">
                            Acepto los{" "}
                            <Link to="/legal/terminos" className="font-semibold text-brand-400 hover:text-brand-300">
                              términos y condiciones
                            </Link>{" "}
                            y la{" "}
                            <Link to="/legal/privacidad" className="font-semibold text-brand-400 hover:text-brand-300">
                              política de privacidad
                            </Link>
                            . Entiendo que esta es una demostración y que no se crea una cuenta real.
                          </label>
                        </div>
                        {errors.consent && (
                          <span id={`${consentId}-error`} className="text-[11.5px] text-red-300">
                            {errors.consent}
                          </span>
                        )}

                        <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[12px] text-ink-400">
                          <input
                            type="checkbox"
                            checked={form.newsletter}
                            onChange={(e) => update("newsletter", e.target.checked)}
                            className="h-4 w-4 shrink-0 rounded border-asphalt-600 bg-asphalt-900 accent-brand-500"
                          />
                          Quiero recibir novedades y ofertas de Llégate (opcional).
                        </label>

                        {submitError && (
                          <p
                            role="alert"
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
                          >
                            {submitError}
                          </p>
                        )}

                        <Button type="submit" size="lg" full disabled={loading} aria-busy={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Creando tu cuenta…
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4" /> Crear mi cuenta
                            </>
                          )}
                        </Button>

                        <div className="mt-1">
                          <DemoNote>
                            formulario de demostración: no se crea una cuenta real y tu contraseña, cédula y teléfono
                            no se guardan ni se envían a ningún servidor.
                          </DemoNote>
                        </div>

                        <p className="text-center text-[12px] text-ink-400">
                          ¿Quieres manejar con Llégate?{" "}
                          <Link
                            to="/conductores/registro"
                            className="inline-flex min-h-[40px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
                          >
                            Registro de conductores
                          </Link>
                        </p>
                      </div>
                    </FormSection>
                  </form>
                </>
              )}
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Llégate App · Prototipo de rediseño con datos de ejemplo
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
