import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Crown,
  MessageCircle,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Money,
  SectionHead,
  ServiceIcon,
} from "../components/ui";
import { Hero } from "../components/Hero";
import { Ticker } from "../components/Ticker";
import { ServiceCard } from "../components/ServiceCard";
import { SearchBar } from "../components/SearchBar";
import { WalletQuickCard } from "../components/WalletQuickCard";
import { PromotionBanner, PROMOTIONS } from "../components/PromotionBanner";
import { useUI } from "../lib/ui";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";
import { homeFaqs } from "../data/faqs";
import { SAFETY_POINTS, STEPS } from "../data/site";

export function HomePage() {
  const { openModal } = useUI();
  const homeFaqItems = homeFaqs.flatMap((g) => g.items).slice(0, 6);

  return (
    <>
      <Hero />
      <Ticker />

      {/* Greeting */}
      <div className="wrap px-4 pt-10 pb-6">
        <p className="text-lg font-bold text-racing-500">
          Qué quieres hacer hoy, mi pana?
        </p>
      </div>

      {/* Search Bar */}
      <div className="wrap px-4 pb-6">
        <SearchBar />
      </div>

      {/* Wallet Quick Card */}
      <div className="wrap px-4 pb-8">
        <WalletQuickCard />
      </div>

      {/* Services */}
      <section className="wrap px-4">
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LAUNCH_SERVICES.map((service, i) => (
            <ServiceCard key={service.slug} service={service} index={i} />
          ))}
        </div>
      </section>

      {/* Promotions */}
      <section className="wrap px-4 pb-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-ink-400">
          Promociones locales
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROMOTIONS.map((promo) => (
            <PromotionBanner key={promo.title} promo={promo} />
          ))}
        </div>
      </section>


      {/* Upcoming services */}
      <div className="wrap px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
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
      </div>


      {/* How it works */}
      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            {STEPS.map((step) => (
              <div key={step.n} className="relative">
                <span className="text-2xl font-bold text-brand-500">{step.n}</span>
                <h3 className="display mt-2 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">{step.text}</p>
              </div>
            ))}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-asphalt-900/60 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-ink-400">Seguridad en cada viaje</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {SAFETY_POINTS.map((point) => (
                    <div key={point.title} className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{point.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{point.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="wrap px-4 py-14 sm:py-20">
        <SectionHead
          kicker="Preguntas frecuentes"
          title={
            <>
              Todo lo que necesitas saber.
              <br className="hidden sm:block" /> Sin complicación.
            </>
          }
          text="Si tu duda no está aquí, el centro de ayuda está organizado por tema: viajes, pagos, conductores, app y mercado."
          action={
            <Button variant="secondary" to="/ayuda" className="mt-5">
              Centro de ayuda <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        <div className="mt-8 max-w-3xl">
          <Accordion items={homeFaqItems} />
        </div>
      </section>


      {/* Final CTA */}
      <section className="wrap px-4 pb-16 sm:pb-20">
        <div className="asphalt relative overflow-hidden rounded-[28px] border border-white/12 p-6 sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-[3px] stripes-h" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" aria-hidden="true" />
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
                Déjanos tu contacto y te avisamos cuando esté disponible en tu tienda. Sin spam: un solo mensaje el día que arrancamos.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" to="/ingresar">
                  <ArrowRight className="h-4 w-4" /> Entrar con mi teléfono
                </Button>
                <Button size="lg" variant="secondary" to="/app">
                  <Sparkles className="h-4 w-4" /> Ver la app
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

