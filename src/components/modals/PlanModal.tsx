import { useState } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { Modal } from "../Modal";
import { Button, Money } from "../ui";
import { FormSuccess, SelectField, TextField } from "./shared";
import { saveDemoLead } from "../../lib/demoStorage";
import { isContact, isPersonName } from "../../lib/validation";
import { VIP_PLAN } from "../../data/plans";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

type FieldErrors = {
  name?: string;
  contact?: string;
};

export function PlanModal({ onClose }: { planId: string; onClose: () => void }) {
  const { notify } = useUI();
  const plan = VIP_PLAN;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("Caracas");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = "Escribe tu nombre.";
    } else if (!isPersonName(name)) {
      next.name = "Usa al menos 3 caracteres, sin números ni símbolos.";
    }
    if (!contact.trim()) {
      next.contact = "Escribe un correo o teléfono para avisarte.";
    } else if (!isContact(contact)) {
      next.contact = "Escribe un correo válido o un teléfono de al menos 7 dígitos.";
    }

    setErrors(next);
    if (next.name) {
      document.getElementById("plan-name")?.focus();
      return;
    }
    if (next.contact) {
      document.getElementById("plan-contact")?.focus();
      return;
    }

    saveDemoLead("llegate_sim_plans", { planId: plan.id, name: name.trim(), contact, city });
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
              <Button to="/pasajeros/club-vip" onClick={onClose}>
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
      subtitle="Tu membresía se activaría desde la app."
      eyebrow="Club VIP"
      size="sm"
    >
      <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white">
            <Crown className="h-4 w-4 text-racing-500" />
            {plan.name}
          </span>
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

      <form onSubmit={submit} noValidate className="mt-4 grid gap-3">
        <TextField
          id="plan-name"
          label="Nombre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
          }}
          error={errors.name}
          placeholder="Tu nombre"
          autoComplete="name"
          required
        />
        <TextField
          id="plan-contact"
          label="Correo o teléfono"
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            if (errors.contact) setErrors((current) => ({ ...current, contact: undefined }));
          }}
          error={errors.contact}
          hint="Solo para avisarte. En esta demo no se envía fuera del navegador."
          placeholder="tucorreo@ejemplo.com"
          autoComplete="email"
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
