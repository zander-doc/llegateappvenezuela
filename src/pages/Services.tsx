import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  Check,
  Clock,
  Download,
  MapPin,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  InlineLink,
  Money,
  PageHero,
  RateNote,
  SectionHead,
  ServiceIcon,
} from "../components/ui";
import { ServiceCard } from "../components/ServiceCard";
import { useUI } from "../lib/ui";
import { SERVICES, getService } from "../data/services";
import { estimateFare, formatKm, formatUSD } from "../lib/format";

export function ServiciosPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Servicios"
        title={
          <>
            Una app.
            <br />
            Seis formas de moverte.
          </>
        }
        description="Moto para lo rápido, carro para el grupo, minivan para el aeropuerto, autobús para la frontera, delivery para un paquete y carga para lo que no cabe en el maletero."
        crumbs={[{ label: "Servicios", to: "/servicios" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "download" })}>
              <Download className="h-4 w-4" /> Descargar la app
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "fare" })}>
              <Calculator className="h-4 w-4" /> Calcular tarifa
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Comparación rápida</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[11px] text-ink-400">Más económico</p>
                <p className="mt-1 text-[15px] font-semibold text-white">Mototaxi</p>
                <p className="mono text-[11.5px] text-racing-400">Desde $1,50</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[11px] text-ink-400">Para grupos</p>
                <p className="mt-1 text-[15px] font-semibold text-white">Minivan VIP</p>
                <p className="mono text-[11.5px] text-racing-400">7 plazas</p>
              </div>
            </div>
            <Link to="/tarifas" className="mt-3 flex items-center justify-between text-[12.5px] font-semibold text-brand-400">
              Ver tabla completa <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <ServiceCard key={service.slug} service={service} index={i} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Elige por necesidad"
            title="¿Qué necesitas mover hoy?"
            text="Una guía rápida para no equivocarte de servicio."
            align="center"
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Llegar rápido",
                text: "Trayectos cortos y tráfico pesado. Un pasajero, precio bajo.",
                service: "mototaxi",
                label: "Mototaxi",
              },
              {
                title: "Moverme con otros",
                text: "Familia, diligencias o equipaje. Hasta cuatro pasajeros.",
                service: "taxi-pana",
                label: "Taxi Pana",
              },
              {
                title: "Enviar algo",
                text: "Documentos, comida o un paquete de hasta 5 kg hoy mismo.",
                service: "delivery",
                label: "Delivery Express",
              },
            ].map((item) => (
              <Link
                key={item.title}
                to={`/servicios/${item.service}`}
                className="card card-hover group p-5"
              >
                <h3 className="heading text-[18px] font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-400">
                  {item.label} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ServiceDetailPage() {
  const { slug } = useParams();
  const service = getService(slug);
  const { openModal } = useUI();

  if (!service) {
    return (
      <section className="wrap py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">Servicio</p>
        <h1 className="heading mt-3 text-[34px] font-bold text-white">No encontramos ese servicio</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-300">
          Puede que el enlace esté incompleto. Mira los seis servicios disponibles.
        </p>
        <Button to="/servicios" className="mt-6">
          Ver servicios <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    );
  }

  const exampleKm = 8;
  const exampleFare = estimateFare(service.fromUSD, service.perKmUSD, exampleKm);
  const others = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <PageHero
        kicker={`Servicio · ${service.eta}`}
        title={service.name}
        description={
          <>
            <span className="font-medium text-white">{service.tagline}</span> {service.description}
          </>
        }
        crumbs={[
          { label: "Servicios", to: "/servicios" },
          { label: service.name, to: `/servicios/${service.slug}` },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "download" })}>
              <Download className="h-4 w-4" /> Pedir en la app
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => openModal({ type: "fare", serviceSlug: service.slug })}
            >
              <Calculator className="h-4 w-4" /> Calcular tarifa
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                <ServiceIcon icon={service.icon} className="h-5.5 w-5.5" />
              </span>
              <Badge tone="success">
                <Check className="h-3 w-3" /> Disponible al lanzar
              </Badge>
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-wider text-ink-500">Tarifa de referencia</p>
            <Money usd={service.fromUSD} size="lg" className="mt-1" />
            <p className="mt-1 text-[12px] text-ink-400">
              + <span className="mono">${service.perKmUSD.toFixed(2)}</span> por km
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-[11.5px]">
              <span className="flex items-center gap-1.5 text-ink-300">
                <Users className="h-3.5 w-3.5 text-brand-400" /> {service.capacity}
              </span>
              <span className="flex items-center gap-1.5 text-ink-300">
                <Clock className="h-3.5 w-3.5 text-brand-400" /> {service.eta}
              </span>
            </div>
          </div>
        }
      />

      <section className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-400">Ideal para</p>
              <ul className="mt-3 grid gap-2">
                {service.bestFor.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13.5px] text-ink-200">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-400">Qué incluye</p>
              <CheckList className="mt-3" items={service.features} />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="heading text-[24px] font-bold text-white">Rutas de ejemplo</h2>
            <p className="mt-1 text-[13.5px] text-ink-400">
              Precios de referencia para recorridos típicos. El estimado final depende de la distancia y las paradas.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-white/[0.04] text-[10.5px] uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Desde</th>
                    <th className="px-4 py-3 font-semibold">Hasta</th>
                    <th className="px-4 py-3 text-right font-semibold">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {service.routes.map((r) => (
                    <tr key={`${r.from}-${r.to}`} className="transition hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-ink-200">{r.from}</td>
                      <td className="px-4 py-3 text-ink-300">{r.to}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="mono font-semibold text-white">{formatUSD(r.usd)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-500">
              Distancias y precios de demostración. No representan una tarifa vigente.
            </p>
          </div>

          <div className="mt-8">
            <h2 className="heading text-[24px] font-bold text-white">Preguntas sobre {service.name}</h2>
            <div className="mt-4">
              <Accordion items={service.faqs} />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <Eyebrow>Ejemplo de tarifa</Eyebrow>
            <p className="mt-3 text-[13px] text-ink-400">Recorrido urbano de {formatKm(exampleKm)}</p>
            <Money usd={exampleFare} size="lg" className="mt-1" />
            <div className="mt-3 grid gap-1.5 border-t border-white/8 pt-3 text-[12px] text-ink-400">
              <div className="flex justify-between">
                <span>Tarifa base</span>
                <span className="mono">{formatUSD(service.fromUSD)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {formatKm(exampleKm)} × ${service.perKmUSD.toFixed(2)}
                </span>
                <span className="mono">{formatUSD(service.perKmUSD * exampleKm)}</span>
              </div>
            </div>
            <Button full className="mt-4" onClick={() => openModal({ type: "fare", serviceSlug: service.slug })}>
              Ajustar distancia
            </Button>
            <div className="mt-3">
              <RateNote />
            </div>
          </div>

          <div className="card mt-3 p-5">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
            <p className="heading mt-2 text-[15px] font-bold text-white">En cada viaje</p>
            <ul className="mt-2 grid gap-1.5 text-[12px] text-ink-300">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand-400" /> Conductor verificado
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand-400" /> Precio antes de pedir
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-brand-400" /> Ruta compartida
              </li>
            </ul>
            <InlineLink to="/seguridad">Ver seguridad</InlineLink>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[11.5px] text-ink-400">
            <MapPin className="h-4 w-4 shrink-0 text-brand-400" />
            Cobertura de lanzamiento en 8 estados.{" "}
            <Link to="/cobertura" className="font-semibold text-brand-400">
              Ver
            </Link>
          </div>
        </aside>
      </section>

      <section className="border-t border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Otros servicios"
            title="También te puede servir"
            action={
              <Link to="/servicios" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-400">
                Ver todos <Route className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {others.map((s, i) => (
              <ServiceCard key={s.slug} service={s} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
