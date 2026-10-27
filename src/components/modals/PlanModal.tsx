import { useState } from "react";
import { ArrowRight, Check, Crown, ShieldCheck } from "lucide-react";
import { Modal } from "../Modal";
import { Button, Money } from "../ui";
import { FormSuccess, SelectField, TextField, saveDemoLead } from "./shared";
import { DRIVER_PLANS, VIP_PLAN } from "../../data/plans";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

export function PlanModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { notify } = useUI();
  const plan = DRIVER_PLANS.find((p) => p.id === planId) ?? (planId === VIP_PLAN.id ? VIP_PLAN : DRIVER_PLANS[1]);
  const isDriver = plan.audience === "conductor";
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("Caracas");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      setError("Escribe tu nombre.");
      return;
    }
    if (contact.trim().length < 7) {
      setError("Escribe un correo o teléfono válido.");
      return;
    }
    saveDemoLead("llegate_sim_plans", { planId: plan.id, name, contact, city });
    notify(`Solicitud del plan ${plan.name} guardada (demo).`);
    setDone(true);
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Solicitud guardada" eyebrow={plan.name} size="sm">
        <FormSuccess
          title="Listo. Te avisamos al activar el plan"
          text={
            <>
              En producción, el plan <strong className="text-white">{plan.name}</strong> se activaría desde la app
              después de confirmar el pago. Aquí no se cobra ni se activa nada.
            </>
          }
          actions={
            <>
              <Button to={isDriver ? "/conductores/planes" : "/pasajeros/club-vip"} onClick={onClose}>
                Ver detalles <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title={`Activar ${plan.name}`}
      subtitle={isDriver ? "Déjanos tus datos para avisarte cuando la app esté publicada." : "Tu membresía se activaría desde la app."}
      eyebrow={isDriver ? "Plan para conductores" : "Club VIP"}
      size="sm"
    >
      <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white">
            {isDriver ? <ShieldCheck className="h-4 w-4 text-brand-400" /> : <Crown className="h-4 w-4 text-racing-500" />}
            {plan.name}
          </span>
          {plan.badge && (
            <span className="rounded-full border border-racing-500/25 bg-racing-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-racing-400">
              {plan.badge}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="mono text-[30px] font-semibold text-white">${plan.priceUSD.toFixed(2)}</span>
          <span className="text-[12px] text-ink-400">/ {plan.period}</span>
        </div>
        <Money usd={plan.priceUSD} size="sm" />
        <ul className="mt-3 grid gap-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-200">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
        <TextField
          label="Correo o teléfono"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          required
        />
        <SelectField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)}>
          {HUBS.map((h) => (
            <option key={h.stateId} value={h.city}>
              {h.city}
            </option>
          ))}
          <option value="Otra ciudad">Otra ciudad</option>
        </SelectField>
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" full>
          Avísame para activarlo
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-500">
          Simulación: no hay cobro, contrato ni activación real.
        </p>
      </form>
    </Modal>
  );
}
