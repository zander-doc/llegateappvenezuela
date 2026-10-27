import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  Clock,
  Compass,
  Download,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Accordion, Badge, Button, Eyebrow, PageHero, ServiceIcon } from "../components/ui";
import { useUI } from "../lib/ui";
import { FAQ_GROUPS } from "../data/faqs";
import { SERVICES } from "../data/services";

const quickLinks = [
  {
    icon: Calculator,
    title: "Cómo se calcula tu tarifa",
    text: "Base, distancia y recargos explicados con un ejemplo.",
    to: "/tarifas",
    label: "Ver tarifas",
  },
  {
    icon: MapPin,
    title: "¿Hay servicio en tu ciudad?",
    text: "Busca tu estado y consulta el estado de cobertura.",
    to: "/cobertura",
    label: "Revisar cobertura",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad durante el viaje",
    text: "Verificación, ruta compartida y botón de emergencia.",
    to: "/seguridad",
    label: "Ver seguridad",
  },
  {
    icon: Smartphone,
    title: "Probar la app sin instalar nada",
    text: "Una demo interactiva con los flujos principales.",
    to: "/app",
    label: "Abrir la demo",
  },
  {
    icon: Compass,
    title: "Trabajar como conductor",
    text: "Requisitos, planes y calculadora de ganancias.",
    to: "/conductores",
    label: "Ver conductores",
  },
  {
    icon: Download,
    title: "Cuándo se lanza la app",
    text: "Déjanos tu contacto y te avisamos el día del lanzamiento.",
    action: "download" as const,
    label: "Avísame",
  },
];

export function AyudaPage() {
  const { openModal } = useUI();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return FAQ_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q))
        .map((item) => ({ ...item, group: group.title, groupId: group.id }))
    );
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <PageHero
        kicker="Centro de ayuda"
        title={
          <>
            ¿En qué
            <br />
            te ayudamos?
          </>
        }
        description="Respuestas claras sobre viajes, pagos, conductores, seguridad y la app. Si no encuentras lo que buscas, escríbenos."
        crumbs={[{ label: "Ayuda", to: "/ayuda" }]}
        compact
      />

      <section className="wrap -mt-6 pb-4 sm:-mt-8">
        <div className="rounded-2xl border border-white/10 bg-ink-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca: cancelar, pagar en bolívares, registro..."
              aria-label="Buscar en el centro de ayuda"
              className="field pl-11 pr-11 text-[15px]"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Borrar búsqueda"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-500">Búsquedas frecuentes</span>
            {["cancelar", "BCV", "plan Pro", "seguridad"].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="chip transition hover:border-brand-400/50 hover:text-white"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {hasQuery && (
        <section className="wrap pb-6" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-400">
              {results.length === 0
                ? "Sin resultados para tu búsqueda."
                : `${results.length} ${results.length === 1 ? "resultado" : "resultados"} para “${query.trim()}”`}
            </p>
            <button type="button" onClick={() => setQuery("")} className="text-[12.5px] font-semibold text-brand-400 hover:text-brand-300">
              Limpiar
            </button>
          </div>
          {results.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-center">
              <HelpCircle className="mx-auto h-7 w-7 text-ink-500" />
              <p className="mt-3 text-[14px] text-ink-300">No encontramos esa pregunta.</p>
              <p className="mt-1 text-[12.5px] text-ink-500">
                Prueba con otra palabra o escríbenos directamente.
              </p>
              <Button className="mt-4" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
                <MessageCircle className="h-4 w-4" /> Escribir al equipo
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {results.map((item) => (
                <details
                  key={`${item.groupId}-${item.q}`}
                  className="group rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-semibold text-white">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{item.group}</Badge>
                      {item.q}
                    </span>
                    <span className="text-[11px] text-ink-500 group-open:hidden">Abrir</span>
                    <span className="hidden text-[11px] text-ink-500 group-open:inline">Cerrar</span>
                  </summary>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">{item.a}</p>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="wrap pb-12 pt-6 sm:pb-16">
        <Eyebrow>Accesos rápidos</Eyebrow>
        <h2 className="heading mt-3 text-[26px] font-bold text-white sm:text-[32px]">Resuelve lo más común</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const inner = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="heading mt-3 text-[15.5px] font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{item.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-400">
                  {item.label} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </>
            );
            if ("to" in item) {
              return (
                <Link key={item.title} to={item.to!} className="card card-hover p-5">
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => openModal({ type: "download" })}
                className="card card-hover p-5 text-left"
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      <section id="elegir" className="scroll-mt-32 border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <Eyebrow>Guía rápida</Eyebrow>
          <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">¿Qué servicio te conviene?</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-400">
            Elige por lo que necesitas mover, no por el nombre del vehículo. Cada ficha incluye tarifa base, capacidad
            y ejemplos de ruta.
          </p>

          <div className="mt-6 grid gap-2">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                to={`/servicios/${service.slug}`}
                className="group grid items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 transition hover:border-brand-400/40 hover:bg-white/[0.04] sm:grid-cols-[auto_1.1fr_1.4fr_auto]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-brand-400">
                  <ServiceIcon icon={service.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[14.5px] font-semibold text-white">{service.name}</p>
                  <p className="text-[11.5px] text-ink-500">Hasta {service.capacity}</p>
                </div>
                <p className="text-[12.5px] leading-relaxed text-ink-400">{service.bestFor}</p>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-400">
                  Desde {service.fromUSD.toFixed(2).replace(".", ",")}$ <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-5">
            <Button variant="secondary" onClick={() => openModal({ type: "fare" })}>
              <Calculator className="h-4 w-4" /> Calcular un trayecto
            </Button>
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <Eyebrow>Base de conocimiento</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Todas las respuestas</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Organizadas por tema. Si tu duda no aparece, el equipo puede responderla por correo o WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FAQ_GROUPS.map((group) => (
                <a key={group.id} href={`#${group.id}`} className="chip hover:border-brand-400/50 hover:text-white">
                  {group.title}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {FAQ_GROUPS.map((group) => (
              <div key={group.id} id={group.id} className="scroll-mt-32">
                <div className="mb-2.5 flex items-center gap-2">
                  <h3 className="heading text-[18px] font-bold text-white">{group.title}</h3>
                  <span className="text-[11px] text-ink-500">{group.items.length} preguntas</span>
                </div>
                <Accordion items={group.items} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="wrap scroll-mt-32 pb-16">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-5 sm:col-span-2">
            <Badge tone="brand">
              <MessageCircle className="h-3 w-3" /> Atención humana
            </Badge>
            <h2 className="heading mt-3 text-[22px] font-bold text-white">¿Seguimos sin resolverlo?</h2>
            <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-300">
              Escríbenos con el detalle de tu caso. En producción respondemos de lunes a sábado, de 8:00 a 20:00.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => openModal({ type: "lead", intent: "contacto" })}>
                <MessageCircle className="h-4 w-4" /> Enviar un mensaje
              </Button>
              <Button variant="secondary" href="mailto:hola@llegate.app">
                <Mail className="h-4 w-4" /> hola@llegate.app
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-ink-500">
              Simulación: el formulario guarda el mensaje solo en este navegador.
            </p>
          </div>
          <div className="card p-5">
            <Clock className="h-5 w-5 text-racing-400" />
            <p className="heading mt-2 text-[15px] font-bold text-white">Horario de atención</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
              Lunes a sábado
              <br />
              8:00 a 20:00 (hora de Venezuela)
            </p>
            <div className="mt-3 border-t border-white/8 pt-3 text-[11.5px] leading-relaxed text-ink-500">
              Emergencias durante un viaje: usa el botón de emergencia de la app o llama al 911.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
