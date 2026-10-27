import { useState } from "react";
import { ArrowRight, Building2, Handshake, MessageCircle } from "lucide-react";
import { Modal } from "../Modal";
import { Button } from "../ui";
import { FormSuccess, SelectField, TextAreaField, TextField, saveDemoLead } from "./shared";
import { useUI } from "../../lib/ui";

type Intent = "empresa" | "aliado" | "contacto";

const config: Record<
  Intent,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    submit: string;
    successTitle: string;
    successText: string;
    icon: typeof Building2;
    topics: string[];
    topicLabel: string;
    orgLabel?: string;
  }
> = {
  empresa: {
    eyebrow: "Llégate Empresas",
    title: "Movilidad para tu equipo",
    subtitle: "Cuéntanos cuántas personas se mueven y qué necesitas resolver. Te contactamos para preparar una propuesta.",
    submit: "Solicitar una llamada",
    successTitle: "Recibimos tu solicitud",
    successText:
      "En producción, el equipo comercial te escribiría en un día hábil para coordinar una llamada y revisar tu operación.",
    icon: Building2,
    topics: ["Traslados de personal", "Movilidad de clientes", "Eventos", "Delivery recurrente", "Otra necesidad"],
    topicLabel: "Qué necesitas resolver",
    orgLabel: "Empresa",
  },
  aliado: {
    eyebrow: "Alianzas",
    title: "Hablemos de una alianza",
    subtitle: "Marcas, talleres, comercios y medios: si tu audiencia se mueve por Venezuela, hay algo que construir juntos.",
    submit: "Enviar propuesta",
    successTitle: "Propuesta guardada",
    successText:
      "En producción, revisaríamos la propuesta y te responderíamos por correo para agendar una conversación.",
    icon: Handshake,
    topics: ["Patrocinio de marca", "Taller o comercio aliado", "Medio o creador de contenido", "Institución", "Otra alianza"],
    topicLabel: "Tipo de alianza",
    orgLabel: "Marca u organización",
  },
  contacto: {
    eyebrow: "Atención",
    title: "Escríbenos",
    subtitle: "Cuéntanos qué necesitas y te respondemos por el canal que prefieras.",
    submit: "Enviar mensaje",
    successTitle: "Mensaje guardado",
    successText:
      "En producción, nuestro equipo te respondería en horario de atención, de lunes a sábado.",
    icon: MessageCircle,
    topics: ["Viajes", "Pagos y tarifas", "Conductores", "Mercado Motor", "Prensa", "Otro"],
    topicLabel: "Tema",
  },
};

export function LeadModal({ intent, onClose }: { intent: Intent; onClose: () => void }) {
  const { notify } = useUI();
  const c = config[intent];
  const Icon = c.icon;
  const [form, setForm] = useState({
    name: "",
    org: "",
    contact: "",
    topic: c.topics[0],
    message: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setError("Escribe tu nombre.");
      return;
    }
    if (form.contact.trim().length < 7) {
      setError("Escribe un correo o teléfono válido.");
      return;
    }
    saveDemoLead(`llegate_sim_${intent}`, form);
    notify("Mensaje guardado en este navegador (demo).");
    setDone(true);
  }

  if (done) {
    return (
      <Modal onClose={onClose} title={c.successTitle} eyebrow={c.eyebrow} size="sm">
        <FormSuccess
          title="Listo, quedó registrado aquí"
          text={c.successText}
          actions={
            <Button onClick={onClose}>Cerrar</Button>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={c.title} subtitle={c.subtitle} eyebrow={c.eyebrow} size="md">
      {intent === "empresa" && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {["Un solo proveedor", "Pago centralizado", "Reportes de uso"].map((b) => (
            <div key={b} className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 text-[11px] text-ink-300">
              {b}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Tu nombre" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          <TextField
            label={c.orgLabel ?? "Empresa u organización"}
            value={form.org}
            onChange={(e) => set("org", e.target.value)}
            placeholder={intent === "contacto" ? "Opcional" : ""}
          />
        </div>
        <TextField
          label={intent === "contacto" ? "Correo o teléfono" : "Correo corporativo"}
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          required
        />
        <SelectField label={c.topicLabel} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
          {c.topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <TextAreaField
          label="Mensaje"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={
            intent === "empresa"
              ? "Ej. 40 personas en Caracas y Valencia, traslados nocturnos..."
              : "Cuéntanos brevemente qué tienes en mente"
          }
        />
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" full>
          <Icon className="h-4 w-4" />
          {c.submit} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-ink-500">
          Simulación: el formulario no envía datos reales.
        </p>
      </form>
    </Modal>
  );
}
