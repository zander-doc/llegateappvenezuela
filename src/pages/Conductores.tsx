import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock,
  FileText,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  CheckList,
  Eyebrow,
  PageHero,
  SectionHead,
  TableHint,
} from "../components/ui";
import { PlanCard } from "../components/PlanCard";
import { EarningsCalculator } from "../components/EarningsCalculator";
import { useUI } from "../lib/ui";
import { DRIVER_PLANS } from "../data/plans";
import { FAQ_GROUPS } from "../data/faqs";
import { SERVICES } from "../data/services";

const driverFaqs = FAQ_GROUPS.find((g) => g.id === "conductores")!.items;

export function ConductoresPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Conductores"
        title={
          <>
            Maneja cuando quieras.
            <br />
            Cobra sin sorpresas.
          </>
        }
        description="Moto, carro, minivan o carga. Elige cómo pagar: 10% por viaje o un plan mensual con 0% de comisión. Tú decides cuándo conectarte."
        crumbs={[{ label: "Conductores", to: "/conductores" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              <UserRound className="h-4 w-4" /> Registrarme
            </Button>
            <Button size="lg" variant="secondary" to="/conductores/planes">
              Comparar planes
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Modelo simple</p>
              <Badge tone="yellow">Sin letras pequeñas</Badge>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-300">Por viaje</span>
                <span className="mono text-[13px] font-semibold text-white">10%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-brand-500/30 bg-brand-500/[0.07] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-200">Pro Mensual</span>
                <span className="mono text-[13px] font-semibold text-white">$12 · 0%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-300">Pro Semanal</span>
                <span className="mono text-[13px] font-semibold text-white">$3,50 · 0%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
              Sin cuota de inscripción. El plan se cambia desde la app.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CircleDollarSign, title: "0% de comisión", text: "Con plan Pro te quedas con el 100% de cada viaje." },
            { icon: CalendarDays, title: "Tú eliges las horas", text: "Conéctate cuando te convenga, sin turnos obligatorios." },
            { icon: Wallet, title: "Cobro directo", text: "Efectivo en Bs o USD, o saldo digital en la app." },
            { icon: ShieldCheck, title: "Respaldo en ruta", text: "Verificación, soporte y protocolo de seguridad." },
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

      <section id="calculadora" className="scroll-mt-28 border-y border-white/8 bg-ink-900">
        <div className="wrap grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="lg:sticky lg:top-32">
            <Eyebrow>Números claros</Eyebrow>
            <h2 className="heading mt-3 text-[30px] font-bold text-white sm:text-[38px]">
              ¿Cuánto te quedaría?
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-300">
              Ajusta tus viajes y tu ticket promedio. La calculadora compara el pago por viaje con el plan mensual y te
              dice cuál conviene a tu ritmo.
            </p>
            <CheckList
              className="mt-5"
              items={[
                "Proyección mensual, no promesa de ingresos",
                "Sin comisión por viaje en planes Pro",
                "Puedes cambiar de plan cuando quieras",
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="success">
                <Check className="h-3 w-3" /> Sin costo de inscripción
              </Badge>
              <Badge tone="neutral">Pago semanal</Badge>
            </div>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Requisitos</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Lo que pedimos para verificarte
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              La verificación protege a pasajeros y conductores. Todo se revisa antes de activar la cuenta.
            </p>
            <div className="mt-5 grid gap-2">
              {[
                "Ser mayor de edad y tener cédula vigente",
                "Licencia de conducir vigente",
                "Vehículo en regla (documentos y revisión)",
                "Teléfono inteligente con datos",
                "Aprobar la verificación de identidad y antecedentes",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3 text-[13px] text-ink-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" strokeWidth={3} /> {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow>Cómo entrar</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Tres pasos y quedas en revisión
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                {
                  icon: Smartphone,
                  title: "1. Elige tu servicio",
                  text: "Moto, carro, minivan, autobús, delivery o carga. Puedes sumar más luego.",
                },
                {
                  icon: FileText,
                  title: "2. Carga tus documentos",
                  text: "Cédula, licencia y documentos del vehículo. Revisión de identidad y antecedentes.",
                },
                {
                  icon: BadgeCheck,
                  title: "3. Activa tu cuenta",
                  text: "Eliges plan, recibes la inducción y empiezas a recibir solicitudes.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="card flex gap-3.5 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="mt-4" onClick={() => openModal({ type: "driver" })}>
              Empezar registro <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Planes"
            title="Elige cómo pagar"
            text="El plan mensual tiene 0% de comisión. El semanal sirve para probar sin compromiso."
            action={
              <Button variant="secondary" to="/conductores/planes">
                Ver comparación <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {DRIVER_PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Dudas de conductores</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Antes de registrarte</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Si te falta algo, el equipo de conductores te acompaña en el proceso.
            </p>
            <Button variant="secondary" to="/conductores/registro" className="mt-4">
              Ver requisitos y registro
            </Button>
          </div>
          <Accordion items={driverFaqs} />
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="heading text-[20px] font-bold text-white">¿Te animas a manejar con Llégate?</p>
            <p className="mt-1 text-[13px] text-ink-400">Tres pasos, unos cuatro minutos. Sin costo de inscripción.</p>
          </div>
          <Button onClick={() => openModal({ type: "driver" })}>
            Registrarme ahora <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </>
  );
}

export function PlanesPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Planes y comisiones"
        title={
          <>
            Planes claros.
            <br />
            Cero comisión.
          </>
        }
        description="Puedes pagar 10% por viaje o elegir un plan con 0% de comisión. Sin cuota de inscripción, sin permanencia y con cambio de plan desde la app."
        crumbs={[
          { label: "Conductores", to: "/conductores" },
          { label: "Planes", to: "/conductores/planes" },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              Registrarme
            </Button>
            <Button size="lg" variant="secondary" to="/conductores#calculadora">
              Calcular mis ganancias
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Badge tone="yellow">Recomendado</Badge>
            <p className="heading mt-3 text-[20px] font-bold text-white">Pro Mensual</p>
            <p className="mono mt-1 text-[28px] font-semibold text-white">$12 <span className="text-[12px] font-normal text-ink-400">/ mes</span></p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
              0% de comisión, prioridad en horas pico y reporte de ganancias.
            </p>
            <Button className="mt-4 w-full" onClick={() => openModal({ type: "plan", planId: "pro-mensual" })}>
              Elegir Pro Mensual
            </Button>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 md:grid-cols-3">
          {DRIVER_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-ink-500">
          Precios de demostración. El cobro y la activación se harían desde la app, no desde esta web.
        </p>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Comparación"
            title="Pago por viaje vs. plan Pro"
            text="Mira qué incluye cada modelo antes de decidir."
          />
          <TableHint />
          <div className="mt-2 overflow-x-auto rounded-2xl border border-white/10 sm:mt-6">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead className="bg-white/[0.04] text-[10.5px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Incluye</th>
                  <th className="px-4 py-3 font-semibold">Por viaje</th>
                  <th className="px-4 py-3 font-semibold text-brand-300">Pro Semanal</th>
                  <th className="px-4 py-3 font-semibold text-brand-300">Pro Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {[
                  { label: "Comisión por viaje", pay: "10%", week: "0%", month: "0%" },
                  { label: "Costo fijo", pay: "Ninguno", week: "$3,50 / semana", month: "$12 / mes" },
                  { label: "Solicitudes en tu ciudad", pay: true, week: true, month: true },
                  { label: "Todas las ciudades con cobertura", pay: false, week: false, month: true },
                  { label: "Prioridad en horas pico", pay: false, week: false, month: true },
                  { label: "Reporte de ganancias", pay: false, week: false, month: true },
                  { label: "Soporte preferente", pay: false, week: false, month: true },
                ].map((row) => (
                  <tr key={row.label} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-ink-200">{row.label}</td>
                    {[row.pay, row.week, row.month].map((value, i) => (
                      <td key={i} className="px-4 py-3 text-ink-300">
                        {typeof value === "boolean" ? (
                          value ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-ink-600" />
                        ) : (
                          <span className="mono text-[12.5px]">{value}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-500">
            Condiciones de demostración. En producción, los términos completos estarían en la app y en la sección
            legal.
          </p>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Calculadora</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Haz números con tu ritmo</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Ajusta los viajes por semana y el ticket promedio. Te mostramos cuánto cambia entre el 10% por viaje y el
              plan mensual.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => openModal({ type: "driver" })}>
              Registrarme <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      <section id="rosa" className="scroll-mt-28 border-y border-white/8 bg-ink-900">
        <div className="wrap grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Badge tone="danger">Conductoras Rosa</Badge>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Un espacio verificado para conductoras.
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-300">
              Las conductoras con verificación especial pueden recibir solicitudes de pasajeras que eligen el modo
              Rosa. Es una preferencia de asignación, sujeta a disponibilidad en la zona.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">
                <ShieldCheck className="h-3 w-3" /> Verificación especial
              </Badge>
              <Badge tone="neutral">0% de comisión</Badge>
              <Badge tone="neutral">Acompañamiento del equipo</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => openModal({ type: "plan", planId: "conductoras-rosa" })}>
                Quiero el plan Rosa
              </Button>
              <Button variant="secondary" onClick={() => openModal({ type: "driver", planId: "conductoras-rosa" })}>
                Registrarme
              </Button>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Incluye</p>
            <ul className="mt-3 grid gap-2.5">
              {DRIVER_PLANS.find((p) => p.id === "conductoras-rosa")!.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-ink-200">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-ink-500">
              El modo Rosa es una opción de preferencia, no un servicio separado ni una garantía de solicitudes.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-racing-500/25 bg-racing-500/10 text-racing-500">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="heading text-[18px] font-bold text-white">¿Viajas más que conduces?</p>
              <p className="mt-1 text-[13px] text-ink-400">
                El Club VIP para pasajeros prioriza tus solicitudes y suma cancelaciones sin cargo.
              </p>
            </div>
          </div>
          <Link to="/pasajeros/club-vip" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-400">
            Conocer Club VIP <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

export function RegistroPage() {
  const { openModal } = useUI();

  return (
    <>
      <PageHero
        kicker="Registro de conductores"
        title={
          <>
            Tu cuenta,
            <br />
            en tres pasos.
          </>
        }
        description="Elige tu servicio, deja tus datos y selecciona cómo quieres pagar. La verificación se hace después, con tus documentos."
        crumbs={[
          { label: "Conductores", to: "/conductores" },
          { label: "Registro", to: "/conductores/registro" },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              Empezar registro <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" to="/conductores/planes">
              Ver planes
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Badge tone="brand">Toma ~4 minutos</Badge>
            <div className="mt-4 grid gap-3">
              {[
                { n: "01", label: "Servicio y ciudad" },
                { n: "02", label: "Tus datos de contacto" },
                { n: "03", label: "Plan y confirmación" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  <span className="mono flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-[11px] text-ink-300">
                    {s.n}
                  </span>
                  <span className="text-[13px] text-ink-200">{s.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-ink-500">
              El formulario es una simulación. No se guardan datos en un servidor.
            </p>
          </div>
        }
      />

      <section className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-2">
        <div>
          <Eyebrow>Antes de empezar</Eyebrow>
          <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Ten esto a mano</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
            En el flujo real, después de este formulario cargarías los documentos desde la app.
          </p>
          <div className="mt-5 grid gap-2">
            {[
              "Cédula de identidad vigente",
              "Licencia de conducir vigente",
              "Documentos del vehículo (título y revisión)",
              "Foto del vehículo y de la placa",
              "Un número de teléfono activo",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3 text-[13px] text-ink-200">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /> {item}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Eyebrow>Qué revisamos</Eyebrow>
          <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Verificación, no papeleo eterno</h2>
          <div className="mt-5 grid gap-3">
            {[
              { title: "Identidad", text: "Que la persona y la cédula coincidan." },
              { title: "Licencia y vehículo", text: "Que la categoría y los documentos estén vigentes." },
              { title: "Antecedentes", text: "Revisión estándar antes de activar la cuenta." },
              { title: "Entrevista corta", text: "Explicamos reglas, seguridad y uso de la app." },
            ].map((item, i) => (
              <div key={item.title} className="card flex items-start gap-3 p-4">
                <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/12 text-[10px] font-semibold text-brand-400">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-400">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={() => openModal({ type: "driver" })}>
            Empezar registro <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="border-t border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.slug} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
                <span className="text-[13px] font-medium text-white">{s.name}</span>
                <span className="mono text-[11.5px] text-racing-400">desde ${s.fromUSD.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-500">
            Puedes registrarte para un servicio y sumar otros después de la verificación.
          </p>
        </div>
      </section>
    </>
  );
}
