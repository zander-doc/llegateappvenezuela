import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock, Gift, Percent, UserRound, Wallet } from "lucide-react";
import { Modal } from "../Modal";
import { Button, DemoNote } from "../ui";
import { FieldError, FormSuccess, OptionCard, SelectField, TextField } from "./shared";
import { clearDraft, loadDraft, saveDemoLead, saveDraft } from "../../lib/demoStorage";
import { isPersonName, isVenezuelanPhone } from "../../lib/validation";
import { PILOT_RULES } from "../../data/prepaid";
import { formatUSD } from "../../lib/format";
import { LAUNCH_SERVICES } from "../../data/services";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

const EXPERIENCES = ["Menos de 1 año", "1-3 años", "3-5 años", "Más de 5 años"] as const;
type Experience = (typeof EXPERIENCES)[number];

const CITIES = [...HUBS.map((hub) => hub.city), "Otra ciudad"];

const DRAFT_KEY = "driver-registration";

type Draft = {
  serviceSlug?: string;
  city?: string;
  name?: string;
  experience?: string;
};

type FieldErrors = {
  name?: string;
  phone?: string;
  consent?: string;
};

function isExperience(value: string | undefined): value is Experience {
  return EXPERIENCES.includes(value as Experience);
}

export function DriverWizard({ onClose }: { onClose: () => void }) {
  const { notify } = useUI();
  const [draft] = useState(() => loadDraft<Draft>(DRAFT_KEY));
  const [step, setStep] = useState(1);
  const [serviceSlug, setServiceSlug] = useState(() =>
    LAUNCH_SERVICES.some((service) => service.slug === draft?.serviceSlug) ? draft!.serviceSlug! : "mototaxi"
  );
  const [city, setCity] = useState(() => (CITIES.includes(draft?.city ?? "") ? draft!.city! : "Caracas"));
  const [name, setName] = useState(() => draft?.name ?? "");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState<Experience>(() =>
    isExperience(draft?.experience) ? draft.experience : "1-3 años"
  );
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  const selectedService = LAUNCH_SERVICES.find((service) => service.slug === serviceSlug);

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => {
      saveDraft(DRAFT_KEY, { serviceSlug, city, name: name.trim(), experience });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [serviceSlug, city, name, experience, done]);

  function validateStep2() {
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = "Escribe tu nombre completo.";
    } else if (!isPersonName(name)) {
      next.name = "Usa al menos 3 caracteres, sin números ni símbolos.";
    }
    if (!phone.trim()) {
      next.phone = "Escribe tu teléfono.";
    } else if (!isVenezuelanPhone(phone)) {
      next.phone = "Escribe un número venezolano, por ejemplo 0414 1234567.";
    }

    setErrors(next);
    if (next.name) {
      document.getElementById("driver-name")?.focus();
      return false;
    }
    if (next.phone) {
      document.getElementById("driver-phone")?.focus();
      return false;
    }
    return true;
  }

  function next() {
    if (step === 2 && !validateStep2()) return;
    setErrors({});
    setStep((current) => Math.min(3, current + 1));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) {
      setErrors({ consent: "Confirma que la información es tuya y aceptas la verificación." });
      document.getElementById("driver-consent")?.focus();
      return;
    }

    setErrors({});
    saveDemoLead("llegate_sim_drivers", {
      serviceSlug,
      city,
      name: name.trim(),
      experience,
      plan: "prepago",
    });
    clearDraft(DRAFT_KEY);
    notify("Solicitud de conductor guardada en este navegador (demo).");
    setDone(true);
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Registro de conductor" eyebrow="Simulación" size="md">
        <FormSuccess
          title="Tu solicitud quedó guardada"
          text={
            <>
              En un flujo real, el equipo revisaría tus documentos y te contactaría al{" "}
              <strong className="text-white">{phone}</strong> en un plazo de 48 horas hábiles. Nada de eso ocurre en
              este prototipo.
            </>
          }
          actions={
            <>
              <Button to="/conductores/planes#billetera" onClick={onClose}>
                Ver cómo funciona el prepago
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          }
          note={
            <DemoNote>
              guardamos solo servicio, ciudad, nombre, experiencia y modelo de pago en este navegador. Tu teléfono no
              se almacena ni se envía.
            </DemoNote>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title="Regístrate como conductor"
      subtitle="Tres pasos, unos cuatro minutos. Puedes salir y volver cuando quieras."
      eyebrow="Conductores"
      size="lg"
    >
      <div
        className="mb-5 flex items-center gap-1.5"
        role="progressbar"
        aria-label="Progreso del registro"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
        aria-valuetext={`Paso ${step} de 3`}
      >
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-brand-500" : "bg-white/10"}`}
          />
        ))}
        <span className="mono ml-2 text-[11px] text-ink-400">{step}/3</span>
      </div>

      <form onSubmit={submit} noValidate>
        {step === 1 && (
          <div className="animate-fade-in">
            {draft && (
              <p className="mb-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11.5px] text-ink-400">
                Recuperamos el borrador que dejaste en este dispositivo.
              </p>
            )}
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">
              <Clock className="h-4 w-4 text-brand-400" /> Paso 1 · Qué vas a manejar
            </div>
            <p className="mt-2 text-[13.5px] text-ink-400">
              Elige el servicio principal entre los que arrancan. Minivan, autobús y carga se abren en próximas fases.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {LAUNCH_SERVICES.map((service) => (
                <OptionCard
                  key={service.slug}
                  active={serviceSlug === service.slug}
                  onClick={() => setServiceSlug(service.slug)}
                  title={service.name}
                  subtitle={service.capacity}
                />
              ))}
            </div>
            <div className="mt-3">
              <SelectField
                label="Ciudad donde vas a operar"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                autoComplete="address-level2"
              >
                {HUBS.map((hub) => (
                  <option key={hub.stateId} value={hub.city}>
                    {hub.city} · {hub.stateName}
                  </option>
                ))}
                <option value="Otra ciudad">Otra ciudad</option>
              </SelectField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">
              <UserRound className="h-4 w-4 text-brand-400" /> Paso 2 · Tus datos
            </div>
            <p className="mt-2 text-[13.5px] text-ink-400">
              Solo usamos estos datos para contactarte y verificar tu identidad. No se muestran a los pasajeros.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField
                id="driver-name"
                label="Nombre completo"
                placeholder="Como aparece en tu cédula"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
                error={errors.name}
                autoComplete="name"
                required
              />
              <TextField
                id="driver-phone"
                label="Teléfono"
                placeholder="0414 000 0000"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                }}
                error={errors.phone}
                inputMode="tel"
                autoComplete="tel"
                hint="No se guarda en este navegador."
                required
              />
            </div>
            <div className="mt-3">
              <SelectField
                label="Experiencia manejando"
                value={experience}
                onChange={(event) => setExperience(event.target.value as Experience)}
              >
                {EXPERIENCES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </SelectField>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11.5px] leading-relaxed text-ink-400">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              En el siguiente paso verás cómo funciona el saldo prepago. No se cobra nada en esta simulación.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">
              <Check className="h-4 w-4 text-brand-400" /> Paso 3 · Cómo funciona tu saldo
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              No hay plan mensual. Al aprobar tu cuenta recibes saldo de bienvenida y la comisión se descuenta solo al
              completar cada viaje.
            </p>

            <div className="mt-4 grid gap-2">
              {[
                {
                  icon: Gift,
                  title: `${formatUSD(PILOT_RULES.welcomeUSD)} de saldo de bienvenida`,
                  text: "Sin vencimiento, para tus primeros viajes.",
                },
                {
                  icon: Percent,
                  title: "10% por viaje completado",
                  text: "Al aceptar se reserva la comisión; se descuenta al finalizar. Si cancelas, se libera.",
                },
                {
                  icon: Wallet,
                  title: `Recargas desde ${formatUSD(PILOT_RULES.minRechargeUSD)}`,
                  text: `Pago Móvil o Binance. Aprobación manual con SLA de ${PILOT_RULES.approvalSlaMinutes} minutos.`,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-ink-950/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Resumen</p>
              <dl className="mt-2 grid gap-1.5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-400">Servicio</dt>
                  <dd className="text-right font-medium text-white">{selectedService?.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-400">Ciudad</dt>
                  <dd className="text-right font-medium text-white">{city}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-400">Conductor</dt>
                  <dd className="text-right font-medium text-white">{name || "Sin nombre"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-400">Experiencia</dt>
                  <dd className="text-right font-medium text-white">{experience}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-400">Pago</dt>
                  <dd className="text-right font-medium text-white">Prepago · 10% por viaje</dd>
                </div>
              </dl>
            </div>

            <label className="mt-4 flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-300">
              <input
                id="driver-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (errors.consent) setErrors((current) => ({ ...current, consent: undefined }));
                }}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "driver-consent-error" : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
              />
              <span>
                Confirmo que la información es mía y acepto la verificación de documentos y antecedentes descrita en
                los términos.
              </span>
            </label>
            {errors.consent && <FieldError id="driver-consent-error">{errors.consent}</FieldError>}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setErrors({});
                setStep(step - 1);
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {step < 3 ? (
            <Button type="button" onClick={next}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit">
              Enviar solicitud <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
