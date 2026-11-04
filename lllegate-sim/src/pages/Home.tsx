import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Crown,
  Download,
  Gift,
  MapPin,
  MessageCircle,
  Percent,
  ReceiptText,
  Route,
  ShieldCheck,
  Share2,
  Siren,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  InlineLink,
  Money,
  SectionHead,
  ServiceIcon,
} from "../components/ui";
import { Hero } from "../components/Hero";
import { Ticker } from "../components/Ticker";
import { Stagger, StaggerItem } from "../components/Motion";
import { ServiceCard } from "../components/ServiceCard";
import { VendorCard } from "../components/VendorCard";
import { FareEstimator } from "../components/FareEstimator";
import { CoverageSearch } from "../components/CoverageSearch";
import { useUI } from "../lib/ui";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";
import { PILOT_RULES } from "../data/prepaid";
import { formatUSD } from "../lib/format";
import { VENDORS } from "../data/vendors";
import { homeFaqs } from "../data/faqs";
import { SAFETY_POINTS, STEPS } from "../data/site";
import { DEMO_BCV_RATE, formatRate } from "../lib/format";

const safetyIcons = [ShieldCheck, Share2, Siren, Wallet];

export function HomePage() {
  const { openModal } = useUI();
  const homeFaqItems = homeFaqs.flatMap((g) => g.items).slice(0, 6);
  const featuredVendors = VENDORS.slice(0, 3);

  return (
    <>
      <Hero />
      <Ticker />

      {/* Services */}
      <section className="wrap py-14 sm:py-20">
        <SectionHead
          kicker="Arranque por fases"
          title={
            <>
              Tres servicios para empezar.
              <br className="hidden sm:block" /> Una sola app.
            </>
          }
          text="El lanzamiento se concentra en mototaxi, taxi y delivery. Cuando estos pilotos estén afinados, sumamos minivan, autobús y carga."
          action={
            <Button variant="secondary" to="/servicios">
              Ver servicios <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LAUNCH_SERVICES.map((service, i) => (
            <StaggerItem key={service.slug} className="h-full">
              <ServiceCard service={service} index={i} />
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-racing-500" aria-hidden="true" />
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-300">En camino</p>
            </div>
            <p className="text-[11.5px] text-ink-500">Se abren a medida que los servicios piloto se ajustan</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {UPCOMING_SERVICES.map((service) => (
              <Link
                key={service.slug}
                to={`/servicios/${service.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2.5 transition hover:border-brand-500/40"
              >
                <span className="text-brand-400">
                  <ServiceIcon icon={service.icon} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-white">{service.name}</span>
                  <span className="block text-[11px] text-ink-500">Próximamente · {service.phase}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-500 transition group-hover:text-brand-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-14 sm:py-20">
          <SectionHead
            kicker="Así de simple"
            title="Tres pasos y estás en camino."
            text="Sin llamadas, sin regatear y sin adivinar cuánto vas a pagar."
            align="center"
          />
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="card relative overflow-hidden p-6">
                <span className="display absolute -right-2 -top-3 text-[86px] leading-none text-white/[0.05]">
                  {step.n}
                </span>
                <span className="stripe-mark" aria-hidden="true" />
                <h3 className="heading mt-4 text-[19px] font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:px-5">
            <p className="flex items-center gap-2.5 text-[13px] text-ink-300">
              <Sparkles className="h-4 w-4 shrink-0 text-racing-500" />
              ¿Quieres verlo antes de descargar? La demo web reproduce el flujo completo.
            </p>
            <Button size="sm" variant="secondary" to="/app">
              Abrir la demo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Fare estimator */}
      <section className="asphalt-soft border-b border-white/8">
        <div className="wrap grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Sin regateo</Eyebrow>
            <h2 className="heading mt-3 text-[32px] font-bold text-white sm:text-[40px]">
              Calcula antes de salir.
            </h2>
            <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-300">
              Ajusta el servicio y la distancia. Verás la tarifa en dólares y en bolívares con la misma tasa BCV que
              usa la app. Lo que confirmas es lo que pagas.
            </p>
            <CheckList
              className="mt-5"
              items={[
                "Tarifa mínima y distancia desglosadas",
                "Una sola tasa BCV para web, app y recibo",
                "Sin cargos que aparezcan al final del viaje",
              ]}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => openModal({ type: "bcv" })} className="chip">
                <Wallet className="h-3.5 w-3.5 text-racing-500" />
                BCV {formatRate(DEMO_BCV_RATE)} Bs/USD
              </button>
              <Link to="/tarifas" className="chip">
                Ver tabla de tarifas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <FareEstimator onPrimary={() => openModal({ type: "download" })} />
        </div>
      </section>

      {/* Coverage */}
      <section className="wrap py-14 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>Cobertura</Eyebrow>
            <h2 className="heading mt-3 text-[32px] font-bold text-white sm:text-[40px]">
              ¿Dónde arrancamos?
            </h2>
            <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-300">
              El lanzamiento empieza en ocho estados y avanza por etapas. Busca tu ciudad para ver si está en la
              primera tanda o si puedes pedir cobertura.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "San Cristóbal", "Maracay"].map((city) => (
                <span key={city} className="chip text-[11.5px]">
                  <MapPin className="h-3 w-3 text-brand-400" /> {city}
                </span>
              ))}
            </div>
            <div className="mt-6">
              <InlineLink to="/cobertura">Ver el mapa de cobertura</InlineLink>
            </div>
          </div>
          <CoverageSearch />
        </div>
      </section>

      {/* Driver plans */}
      <section className="relative overflow-hidden border-y border-white/8 bg-ink-900">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-[380px] w-[380px] rounded-full bg-racing-500/[0.06] blur-3xl"
          aria-hidden="true"
        />
        <div className="wrap relative py-14 sm:py-20">
          <SectionHead
            kicker="Para conductores"
            title="Tu carro, tu moto, tus reglas."
            text={`Sin mensualidad: recargas desde ${formatUSD(PILOT_RULES.minRechargeUSD)} y la app descuenta 10% por viaje completado. Empiezas con ${formatUSD(PILOT_RULES.welcomeUSD)} de bienvenida.`}
            action={
              <Button variant="yellow" to="/conductores">
                Trabaja con Llégate <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Gift,
                title: "Saldo de bienvenida",
                text: `${formatUSD(PILOT_RULES.welcomeUSD)} al activar tu cuenta piloto, sin vencimiento.`,
              },
              {
                icon: Wallet,
                title: `Recargas desde ${formatUSD(PILOT_RULES.minRechargeUSD)}`,
                text: `Pago Móvil o Binance. Aprobación manual con SLA de ${PILOT_RULES.approvalSlaMinutes} minutos.`,
              },
              {
                icon: ReceiptText,
                title: "10% por viaje completado",
                text: "No se cobra al aceptar: se reserva y se descuenta al finalizar, con recibo.",
              },
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
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-racing-500/20 bg-racing-500/[0.05] p-4 sm:flex-row sm:items-center sm:px-5">
            <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-300">
              <Percent className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
              <span>
                <strong className="text-white">Ejemplo:</strong> 30 viajes por semana con un ticket promedio de $5
                generan unos $15 de comisión semanal. Una recarga de $20 cubre más de una semana completa.
              </span>
            </p>
            <Link
              to="/conductores#calculadora"
              className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-racing-400 hover:text-racing-500"
            >
              Calcular mis ganancias <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="wrap py-14 sm:py-20">
        <SectionHead
          kicker="Mercado Motor"
          title="Repuestos, talleres y grúas cerca."
          text="Un directorio de negocios del mundo motor, con fichas verificadas y contacto directo."
          action={
            <Button variant="secondary" to="/mercado">
              Explorar el mercado <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {featuredVendors.map((vendor) => (
            <VendorCard key={vendor.slug} vendor={vendor} />
          ))}
        </div>
        <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:px-5">
          <p className="flex items-center gap-2.5 text-[12.5px] text-ink-300">
            <Store className="h-4 w-4 shrink-0 text-brand-400" /> ¿Tienes un taller, repuestera o grúa?
            Publica tu ficha sin costo durante el lanzamiento.
          </p>
          <Button size="sm" variant="secondary" to="/mercado/publicar">
            Publicar mi negocio
          </Button>
        </div>
      </section>

      {/* Safety */}
      <section className="asphalt-soft border-y border-white/8">
        <div className="wrap grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <Eyebrow>Seguridad</Eyebrow>
            <h2 className="heading mt-3 text-[32px] font-bold text-white sm:text-[40px]">
              Lo que pasa antes, durante y después.
            </h2>
            <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-300">
              La seguridad no es una sección aparte: está en la verificación del conductor, en el precio que ves y en
              las herramientas que tienes durante el viaje.
            </p>
            <div className="mt-6">
              <InlineLink to="/seguridad">Cómo protegemos cada viaje</InlineLink>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAFETY_POINTS.map((point, i) => {
              const Icon = safetyIcons[i];
              return (
                <div key={point.title} className="card p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="heading mt-3.5 text-[16px] font-bold text-white">{point.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{point.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="wrap py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Preguntas frecuentes</Eyebrow>
            <h2 className="heading mt-3 text-[32px] font-bold text-white sm:text-[38px]">
              Lo que más nos preguntan.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-300">
              Si tu duda no está aquí, el centro de ayuda está organizado por tema: viajes, pagos, conductores, app y
              mercado.
            </p>
            <Button variant="secondary" to="/ayuda" className="mt-5">
              Centro de ayuda <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Accordion items={homeFaqItems} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="wrap pb-16 sm:pb-20">
        <div className="asphalt relative overflow-hidden rounded-[28px] border border-white/12 p-6 sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-[3px] stripes-h" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <Badge tone="yellow">
                <Crown className="h-3 w-3" /> Lanzamiento
              </Badge>
              <h2 className="display mt-4 text-[42px] leading-[0.95] text-white sm:text-[56px]">
                La app está en camino.
                <br />
                <span className="text-brand-500">Súbete primero.</span>
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
                Déjanos tu contacto y te avisamos cuando esté disponible en tu tienda. Sin spam: un solo mensaje el
                día que arrancamos.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" onClick={() => openModal({ type: "download" })}>
                  <Download className="h-4 w-4" /> Avísame del lanzamiento
                </Button>
                <Button size="lg" variant="secondary" to="/app">
                  <Sparkles className="h-4 w-4" /> Probar la demo
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                <MessageCircle className="h-3.5 w-3.5" /> ¿Prefieres hablar con alguien?{" "}
                <button
                  type="button"
                  className="font-semibold text-ink-300 underline decoration-white/25 underline-offset-2 hover:text-white"
                  onClick={() => openModal({ type: "lead", intent: "contacto" })}
                >
                  Escríbenos
                </button>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Lo que incluye</p>
                <Route className="h-4 w-4 text-brand-400" />
              </div>
              <ul className="mt-3 grid gap-2.5">
                {[
                  "Mototaxi, taxi y delivery desde el día uno",
                  "Minivan, autobús y carga por fases",
                  "Pagos en bolívares y dólares",
                  "Ruta compartida y botón de emergencia",
                  "Soporte y recibo digital",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-ink-200">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
                <span className="text-[11px] text-ink-500">Precio de referencia</span>
                <Money usd={1.5} size="sm" showBoth={false} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
