import {
  AlertTriangle,
  ArrowRight,
  Check,
  LifeBuoy,
  MapPin,
  Phone,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserCheck,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  PageHero,
  SectionHead,
} from "../components/ui";
import { useUI } from "../lib/ui";
import { FAQ_GROUPS } from "../data/faqs";

export function SeguridadPage() {
  const { openModal } = useUI();
  const faqs = FAQ_GROUPS.find((g) => g.id === "seguridad")!.items;

  return (
    <>
      <PageHero
        kicker="Seguridad"
        title={
          <>
            Seguridad
            <br />
            en cada tramo.
          </>
        }
        description="Verificamos a quien conduce, mostramos el precio antes de subir y te damos herramientas para compartir tu ruta y pedir ayuda durante el viaje."
        crumbs={[{ label: "Seguridad", to: "/seguridad" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "download" })}>
              <ShieldCheck className="h-4 w-4" /> Descargar la app
            </Button>
            <Button size="lg" variant="secondary" to="/ayuda#contacto">
              Hablar con soporte
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Badge tone="success">
              <ShieldCheck className="h-3 w-3" /> Protocolo activo
            </Badge>
            <div className="mt-4 grid gap-3">
              {[
                { icon: UserCheck, label: "Verificación antes de activar" },
                { icon: Share2, label: "Ruta compartida en vivo" },
                { icon: Siren, label: "Botón de emergencia" },
                { icon: LifeBuoy, label: "Soporte durante el viaje" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2.5 text-[12.5px] text-ink-200">
                    <Icon className="h-4 w-4 shrink-0 text-brand-400" /> {item.label}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-white/8 pt-3 text-[10.5px] leading-relaxed text-ink-500">
              El protocolo completo y las coberturas aplicables se detallan en los términos del servicio.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Antes de subir"
          title="La verificación no es un trámite"
          text="Revisamos identidad, licencia, documentos del vehículo y antecedentes antes de activar una cuenta."
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserCheck, title: "Identidad", text: "La persona coincide con la cédula y la licencia." },
            { icon: ShieldCheck, title: "Vehículo", text: "Documentos vigentes y revisión del estado del vehículo." },
            { icon: ShieldAlert, title: "Antecedentes", text: "Revisión estándar antes de habilitar la cuenta." },
            { icon: MapPin, title: "Ciudad", text: "La verificación se asocia a la ciudad donde opera." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="heading mt-3.5 text-[16px] font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                phase: "Durante el viaje",
                title: "Tu ruta, visible para quien tú elijas",
                points: [
                  "Comparte un enlace en vivo sin que la otra persona tenga la app.",
                  "La unidad y el avance se actualizan en el mapa.",
                  "Puedes dejar de compartir en cualquier momento.",
                ],
                icon: Share2,
              },
              {
                phase: "Si algo no va bien",
                title: "Un botón para pedir ayuda",
                points: [
                  "Comparte tu ubicación con tus contactos de confianza.",
                  "Llama a los servicios de emergencia desde la misma pantalla.",
                  "El equipo recibe la alerta y contacta al conductor.",
                ],
                icon: Siren,
              },
              {
                phase: "Después del viaje",
                title: "Todo queda registrado",
                points: [
                  "Recibo con recorrido, monto y tasa BCV aplicada.",
                  "Puedes reportar una incidencia desde el historial.",
                  "El equipo revisa el caso y te da seguimiento.",
                ],
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.phase} className="card p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-500">{item.phase}</p>
                  <h3 className="heading mt-1.5 text-[17px] font-bold text-white">{item.title}</h3>
                  <ul className="mt-3 grid gap-2">
                    {item.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">Emergencia</p>
            </div>
            <h2 className="heading mt-2 text-[24px] font-bold text-white">Si estás en peligro ahora</h2>
            <ol className="mt-4 grid gap-3">
              {[
                "Abre la app y toca el botón de emergencia del viaje activo.",
                "Comparte tu ubicación con tus contactos y llama a emergencias.",
                "Si puedes, avisa al conductor y baja en un lugar seguro y concurrido.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-ink-200">
                  <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[11px] font-semibold text-red-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 border-t border-red-500/20 pt-3 text-[11px] leading-relaxed text-ink-400">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
              En Venezuela, el número de emergencias es 911. El botón de la app complementa la llamada, no la sustituye.
            </p>
          </div>

          <div className="card p-6">
            <Eyebrow>Reportes</Eyebrow>
            <h2 className="heading mt-2 text-[24px] font-bold text-white">¿Algo no salió bien?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
              Cuéntanos qué pasó con el viaje, el conductor o el pago. Revisamos cada reporte y damos seguimiento por
              el canal que elijas.
            </p>
            <CheckList
              className="mt-4"
              items={["Confidencialidad del reporte", "Seguimiento del equipo", "Respuesta en horario de atención"]}
            />
            <Button className="mt-5 w-full" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              Reportar una incidencia <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-[10.5px] text-ink-500">Simulación: el reporte no se envía.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900">
        <div className="wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Preguntas de seguridad</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Lo que debes saber</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              La seguridad es un proceso continuo: verificación, herramientas en la app y revisión de cada reporte.
            </p>
          </div>
          <Accordion items={faqs} />
        </div>
      </section>
    </>
  );
}
