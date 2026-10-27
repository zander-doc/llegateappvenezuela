import { Link } from "react-router-dom";
import { ArrowRight, Banknote, Calculator, CreditCard, Info, Wallet } from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Eyebrow,
  Money,
  PageHero,
  RateNote,
  SectionHead,
  TableHint,
} from "../components/ui";
import { FareEstimator } from "../components/FareEstimator";
import { useUI } from "../lib/ui";
import { SERVICES } from "../data/services";
import { FAQ_GROUPS } from "../data/faqs";
import { DEMO_BCV_RATE, estimateFare, formatRate, formatUSD } from "../lib/format";

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
        description="Cada servicio tiene una tarifa base y un precio por kilómetro. Ves el total en dólares y en bolívares antes de confirmar, y el recibo guarda la tasa aplicada."
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
          kicker="Tabla de referencia"
          title="Qué cuesta cada servicio"
          text="Los montos son ejemplos para comparar. La distancia real y las paradas ajustan el total."
          action={
            <Badge tone="yellow">Precios de demostración</Badge>
          }
        />

        <TableHint />
        <div className="mt-2 overflow-x-auto rounded-2xl border border-white/10 sm:mt-6">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-white/[0.04] text-[10.5px] uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">Por km</th>
                <th className="px-4 py-3 font-semibold">Ejemplo 5 km</th>
                <th className="px-4 py-3 font-semibold">Ejemplo 20 km</th>
                <th className="px-4 py-3 font-semibold">Capacidad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {SERVICES.map((s) => {
                const at5 = estimateFare(s.fromUSD, s.perKmUSD, 5);
                const at20 = estimateFare(s.fromUSD, s.perKmUSD, 20);
                return (
                  <tr key={s.slug} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <Link to={`/servicios/${s.slug}`} className="text-[13px] font-semibold text-white hover:text-brand-300">
                        {s.name}
                      </Link>
                      <p className="text-[11px] text-ink-500">{s.eta}</p>
                    </td>
                    <td className="mono px-4 py-3 text-[13px] text-ink-200">{formatUSD(s.fromUSD)}</td>
                    <td className="mono px-4 py-3 text-[13px] text-ink-200">${s.perKmUSD.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Money usd={at5} size="sm" showBoth={false} />
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
          Ejemplos calculados con tarifa base + kilómetros, sin recargos adicionales. Conversión de demostración a{" "}
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
              title: "Tarifa base",
              text: "Cubre el arranque del servicio: la unidad, el conductor y el tiempo de recogida.",
            },
            {
              title: "Distancia",
              text: "Se cobra por kilómetro recorrido. Si añades una parada, la app recalcula antes de aceptar.",
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
