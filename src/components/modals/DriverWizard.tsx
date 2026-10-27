import { useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Clock, UserRound } from "lucide-react";
import { Modal } from "../Modal";
import { Button, Money } from "../ui";
import { FormSuccess, OptionCard, SelectField, TextField, saveDemoLead } from "./shared";
import { DRIVER_PLANS } from "../../data/plans";
import { SERVICES } from "../../data/services";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

export function DriverWizard({ planId, onClose }: { planId?: string; onClose: () => void }) {
  const { notify } = useUI();
  const [step, setStep] = useState(1);
  const [serviceSlug, setServiceSlug] = useState("mototaxi");
  const [city, setCity] = useState("Caracas");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("1-3 años");
  const [plan, setPlan] = useState(planId ?? "pro-mensual");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const selectedService = SERVICES.find((s) => s.slug === serviceSlug);
  const selectedPlan = DRIVER_PLANS.find((p) => p.id === plan);

  function next() {
    if (step === 2) {
      if (name.trim().length < 3) {
        setError("Escribe tu nombre completo.");
        return;
      }
      if (phone.replace(/\D/g, "").length < 7) {
        setError("Escribe un teléfono con al menos 7 dígitos.");
        return;
      }
    }
    setError("");
    setStep((s) => Math.min(3, s + 1));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Confirma que la información es tuya y aceptas la verificación.");
      return;
    }
    saveDemoLead("llegate_sim_drivers", { serviceSlug, city, name, phone, experience, plan });
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
              <Button to="/conductores/planes" onClick={onClose}>
                Ver planes y comisiones
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          }
          note={
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Lo que seguiría en producción</p>
              <ol className="mt-2 grid gap-2 text-[12.5px] text-ink-300">
                {[
                  "Carga de cédula, licencia y documentos del vehículo.",
                  "Verificación de identidad y antecedentes.",
                  "Entrevista corta y activación de la cuenta.",
                ].map((item, i) => (
                  <li key={item} className="flex gap-2">
                    <span className="mono flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-ink-200">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
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
      <div className="mb-5 flex items-center gap-1.5" aria-label={`Paso ${step} de 3`}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-brand-500" : "bg-white/10"}`}
          />
        ))}
        <span className="mono ml-2 text-[11px] text-ink-400">{step}/3</span>
      </div>

      <form onSubmit={submit}>
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">
              <Clock className="h-4 w-4 text-brand-400" /> Paso 1 · Qué vas a manejar
            </div>
            <p className="mt-2 text-[13.5px] text-ink-400">
              Elige el servicio principal. Puedes sumar otros después de la verificación.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <OptionCard
                  key={s.slug}
                  active={serviceSlug === s.slug}
                  onClick={() => setServiceSlug(s.slug)}
                  title={s.name}
                  subtitle={s.capacity}
                />
              ))}
            </div>
            <div className="mt-3">
              <SelectField label="Ciudad donde vas a operar" value={city} onChange={(e) => setCity(e.target.value)}>
                {HUBS.map((h) => (
                  <option key={h.stateId} value={h.city}>
                    {h.city} · {h.stateName}
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
                label="Nombre completo"
                placeholder="Como aparece en tu cédula"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              <TextField
                label="Teléfono"
                placeholder="0414 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div className="mt-3">
              <SelectField label="Experiencia manejando" value={experience} onChange={(e) => setExperience(e.target.value)}>
                <option>Menos de 1 año</option>
                <option>1-3 años</option>
                <option>3-5 años</option>
                <option>Más de 5 años</option>
              </SelectField>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11.5px] leading-relaxed text-ink-400">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              En el siguiente paso elegirás cómo pagar. No se cobra nada en esta simulación.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">
              <Check className="h-4 w-4 text-brand-400" /> Paso 3 · Cómo quieres pagar
            </div>
            <div className="mt-3 grid gap-2">
              <OptionCard
                active={plan === "comision"}
                onClick={() => setPlan("comision")}
                title="Pago por viaje · 10% de comisión"
                subtitle="Sin cuota mensual. Ideal si manejas pocas horas."
              />
              {DRIVER_PLANS.map((p) => (
                <OptionCard
                  key={p.id}
                  active={plan === p.id}
                  onClick={() => setPlan(p.id)}
                  title={`${p.name} · ${p.priceUSD.toFixed(2)} USD ${p.per}`}
                  subtitle="0% de comisión por viaje"
                />
              ))}
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
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-400">Plan</dt>
                  <dd className="text-right font-medium text-white">
                    {selectedPlan ? (
                      <Money usd={selectedPlan.priceUSD} size="sm" showBoth={false} />
                    ) : (
                      "10% por viaje"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <label className="mt-4 flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
              />
              <span>
                Confirmo que la información es mía y acepto la verificación de documentos y antecedentes descrita en
                los términos.
              </span>
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={() => { setError(""); setStep(step - 1); }}>
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
