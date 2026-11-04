import { useState } from "react";
import { BadgeCheck, Clock, MapPin, Store } from "lucide-react";
import { Modal } from "../Modal";
import { Badge, Button } from "../ui";
import { FormSuccess, TextAreaField, TextField } from "./shared";
import { saveDemoLead } from "../../lib/demoStorage";
import { isContact, isPersonName } from "../../lib/validation";
import { getVendor } from "../../data/vendors";
import { useUI } from "../../lib/ui";

type FieldErrors = {
  name?: string;
  contact?: string;
};

export function VendorModal({ vendorSlug, onClose }: { vendorSlug: string; onClose: () => void }) {
  const { notify } = useUI();
  const vendor = getVendor(vendorSlug);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState(
    vendor ? `Hola, vi su ficha en Llégate y quiero consultar por: ${vendor.offer}` : ""
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  if (!vendor) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!name.trim()) {
      next.name = "Escribe tu nombre.";
    } else if (!isPersonName(name)) {
      next.name = "Usa al menos 3 caracteres, sin números ni símbolos.";
    }
    if (!contact.trim()) {
      next.contact = "Escribe un correo o teléfono para que te respondan.";
    } else if (!isContact(contact)) {
      next.contact = "Escribe un correo válido o un teléfono de al menos 7 dígitos.";
    }

    setErrors(next);
    if (next.name) {
      document.getElementById("vendor-name")?.focus();
      return;
    }
    if (next.contact) {
      document.getElementById("vendor-contact")?.focus();
      return;
    }

    saveDemoLead("llegate_sim_vendor_messages", {
      vendor: vendor.slug,
      name: name.trim(),
      contact,
      message,
    });
    notify("Mensaje guardado en este navegador (demo).");
    setDone(true);
  };

  if (done) {
    return (
      <Modal onClose={onClose} title="Mensaje guardado" eyebrow={vendor.name} size="sm">
        <FormSuccess
          title={`${vendor.name} recibiría tu mensaje`}
          text={
            <>
              En producción, el negocio recibiría tu consulta y podría responderte por el canal que dejaste. En este
              prototipo no se envía nada.
            </>
          }
          actions={
            <>
              <Button to={`/mercado/negocio/${vendor.slug}`} onClick={onClose}>
                Ver ficha completa
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
    <Modal onClose={onClose} title={`Contactar a ${vendor.name}`} subtitle={vendor.offer} eyebrow="Mercado Motor" size="sm">
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            <Store className="h-3 w-3" /> {vendor.category}
          </Badge>
          {vendor.verified && (
            <Badge tone="success">
              <BadgeCheck className="h-3 w-3" /> Verificado
            </Badge>
          )}
        </div>
        <div className="mt-3 grid gap-1.5 text-[12.5px] text-ink-300">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-brand-400" /> {vendor.zone}, {vendor.city}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-brand-400" /> {vendor.hours}
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-4 grid gap-3">
        <TextField
          id="vendor-name"
          label="Tu nombre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
          }}
          error={errors.name}
          autoComplete="name"
          required
        />
        <TextField
          id="vendor-contact"
          label="Correo o teléfono"
          placeholder="tucorreo@ejemplo.com"
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            if (errors.contact) setErrors((current) => ({ ...current, contact: undefined }));
          }}
          error={errors.contact}
          hint="Solo para que te respondan. En esta demo no se envía fuera del navegador."
          autoComplete="email"
          required
        />
        <TextAreaField label="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="submit" full>
          Enviar mensaje
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-500">
          Verifica precios y condiciones directamente con el negocio. La ficha es informativa.
        </p>
      </form>
    </Modal>
  );
}
