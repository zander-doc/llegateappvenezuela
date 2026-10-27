import { useState } from "react";
import { ArrowRight, BadgeCheck, Store } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { FormSuccess, OptionCard, SelectField, TextAreaField, TextField, saveDemoLead } from "./shared";
import { VENDOR_CATEGORIES } from "../../data/vendors";
import { HUBS } from "../../data/site";
import { useUI } from "../../lib/ui";

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
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.business.trim().length < 2) {
      setError("Escribe el nombre del negocio.");
      return;
    }
    if (form.contact.trim().length < 7) {
      setError("Escribe un WhatsApp o correo de contacto.");
      return;
    }
    if (!form.description.trim()) {
      setError("Cuéntanos qué ofrece el negocio.");
      return;
    }
    if (!confirm) {
      setError("Confirma que la información es correcta.");
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
              <strong className="text-white">{form.business}</strong>. Te avisaríamos al {form.contact}.
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
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre del negocio"
            value={form.business}
            onChange={(e) => set("business", e.target.value)}
            placeholder="Ej. Repuestos El Motor"
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
          label="WhatsApp o correo de contacto"
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
          placeholder="0414 000 0000"
          required
        />
        <TextAreaField
          label="Qué ofrece el negocio"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
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
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            Confirmo que la información es correcta y que puedo representar a este negocio.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}

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
