import { useState } from "react";
import { ArrowRight, BadgeCheck, Store } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { FieldError, FormSuccess, OptionCard, SelectField, TextAreaField, TextField } from "./shared";
import { saveDemoLead } from "../../lib/demoStorage";
import { isContact } from "../../lib/validation";
import { VENDOR_CATEGORIES } from "../../data/vendors";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

type FieldErrors = {
  business?: string;
  contact?: string;
  description?: string;
  confirm?: string;
};

export function PublishModal({ onClose }: { onClose: () => void }) {
  const { notify } = useUI();
  const [form, setForm] = useState({
    business: "",
    category: "Repuestos" as string,
    city: "Caracas",
    address: "",
    contact: "",
    description: "",
    plan: "basica",
  });
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "business" && errors.business) setErrors((current) => ({ ...current, business: undefined }));
    if (key === "contact" && errors.contact) setErrors((current) => ({ ...current, contact: undefined }));
    if (key === "description" && errors.description) {
      setErrors((current) => ({ ...current, description: undefined }));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!form.business.trim()) {
      next.business = "Escribe el nombre del negocio.";
    }
    if (!form.contact.trim()) {
      next.contact = "Escribe un WhatsApp o correo de contacto.";
    } else if (!isContact(form.contact)) {
      next.contact = "Escribe un correo válido o un teléfono de al menos 7 dígitos.";
    }
    if (!form.description.trim()) {
      next.description = "Cuéntanos qué ofrece el negocio.";
    }
    if (!confirm) {
      next.confirm = "Confirma que la información es correcta.";
    }

    setErrors(next);
    if (next.business) {
      document.getElementById("publish-business")?.focus();
      return;
    }
    if (next.contact) {
      document.getElementById("publish-contact")?.focus();
      return;
    }
    if (next.description) {
      document.getElementById("publish-description")?.focus();
      return;
    }
    if (next.confirm) {
      document.getElementById("publish-confirm")?.focus();
      return;
    }

    saveDemoLead("llegate_sim_businesses", form);
    notify("Ficha enviada a revisión (simulación).");
    setDone(true);
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Ficha enviada" eyebrow="Mercado Motor" size="sm">
        <FormSuccess
          title="Tu negocio quedó en revisión"
          text={
            <>
              En producción revisaríamos la dirección y el canal de contacto antes de publicar la ficha de{" "}
              <strong className="text-white">{form.business}</strong>. Te avisaríamos por el canal que dejaste.
            </>
          }
          actions={
            <>
              <Button to="/mercado" onClick={onClose}>
                Ver el mercado <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          }
          note={
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-[12px] leading-relaxed text-ink-300">
              <p className="mb-1 font-semibold text-white">Qué revisaríamos</p>
              Dirección verificable, horario, un canal de contacto activo y que la oferta coincida con la categoría.
              El sello Verificado no es una garantía de resultados.
            </div>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title="Publica tu negocio"
      subtitle="La ficha básica es gratuita durante el lanzamiento. Revisamos cada negocio antes de publicarlo."
      eyebrow="Mercado Motor"
      size="md"
    >
      <form onSubmit={submit} noValidate className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="publish-business"
            label="Nombre del negocio"
            value={form.business}
            onChange={(e) => set("business", e.target.value)}
            error={errors.business}
            placeholder="Ej. Repuestos El Motor"
            autoComplete="organization"
            required
          />
          <SelectField label="Categoría" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Ciudad" value={form.city} onChange={(e) => set("city", e.target.value)}>
            {HUBS.map((h) => (
              <option key={h.stateId} value={h.city}>
                {h.city}
              </option>
            ))}
            <option value="Otra ciudad">Otra ciudad</option>
          </SelectField>
          <TextField
            label="Zona o dirección"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Ej. La Candelaria, Caracas"
          />
        </div>
        <TextField
          id="publish-contact"
          label="WhatsApp o correo de contacto"
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
          error={errors.contact}
          hint="Solo para responderte. En esta demo no se envía fuera del navegador."
          placeholder="0414 000 0000"
          autoComplete="email"
          required
        />
        <TextAreaField
          id="publish-description"
          label="Qué ofrece el negocio"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          placeholder="Productos, servicios, horarios y oferta para conductores de Llégate..."
          required
        />

        <p className="label mb-0">Visibilidad</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionCard
            active={form.plan === "basica"}
            onClick={() => set("plan", "basica")}
            title="Ficha básica · Gratis"
            subtitle="Aparece en búsquedas y categorías"
          />
          <OptionCard
            active={form.plan === "destacada"}
            onClick={() => set("plan", "destacada")}
            title="Destacada · $19/mes (ejemplo)"
            subtitle="Primera posición y sello Patrocinado"
          />
        </div>

        <label className="mt-1 flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-300">
          <input
            id="publish-confirm"
            type="checkbox"
            checked={confirm}
            onChange={(e) => {
              setConfirm(e.target.checked);
              if (errors.confirm) setErrors((current) => ({ ...current, confirm: undefined }));
            }}
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? "publish-confirm-error" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            Confirmo que la información es correcta y que puedo representar a este negocio.
          </span>
        </label>
        {errors.confirm && <FieldError id="publish-confirm-error">{errors.confirm}</FieldError>}

        <Button type="submit" full>
          <Store className="h-4 w-4" /> Enviar ficha a revisión
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-500">
          <BadgeCheck className="h-3.5 w-3.5" /> Revisión manual antes de publicar
        </p>
      </form>
    </Modal>
  );
}
