import { useState } from "react";
import { ArrowRight, Check, Download, Globe, Play, ShieldCheck, Smartphone } from "lucide-react";
import { Modal } from "../Modal";
import { Button, DemoNote } from "../ui";
import { FormSuccess, OptionCard, SelectField, TextField, saveDemoLead } from "./shared";
import { useUI } from "../../lib/ui";
import { HUBS } from "../../data/site";

type Platform = "ios" | "android" | "web";

const platformLabel: Record<Platform, string> = {
  ios: "iPhone",
  android: "Android",
  web: "Navegador",
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

export function DownloadModal({ intent, onClose }: { intent?: "download" | "signin"; onClose: () => void }) {
  const { notify } = useUI();
  const [platform, setPlatform] = useState<Platform>(detectPlatform());
  const [contact, setContact] = useState("");
  const [city, setCity] = useState(HUBS[0].city);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const isSignin = intent === "signin";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (contact.trim().length < 7) {
      setError("Escribe un correo o un número de teléfono válido.");
      return;
    }
    if (!consent) {
      setError("Marca la casilla para autorizar el aviso de lanzamiento.");
      return;
    }
    setError("");
    saveDemoLead("llegate_sim_waitlist", { platform, contact, city, intent: intent ?? "download" });
    setDone(true);
    notify("Listo. Guardamos tu aviso en este navegador (demo).");
  }

  if (done) {
    return (
      <Modal
        onClose={onClose}
        title={isSignin ? "Ya casi tienes tu acceso" : "Quedaste en la lista"}
        eyebrow="Lanzamiento"
        size="md"
      >
        <FormSuccess
          title={isSignin ? "Tu cuenta vive en la app" : "Te avisamos el día del lanzamiento"}
          text={
            <>
              Guardamos tu contacto para la versión de <strong className="text-white">{platformLabel[platform]}</strong>{" "}
              y tu ciudad (<strong className="text-white">{city}</strong>). En producción recibirías un enlace personal
              para crear tu cuenta o descargar la app.
            </>
          }
          actions={
            <>
              <Button to="/app" onClick={onClose}>
                Probar la demo web <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </>
          }
          note={
            <DemoNote>
              el aviso se guardó solo en este navegador. Este prototipo no envía correos, mensajes ni enlaces de
              descarga, y no hay una app publicada todavía.
            </DemoNote>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title={isSignin ? "Ingresa desde la app" : "La app está por llegar"}
      subtitle={
        isSignin
          ? "Tu cuenta, tus viajes y tu saldo viven en la app móvil. Déjanos tu contacto y te enviamos el acceso cuando esté publicada."
          : "Déjanos tu correo o teléfono y te avisamos el día que Llégate esté disponible en tu tienda."
      }
      eyebrow={isSignin ? "Acceso" : "Descarga"}
      size="md"
    >
      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 text-[11.5px] text-ink-300">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-400" /> Pago en Bs y USD
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 text-[11.5px] text-ink-300">
          <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" /> Precio antes de pedir
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-2 text-[11.5px] text-ink-300">
          <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" /> Ruta compartida
        </div>
      </div>

      <p className="label">¿Dónde la vas a usar?</p>
      <div className="grid grid-cols-3 gap-2">
        <OptionCard
          compact
          active={platform === "ios"}
          onClick={() => setPlatform("ios")}
          title="iPhone"
          icon={<Smartphone className="h-4 w-4" />}
        />
        <OptionCard
          compact
          active={platform === "android"}
          onClick={() => setPlatform("android")}
          title="Android"
          icon={<Play className="h-4 w-4" />}
        />
        <OptionCard
          compact
          active={platform === "web"}
          onClick={() => setPlatform("web")}
          title="Navegador"
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      {platform === "web" ? (
        <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/[0.08] p-4">
          <p className="text-[13.5px] font-semibold text-white">Puedes probar el flujo ahora mismo</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
            La demo web reproduce la experiencia de pedir un viaje, enviar un paquete y registrarte como conductor.
            No procesa solicitudes reales.
          </p>
          <Button size="sm" className="mt-3" to="/app" onClick={onClose}>
            Abrir la demo <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-white">
              {platform === "ios" ? "App Store" : "Google Play"}
            </span>
            <span className="rounded-full border border-racing-500/30 bg-racing-500/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-racing-400">
              Próximamente
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
            No agregamos un botón de descarga que no funciona. Cuando la app esté publicada, esta misma ventana
            mostrará el enlace real de la tienda y un código QR verificable.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 grid gap-3">
        <TextField
          label={isSignin ? "Correo o teléfono de tu cuenta" : "Correo o teléfono"}
          placeholder="tucorreo@ejemplo.com o 0414 000 0000"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoComplete="email"
          required
        />
        <SelectField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)}>
          {HUBS.map((h) => (
            <option key={h.stateId} value={h.city}>
              {h.city}
            </option>
          ))}
          <option value="Otra ciudad">Otra ciudad de Venezuela</option>
        </SelectField>

        <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink-300">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            Acepto recibir un aviso sobre el lanzamiento de la app. Puedo retirar mi consentimiento cuando quiera.
            <span className="ml-1 text-ink-500">(En esta demo no se envía nada.)</span>
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" full>
          <Download className="h-4 w-4" />
          {isSignin ? "Enviarme el acceso" : "Avísame cuando esté disponible"}
        </Button>
        <p className="text-center text-[11.5px] text-ink-500">
          Sin spam. Un solo mensaje cuando la app esté lista.
        </p>
      </form>
    </Modal>
  );
}
