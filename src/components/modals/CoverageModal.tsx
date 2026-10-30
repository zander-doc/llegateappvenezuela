import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { FormSuccess, TextField } from "./shared";
import { saveDemoLead } from "../../lib/demoStorage";
import { isContact } from "../../lib/validation";
import { useUI } from "../../lib/ui";
import { COVERAGE_LABEL, HUBS } from "../../data/site";

type FieldErrors = {
  town?: string;
  contact?: string;
};

export function CoverageModal({ city = "", onClose }: { city?: string; onClose: () => void }) {
  const { notify } = useUI();
  const [town, setTown] = useState(city);
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  const hub = HUBS.find((h) => h.city.toLowerCase() === town.trim().toLowerCase());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!town.trim()) {
      next.town = "Indica tu ciudad o municipio.";
    }
    if (!contact.trim()) {
      next.contact = "Escribe un correo o teléfono para avisarte.";
    } else if (!isContact(contact)) {
      next.contact = "Escribe un correo válido o un teléfono de al menos 7 dígitos.";
    }

    setErrors(next);
    if (next.town) {
      document.getElementById("coverage-town")?.focus();
      return;
    }
    if (next.contact) {
      document.getElementById("coverage-contact")?.focus();
      return;
    }

    saveDemoLead("llegate_sim_coverage", { city: town.trim(), contact });
    setDone(true);
    notify("Solicitud de cobertura guardada (demo).");
  }

  if (done) {
    return (
      <Modal onClose={onClose} title="Solicitud guardada" eyebrow="Cobertura" size="sm">
        <FormSuccess
          title={`Anotamos ${town}`}
          text={
            <>
              En producción te avisaríamos por el correo o teléfono que dejaste cuando abramos operaciones en tu zona.
              Aquí solo queda anotado en este navegador; puedes revisar las ciudades de lanzamiento y piloto en la
              página de cobertura.
            </>
          }
          actions={
            <>
              <Button to="/cobertura" onClick={onClose}>
                Ver cobertura <ArrowRight className="h-4 w-4" />
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
      title="Solicita cobertura"
      subtitle="Dinos dónde la necesitas y te avisamos cuando Llégate llegue a tu zona."
      eyebrow="Cobertura"
      size="sm"
    >
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.07] px-2 py-2.5">
          <p className="mono text-[18px] font-semibold text-white">8</p>
          <p className="text-[10px] leading-tight text-ink-400">estados de lanzamiento</p>
        </div>
        <div className="rounded-xl border border-racing-500/20 bg-racing-500/[0.05] px-2 py-2.5">
          <p className="mono text-[18px] font-semibold text-white">4</p>
          <p className="text-[10px] leading-tight text-ink-400">ciudades piloto</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] px-2 py-2.5">
          <p className="mono text-[18px] font-semibold text-white">24</p>
          <p className="text-[10px] leading-tight text-ink-400">estados planificados</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="grid gap-3">
        <TextField
          id="coverage-town"
          label="Ciudad o municipio"
          placeholder="Ej. Barquisimeto, Lara"
          value={town}
          onChange={(e) => {
            setTown(e.target.value);
            if (errors.town) setErrors((current) => ({ ...current, town: undefined }));
          }}
          error={errors.town}
          list="coverage-city-options"
          autoComplete="address-level2"
          required
        />
        <datalist id="coverage-city-options">
          {HUBS.map((h) => (
            <option key={h.stateId} value={`${h.city}, ${h.stateName}`} />
          ))}
        </datalist>
        {hub && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
            <MapPin className="h-3.5 w-3.5 text-brand-400" />
            {COVERAGE_LABEL[hub.status]} · {hub.stateName}
          </p>
        )}
        <TextField
          id="coverage-contact"
          label="Correo o teléfono"
          placeholder="tucorreo@ejemplo.com"
          value={contact}
          onChange={(e) => {
            setContact(e.target.value);
            if (errors.contact) setErrors((current) => ({ ...current, contact: undefined }));
          }}
          error={errors.contact}
          hint="Solo para avisarte. En esta demo no se envía fuera del navegador."
          autoComplete="email"
          required
        />
        <Button type="submit" full>
          Avísame cuando lleguen
        </Button>
        <p className="text-center text-[11px] text-ink-500">Solo un mensaje cuando la cobertura esté activa.</p>
      </form>
    </Modal>
  );
}
