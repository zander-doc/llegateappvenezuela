import { ArrowRight, Check, Crown, Headphones, ShieldCheck, Sparkles, Ticket, X } from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  Money,
  PageHero,
  SectionHead,
  TableHint,
} from "../components/ui";
import { useUI } from "../lib/ui";
import { VIP_PLAN } from "../data/plans";
import { FAQ_GROUPS } from "../data/faqs";

export function ClubVipPage() {
  const { openModal } = useUI();
  const faqs = FAQ_GROUPS.find((g) => g.id === "viajes")!.items.concat(
    FAQ_GROUPS.find((g) => g.id === "pagos")!.items.slice(0, 2)
  );

  return (
    <>
      <PageHero
        kicker="Club VIP · Pasajeros"
        title={
          <>
            Viaja primero.
            <br />
            Sin filas.
          </>
        }
        description="Una membresía mensual para quienes usan Llégate todas las semanas. Prioridad de asignación, cancelaciones sin cargo y soporte humano cuando lo necesitas."
        crumbs={[{ label: "Club VIP", to: "/pasajeros/club-vip" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "plan", planId: VIP_PLAN.id })}>
              <Crown className="h-4 w-4" /> Quiero el Club VIP
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "download" })}>
              Avísame del lanzamiento
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <Badge tone="yellow">
                <Crown className="h-3 w-3" /> Club VIP
              </Badge>
              <span className="text-[10.5px] text-ink-500">Mensual</span>
            </div>
            <p className="mono mt-3 text-[32px] font-semibold leading-none text-white">
              ${VIP_PLAN.priceUSD.toFixed(2)}
              <span className="ml-1 text-[12px] font-normal text-ink-400">/ mes</span>
            </p>
            <div className="mt-1">
              <Money usd={VIP_PLAN.priceUSD} size="sm" />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
              Se activa desde la app. Puedes cancelar cuando quieras.
            </p>
            <Button className="mt-4 w-full" onClick={() => openModal({ type: "plan", planId: VIP_PLAN.id })}>
              Elegir Club VIP
            </Button>
            <p className="mt-2 text-center text-[10px] text-ink-500">Simulación: no se procesa ningún pago.</p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Lo que incluye"
          title="Cuatro ventajas concretas"
          text="Sin puntos que caducan ni niveles que subir. Un plan simple con beneficios que se sienten en cada viaje."
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: Sparkles,
              title: "Prioridad en horas pico",
              text: "Tu solicitud entra primero en la cola cuando hay más demanda en tu zona.",
            },
            {
              icon: Ticket,
              title: "2 cancelaciones sin cargo",
              text: "Cambias de planes sin costo dos veces al mes, antes de que llegue el conductor.",
            },
            {
              icon: Headphones,
              title: "Soporte en menos de 5 minutos",
              text: "Un canal directo con el equipo para resolver dudas o incidencias del viaje.",
            },
            {
              icon: ShieldCheck,
              title: "Precio preferente",
              text: "Tarifas especiales en rutas frecuentes y beneficios de fin de semana.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-racing-500/25 bg-racing-500/10 text-racing-500">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="heading mt-3.5 text-[17px] font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-2">
          <div>
            <Eyebrow>Comparación</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">¿Te conviene?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Si usas Llégate dos o más veces por semana, la prioridad y las cancelaciones suelen justificar el plan.
              Si viajas de vez en cuando, la cuenta gratuita es suficiente.
            </p>
            <div className="mt-4">
              <CheckList
                items={[
                  "Cancela cuando quieras, sin permanencia",
                  "Los beneficios aplican en todos los servicios",
                  "La prioridad depende de la disponibilidad de la zona",
                ]}
              />
            </div>
            <Button className="mt-5" onClick={() => openModal({ type: "plan", planId: VIP_PLAN.id })}>
              Activar Club VIP <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <TableHint />
            <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white/[0.04] text-[10.5px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Beneficio</th>
                  <th className="px-4 py-3 font-semibold">Cuenta gratis</th>
                  <th className="px-4 py-3 font-semibold text-racing-400">Club VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {[
                  { label: "Prioridad de asignación", free: false, vip: true },
                  { label: "Cancelaciones sin cargo", free: "—", vip: "2 al mes" },
                  { label: "Soporte preferente", free: false, vip: true },
                  { label: "Precio preferente en rutas frecuentes", free: false, vip: true },
                  { label: "Costo mensual", free: "Gratis", vip: "$4,99" },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 text-ink-200">{row.label}</td>
                    <td className="px-4 py-3 text-ink-400">
                      {typeof row.free === "boolean" ? (
                        row.free ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-ink-600" />
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-100">
                      {typeof row.vip === "boolean" ? (
                        row.vip ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-ink-600" />
                      ) : (
                        <span className="mono text-[12.5px]">{row.vip}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Dudas frecuentes</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Antes de activarlo</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Si tienes una duda que no está aquí, escríbenos y la revisamos.
            </p>
            <Button variant="secondary" onClick={() => openModal({ type: "lead", intent: "contacto" })} className="mt-4">
              Hablar con el equipo
            </Button>
          </div>
          <Accordion items={faqs} />
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-racing-500/25 bg-gradient-to-br from-racing-500/[0.1] to-brand-500/[0.05] p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="heading text-[22px] font-bold text-white">Viaja primero por $4,99 al mes.</p>
              <p className="mt-1 text-[13px] text-ink-300">
                Se activa desde la app. Sin permanencia y con cancelación en un toque.
              </p>
            </div>
            <Button variant="yellow" onClick={() => openModal({ type: "plan", planId: VIP_PLAN.id })}>
              <Crown className="h-4 w-4" /> Elegir Club VIP
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
