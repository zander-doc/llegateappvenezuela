import { useState } from "react";
import { BadgeCheck, Clock, MapPin, Store } from "lucide-react";
import { Modal } from "../Modal";
import { Badge, Button } from "../ui";
import { FormSuccess, TextAreaField, TextField, saveDemoLead } from "./shared";
import { getVendor } from "../../data/vendors";
import { useUI } from "../../lib/ui";

export function VendorModal({ vendorSlug, onClose }: { vendorSlug: string; onClose: () => void }) {
  const { notify } = useUI();
  const vendor = getVendor(vendorSlug);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState(
    vendor ? `Hola, vi su ficha en Llégate y quiero consultar por: ${vendor.offer}` : ""
  );
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!vendor) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Escribe tu nombre.");
      return;
    }
    if (contact.trim().length < 7) {
      setError("Escribe un correo o teléfono para que te respondan.");
      return;
    }
    saveDemoLead("llegate_sim_vendor_messages", { vendor: vendor.slug, name, contact, message });
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

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <TextField label="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField
          label="Correo o teléfono"
          placeholder="tucorreo@ejemplo.com"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
        <TextAreaField label="Mensaje" value={message} onChange={(e) => setMessage(e.target.value)} />
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}
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
