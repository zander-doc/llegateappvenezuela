import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Banknote, Calculator, CreditCard, Info, Wallet } from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Eyebrow,
  Money,
  PageHero,
  RateNote,
  SectionHead,
  ServiceIcon,
  TableHint,
} from "../components/ui";
import { FareEstimator } from "../components/FareEstimator";
import { useUI } from "../lib/ui";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";
import { FAQ_GROUPS } from "../data/faqs";
import { DEMO_BCV_RATE, estimateFare, estimateTripFare, formatKm, formatRate, formatUSD } from "../lib/format";

export function TarifasPage() {
  const { openModal } = useUI();
  const paymentFaqs = FAQ_GROUPS.find((g) => g.id === "pagos")!.items;

  return (
    <>
      <PageHero
        kicker="Tarifas"
        title={
          <>
            Precio claro.
            <br />
            Antes de subir.
          </>
        }
        description="Mototaxi y delivery arrancan en $1 por carrera; taxi pana en $3. Desde ese mínimo se suma el costo por kilómetro, con opción de ida y vuelta. Ves el total antes de confirmar."
        crumbs={[{ label: "Tarifas", to: "/tarifas" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "fare" })}>
              <Calculator className="h-4 w-4" /> Calcular mi viaje
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "bcv" })}>
              <Wallet className="h-4 w-4" /> Convertir Bs / USD
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Tasa de referencia</p>
            <p className="mono mt-2 text-[30px] font-semibold text-white">{formatRate(DEMO_BCV_RATE)}</p>
            <p className="text-[12px] text-ink-400">Bs por dólar · valor de demostración</p>
            <p className="mt-3 flex items-start gap-2 border-t border-white/8 pt-3 text-[11.5px] leading-relaxed text-ink-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
              La web y la app usan una sola tasa oficial, actualizada a diario. No hay dos precios para el mismo
              viaje.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Mínimo por carrera"
          title="El piso de cada viaje"
          text="Mototaxi y delivery arrancan en $1; taxi pana en $3. El mínimo cubre el arranque y la recogida, y desde ahí se suma el costo por kilómetro. Cada ciudad puede ajustar ese mínimo según sus costos."
          action={<Badge tone="yellow">Referencia nacional</Badge>}
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {LAUNCH_SERVICES.map((s) => (
            <div key={s.slug} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                  <ServiceIcon icon={s.icon} className="h-5 w-5" />
                </span>
                <span className="mono text-[10.5px] text-ink-500">{formatUSD(s.perKmUSD)} por km</span>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-ink-500">Mínimo por carrera</p>
              <p className="mono mt-0.5 text-[30px] font-semibold leading-none text-white">{formatUSD(s.minFareUSD)}</p>
              <p className="mt-1 text-[12px] text-ink-400">{s.name} · cada kilómetro se suma desde ahí</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-[11.5px] leading-relaxed text-ink-400">
          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          En ida y vuelta se suman los kilómetros del regreso a la misma tarifa por km y la mínima se cobra una sola vez.
          El mínimo es referencial: la app confirma el de tu ciudad antes de pedir.
        </p>
      </section>

      <section className="wrap pb-12 sm:pb-16">
        <SectionHead
          kicker="Tabla de referencia"
          title="Qué cuesta cada servicio"
          text="Mínimo + kilómetros. Los servicios de lanzamiento aparecen primero; las próximas fases son de referencia hasta que se activen."
          action={<Badge tone="yellow">Precios de demostración</Badge>}
        />

        <TableHint />
        <div className="mt-2 overflow-x-auto rounded-2xl border border-white/10 sm:mt-6">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-white/[0.04] text-[10.5px] uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 font-semibold">Mínimo</th>
                <th className="px-4 py-3 font-semibold">Por km</th>
                <th className="px-4 py-3 font-semibold">5 km ida</th>
                <th className="px-4 py-3 font-semibold">5 km ida/vuelta</th>
                <th className="px-4 py-3 font-semibold">20 km ida</th>
                <th className="px-4 py-3 font-semibold">Capacidad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {[...LAUNCH_SERVICES, ...UPCOMING_SERVICES].map((s) => {
                const at5 = estimateFare(s.minFareUSD, s.perKmUSD, 5);
                const at5Round = estimateTripFare(s.minFareUSD, s.perKmUSD, 5, { roundTrip: true }).totalUSD;
                const at20 = estimateFare(s.minFareUSD, s.perKmUSD, 20);
                return (
                  <tr key={s.slug} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link to={`/servicios/${s.slug}`} className="text-[13px] font-semibold text-white hover:text-brand-300">
                        {s.name}
                      </Link>
                      <p className="text-[11px] text-ink-500">
                        {s.status === "launch" ? s.eta : `Próximamente · ${s.phase}`}
                      </p>
                    </td>
                    <td className="mono px-4 py-3 text-[13px] text-ink-200">{formatUSD(s.minFareUSD)}</td>
                    <td className="mono px-4 py-3 text-[13px] text-ink-200">{formatUSD(s.perKmUSD)}</td>
                    <td className="px-4 py-3">
                      <Money usd={at5} size="sm" showBoth={false} />
                    </td>
                    <td className="px-4 py-3">
                      <Money usd={at5Round} size="sm" showBoth={false} />
                    </td>
                    <td className="px-4 py-3">
                      <Money usd={at20} size="sm" showBoth={false} />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-300">{s.capacity}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal({ type: "fare", serviceSlug: s.slug })}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-semibold text-ink-200 transition hover:border-brand-400/50 hover:text-white"
                      >
                        Calcular
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-500">
          Ejemplos con tarifa mínima + kilómetros, sin recargos. La ida y vuelta de 5 km suma {formatKm(5)} de regreso
          (10 km en total). Mínimos y precios de demostración que pueden variar por ciudad. Conversión a{" "}
          {formatRate(DEMO_BCV_RATE)} Bs/USD.
        </p>
      </section>

      <section className="asphalt-soft border-y border-white/8">
        <div className="wrap grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Calculadora</Eyebrow>
            <h2 className="heading mt-3 text-[30px] font-bold text-white sm:text-[36px]">
              Ajusta la distancia y mira el total.
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-300">
              Es el mismo cálculo que hace la app antes de confirmar. Cambia de servicio para comparar opciones con
              el mismo recorrido.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip text-[11.5px]">
                <Banknote className="h-3.5 w-3.5 text-brand-400" /> Efectivo en Bs o USD
              </span>
              <span className="chip text-[11.5px]">
                <CreditCard className="h-3.5 w-3.5 text-brand-400" /> Saldo en la app
              </span>
            </div>
          </div>
          <FareEstimator onPrimary={() => openModal({ type: "download" })} />
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Tarifa mínima",
              text: "Es el piso de la carrera: cubre el arranque y la recogida. No baja de ahí aunque el trayecto sea muy corto.",
            },
            {
              title: "Distancia",
              text: "Se cobra por kilómetro. En ida y vuelta se suman los km del regreso; si añades una parada, la app recalcula antes de aceptar.",
            },
            {
              title: "Lo que no cambia",
              text: "El monto confirmado no sube al final. Si hay un recargo aplicable, aparece antes de pedir.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <span className="stripe-mark" aria-hidden="true" />
              <h3 className="heading mt-3 text-[17px] font-bold text-white">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900">
        <div className="wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Pagos</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Cómo y cuándo pagas</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Eliges el método al confirmar. El recibo muestra el monto, la tasa y el desglose.
            </p>
            <RateNote className="mt-4" />
          </div>
          <Accordion items={paymentFaqs} />
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="heading text-[20px] font-bold text-white">¿Listo para calcular tu próximo viaje?</p>
            <p className="mt-1 text-[13px] text-ink-400">
              Haz el estimado ahora y deja tu contacto para recibir el enlace de la app.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openModal({ type: "fare" })}>
              Calcular <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" to="/cobertura">
              Ver cobertura
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
