import { useId, useState, type ComponentType, type FormEvent, type InputHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Badge, Button, DemoNote, Money } from "../components/ui";
import { Reveal } from "../components/Motion";
import { isContact } from "../lib/validation";
import { useUI } from "../lib/ui";

type Mode = "login" | "recover";

type FieldErrors = {
  contact?: string;
  password?: string;
};

const copy: Record<Mode, { title: string; subtitle: string }> = {
  login: {
    title: "Bienvenido de vuelta.",
    subtitle: "Entra para ver tus viajes, pagos y direcciones guardadas.",
  },
  recover: {
    title: "Recupera tu acceso.",
    subtitle: "Te enviaríamos un enlace para restablecer tu contraseña.",
  },
};

const successCopy: Record<Mode, { title: string; text: string }> = {
  login: {
    title: "Acceso de demostración",
    text: "En producción, este formulario abriría tu sesión y te llevaría al mapa. Esta simulación no valida credenciales ni guarda tu contraseña.",
  },
  recover: {
    title: "Enlace simulado",
    text: "En producción recibirías un correo para restablecer tu contraseña. Aquí no se envió ningún mensaje.",
  },
};

function IconField({
  label,
  icon: Icon,
  hint,
  error,
  className = "",
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ComponentType<{ className?: string }>;
  hint?: string;
  error?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy =
    [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field pl-10 ${error ? "border-red-500/60 focus:border-red-400" : ""} ${className}`}
          {...props}
        />
      </span>
      {error ? (
        <span id={`${inputId}-error`} className="mt-1.5 block text-[11.5px] leading-snug text-red-300">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="mt-1.5 block text-[11.5px] text-ink-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function PasswordField({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy =
    [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="label">{label}</span>
      <span className="relative block">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field pl-10 pr-12 ${error ? "border-red-500/60 focus:border-red-400" : ""}`}
          type={visible ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:text-white"
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </span>
      {error ? (
        <span id={`${inputId}-error`} className="mt-1.5 block text-[11.5px] leading-snug text-red-300">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="mt-1.5 block text-[11.5px] text-ink-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function IngresarPage() {
  const { openModal } = useUI();
  const [mode, setMode] = useState<Mode>("login");
  const [done, setDone] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    contact: "",
    password: "",
    remember: true,
  });
  const contactId = useId();
  const passwordId = useId();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "contact" && errors.contact) setErrors((current) => ({ ...current, contact: undefined }));
    if (key === "password" && errors.password) setErrors((current) => ({ ...current, password: undefined }));
  }

  function changeMode(next: Mode) {
    setMode(next);
    setDone(null);
    setErrors({});
    setLoading(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!form.contact.trim()) {
      next.contact = "Escribe tu correo o teléfono.";
    } else if (!isContact(form.contact)) {
      next.contact = "Escribe un correo válido o un teléfono de al menos 7 dígitos.";
    }
    if (mode !== "recover" && form.password.length < 6) {
      next.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    setErrors(next);
    if (next.contact) {
      document.getElementById(contactId)?.focus();
      return;
    }
    if (next.password) {
      document.getElementById(passwordId)?.focus();
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setDone(mode);
    }, 750);
  }

  return (
    <section className="asphalt relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-32 top-[-10%] h-[420px] w-[420px] rounded-full bg-brand-500/[0.08] blur-3xl"
        aria-hidden="true"
      />
      <div className="wrap relative grid gap-8 py-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch lg:gap-10 lg:py-14">
        <Reveal className="hidden lg:block">
          <aside className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-asphalt-800 bg-asphalt-900/80 p-8">
            <div className="flex items-center justify-between">
              <Badge tone="brand" className="uppercase tracking-[0.14em]">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" aria-hidden="true" />
                Venezuela · Próximo lanzamiento
              </Badge>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">Acceso</span>
            </div>

            <div className="mt-14 max-w-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">Tu cuenta Llégate</p>
              <h2 className="heading mt-4 text-[54px] font-black uppercase leading-[0.95] tracking-tight text-white">
                Tu viaje
                <br />
                empieza
                <br />
                <span className="italic text-brand-500">aquí.</span>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-300">
                Una sola cuenta para pedir moto, carro o delivery; pagar en bolívares o dólares y seguir
                cada viaje con la ruta compartida.
              </p>
            </div>

            <ul className="mt-8 grid gap-3">
              {[
                { icon: ShieldCheck, title: "Conductores verificados", text: "Identidad y vehículo revisados antes de activar la cuenta." },
                { icon: MapPin, title: "Precio antes de pedir", text: "Ves el total en dólares y bolívares con la tasa BCV." },
                { icon: Smartphone, title: "Todo desde el móvil", text: "Viajes, pagos y soporte en la misma app." },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold text-white">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-400">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <div className="rounded-2xl border border-asphalt-800 bg-asphalt-950/80 p-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
                  <span className="text-ink-500">Tu próximo viaje</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Precio confirmado
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  <Money usd={6.2} size="sm" showBoth={false} />
                  <span className="text-[11px] text-ink-400">Taxi Pana · 4,2 km · 24 min</span>
                </div>
              </div>
              <div className="mt-4 h-[3px] w-full stripes-h rounded-full opacity-70" aria-hidden="true" />
            </div>
          </aside>
        </Reveal>

        <Reveal delay={0.08} className="mx-auto flex w-full max-w-[500px] flex-col justify-center lg:mx-0 lg:max-w-none">
          <div className="card relative overflow-hidden p-5 sm:p-7 lg:p-8">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="brand" className="uppercase tracking-[0.14em]">
                <Sparkles className="h-3 w-3" /> Acceso anticipado
              </Badge>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                Demo
              </span>
            </div>

            {done ? (
              <div className="animate-pop py-4 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/15 text-brand-400">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <h1 className="heading mt-4 text-[26px] font-extrabold text-white">{successCopy[done].title}</h1>
                <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink-300">
                  {successCopy[done].text}
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button to="/app">
                    Probar la demo <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" onClick={() => changeMode("login")}>
                    <ArrowLeft className="h-4 w-4" /> Volver al acceso
                  </Button>
                </div>
                <div className="mt-5 text-left">
                  <DemoNote>
                    no hay autenticación real y tu contraseña nunca se guarda ni se envía. Todo ocurre en este
                    navegador.
                  </DemoNote>
                </div>
              </div>
            ) : (
              <>
                <h1 className="heading mt-5 text-3xl font-extrabold text-white sm:text-[34px]">{copy[mode].title}</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{copy[mode].subtitle}</p>

                {mode === "recover" ? (
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                    className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-brand-400 transition hover:text-brand-300"
                  >
                    <ArrowLeft className="h-4 w-4" /> Volver a ingresar
                  </button>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-asphalt-800 bg-asphalt-950 p-1">
                    <button
                      type="button"
                      onClick={() => changeMode("login")}
                      aria-pressed={mode === "login"}
                      className="min-h-[44px] rounded-lg border border-brand-500/40 bg-brand-500/15 text-[12.5px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_0_15px_rgba(255,107,0,0.15)] transition"
                    >
                      Ingresar
                    </button>
                    <Link
                      to="/registro"
                      className="flex min-h-[44px] items-center justify-center rounded-lg border border-transparent text-[12.5px] font-bold uppercase tracking-[0.1em] text-ink-400 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Crear cuenta
                    </Link>
                  </div>
                )}

                <form className="mt-5 grid gap-4" onSubmit={submit} noValidate>
                  <IconField
                    id={contactId}
                    label="Correo o teléfono"
                    icon={Mail}
                    placeholder="tucorreo@ejemplo.com o 0414 000 0000"
                    autoComplete="username"
                    inputMode="email"
                    value={form.contact}
                    onChange={(e) => set("contact", e.target.value)}
                    error={errors.contact}
                  />

                  {mode !== "recover" && (
                    <PasswordField
                      id={passwordId}
                      label="Contraseña"
                      placeholder="Tu contraseña"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      error={errors.password}
                    />
                  )}

                  {mode === "login" && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex min-h-[40px] cursor-pointer items-center gap-2 text-[12.5px] text-ink-300">
                        <input
                          type="checkbox"
                          checked={form.remember}
                          onChange={(e) => set("remember", e.target.checked)}
                          className="h-4 w-4 rounded border-asphalt-600 bg-asphalt-900 accent-brand-500"
                        />
                        Recordarme
                      </label>
                      <button
                        type="button"
                        onClick={() => changeMode("recover")}
                        className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-brand-400 transition hover:text-brand-300"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  <Button type="submit" full disabled={loading} aria-busy={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
                      </>
                    ) : mode === "login" ? (
                      <>
                        Entrar <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" /> Enviar enlace
                      </>
                    )}
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">
                  <span className="h-px flex-1 bg-white/10" /> o <span className="h-px flex-1 bg-white/10" />
                </div>

                <Button variant="secondary" full to="/app">
                  <Smartphone className="h-4 w-4" /> Probar la demo sin cuenta
                </Button>

                <div className="mt-5">
                  <DemoNote>
                    pantalla de demostración: no hay autenticación real, no se guarda tu contraseña y no se envía
                    ningún dato a un servidor.
                  </DemoNote>
                </div>

                <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1 text-center text-[12px] text-ink-400">
                  <span>¿Aún no está tu ciudad?</span>
                  <button
                    type="button"
                    onClick={() => openModal({ type: "coverage" })}
                    className="inline-flex min-h-[40px] items-center font-semibold text-brand-400 transition hover:text-brand-300"
                  >
                    Solicita cobertura
                  </button>
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-ink-500">
            Llégate App · Prototipo de rediseño con datos de ejemplo
          </p>
        </Reveal>
      </div>
    </section>
  );
}
