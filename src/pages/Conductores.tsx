import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  FileText,
  Gift,
  LockKeyhole,
  Percent,
  ReceiptText,
  RotateCcw,
  Scale,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
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
import { PilotWalletPanel } from "../components/PilotWallet";
import { EarningsCalculator } from "../components/EarningsCalculator";
import { useUI } from "../lib/ui";
import { PILOT_RULES } from "../data/prepaid";
import { formatUSD } from "../lib/format";
import { FAQ_GROUPS } from "../data/faqs";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";

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
        description="Moto, carro o delivery. Trabajas con prepago: 10% por viaje completado, recargas desde $5 y $2 de saldo de bienvenida. Sin mensualidad."
        crumbs={[{ label: "Conductores", to: "/conductores" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              <UserRound className="h-4 w-4" /> Registrarme
            </Button>
            <Button size="lg" variant="secondary" to="/conductores/planes#billetera">
              Ver prepago
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Modelo piloto</p>
              <Badge tone="yellow">Sin mensualidad</Badge>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-racing-500/30 bg-racing-500/[0.07] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-200">Saldo de bienvenida</span>
                <span className="mono text-[13px] font-semibold text-white">{formatUSD(PILOT_RULES.welcomeUSD)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-300">Comisión por viaje</span>
                <span className="mono text-[13px] font-semibold text-white">10%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-300">Recarga mínima</span>
                <span className="mono text-[13px] font-semibold text-white">{formatUSD(PILOT_RULES.minRechargeUSD)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <span className="text-[12.5px] text-ink-300">Aprobación manual</span>
                <span className="mono text-[13px] font-semibold text-white">SLA {PILOT_RULES.approvalSlaMinutes} min</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
              La comisión se descuenta solo al completar. Sin cuota mensual ni saldo negativo.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Percent, title: "10% por viaje", text: "Se descuenta del saldo al completar. Sin cuota mensual." },
            { icon: CalendarDays, title: "Tú eliges las horas", text: "Conéctate cuando te convenga, sin turnos obligatorios." },
            { icon: Wallet, title: "Cobro directo", text: "El pasajero paga el viaje como acuerden; la comisión sale de tu saldo." },
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
              Ajusta tus viajes y tu ticket promedio. Verás cuánto pagas de comisión a la semana y qué recarga te conviene
              para mantener el saldo activo.
            </p>
            <CheckList
              className="mt-5"
              items={[
                "Comisión del 10% por viaje completado",
                "Recargas desde $5, sin vencimiento",
                "Sin mensualidad ni saldo negativo",
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="success">
                <Check className="h-3 w-3" /> {formatUSD(PILOT_RULES.welcomeUSD)} de bienvenida
              </Badge>
              <Badge tone="neutral">SLA de {PILOT_RULES.approvalSlaMinutes} min</Badge>
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
                  text: "Moto, carro o delivery. Minivan, autobús y carga se suman en próximas fases.",
                },
                {
                  icon: FileText,
                  title: "2. Carga tus documentos",
                  text: "Cédula, licencia y documentos del vehículo. Revisión de identidad y antecedentes.",
                },
                {
                  icon: BadgeCheck,
                  title: "3. Activa tu cuenta",
                  text: "Recibes el saldo de bienvenida, la inducción y empiezas a recibir solicitudes.",
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
            kicker="Prepago piloto"
            title="Recarga y maneja"
            text="La comisión sale de tu saldo al completar cada viaje. Si cancelas, la reserva vuelve a tu billetera."
            action={
              <Button variant="secondary" to="/conductores/planes#billetera">
                Ver mi billetera <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Gift,
                title: `${formatUSD(PILOT_RULES.welcomeUSD)} de bienvenida`,
                text: "Empiezas con saldo a favor al activar tu cuenta piloto. Sin vencimiento.",
              },
              {
                icon: Wallet,
                title: `Recargas desde ${formatUSD(PILOT_RULES.minRechargeUSD)}`,
                text: `Pago Móvil o Binance. Aprobación manual con SLA de ${PILOT_RULES.approvalSlaMinutes} minutos.`,
              },
              {
                icon: ReceiptText,
                title: "10% por viaje completado",
                text: "No se cobra al aceptar: se reserva la comisión y se descuenta al finalizar, con recibo.",
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
        kicker="Prepago piloto"
        title={
          <>
            Saldo claro.
            <br />
            Sin mensualidad.
          </>
        }
        description="Mototaxi, taxi pana y delivery funcionan con saldo prepago. Recargas desde $5 y la comisión del 10% se descuenta solo al completar cada viaje. Sin saldo negativo."
        crumbs={[
          { label: "Conductores", to: "/conductores" },
          { label: "Prepago", to: "/conductores/planes" },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              Registrarme
            </Button>
            <Button size="lg" variant="secondary" href="#billetera">
              Probar la billetera
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <Badge tone="yellow">Saldo de bienvenida</Badge>
              <span className="text-[10.5px] text-ink-500">Piloto</span>
            </div>
            <p className="mono mt-3 text-[32px] font-semibold leading-none text-white">
              {formatUSD(PILOT_RULES.welcomeUSD)}
            </p>
            <p className="mt-1 text-[12px] text-ink-400">al activar tu cuenta piloto, sin vencimiento</p>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                <span className="text-[12px] text-ink-300">Comisión por viaje</span>
                <span className="mono text-[12.5px] font-semibold text-white">10%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                <span className="text-[12px] text-ink-300">Recarga mínima</span>
                <span className="mono text-[12.5px] font-semibold text-white">{formatUSD(PILOT_RULES.minRechargeUSD)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                <span className="text-[12px] text-ink-300">Aprobación manual</span>
                <span className="mono text-[12.5px] font-semibold text-white">SLA {PILOT_RULES.approvalSlaMinutes} min</span>
              </div>
            </div>
            <Button className="mt-4 w-full" variant="secondary" href="#billetera">
              Ver mi saldo
            </Button>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Billetera piloto"
          title="Tu saldo, siempre a la vista"
          text="Prueba la recarga y el descuento por viaje en esta simulación. No se procesa ningún pago real."
        />
        <div className="mt-6">
          <PilotWalletPanel />
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Cómo funciona"
            title="La comisión se mueve con el viaje"
            text="No pagas por adelantado: la app aparta la comisión al aceptar y la cobra al terminar. Si el viaje se cancela, la aparta se libera."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: CreditCard,
                step: "01",
                title: "Recargas",
                text: `Pago Móvil o Binance desde ${formatUSD(PILOT_RULES.minRechargeUSD)}. La aprobación manual tiene un SLA de ${PILOT_RULES.approvalSlaMinutes} minutos.`,
              },
              {
                icon: LockKeyhole,
                step: "02",
                title: "Aceptas",
                text: "Se reserva la comisión de ese viaje en tu billetera. Todavía no se descuenta.",
              },
              {
                icon: ReceiptText,
                step: "03",
                title: "Completas",
                text: "Se descuenta la comisión y queda el recibo con tarifa, comisión y neto.",
              },
              {
                icon: RotateCcw,
                step: "04",
                title: "Cancelas",
                text: "La reserva se libera y el saldo vuelve completo. También puedes terminar el viaje activo.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mono text-[11px] text-ink-600">{item.step}</span>
                  </div>
                  <h3 className="heading mt-3.5 text-[16px] font-bold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Reglas del piloto"
          title="Sin letras pequeñas"
          text="Estas reglas aplican al lanzamiento de mototaxi, taxi pana y delivery. Minivan, autobús y carga se analizan por separado."
        />
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Sin mensualidad",
              text: "No hay plan mensual ni cuota de inscripción. Solo pagas la comisión de los viajes que completas.",
            },
            {
              title: "Sin saldo negativo",
              text: `Si el saldo disponible baja de ${formatUSD(PILOT_RULES.minBalanceUSD)}, la app pausa nuevas solicitudes hasta que recargues.`,
            },
            {
              title: "Sin vencimiento",
              text: "El saldo no caduca. Al lanzamiento no hay bonos, vencimientos ni promociones que compliquen las cuentas.",
            },
            {
              title: "Termina tu viaje activo",
              text: "Si el saldo queda bajo durante un viaje, puedes completarlo. La comisión se cobra al finalizar, nunca antes.",
            },
            {
              title: "Recibo por cada viaje",
              text: "Cada descuento muestra la tarifa, la comisión y el neto que te corresponde. Queda guardado en tu billetera.",
            },
            {
              title: "Aprobación con SLA",
              text: `Las recargas se revisan manualmente. El piloto se compromete a aprobarlas en ${PILOT_RULES.approvalSlaMinutes} minutos o menos.`,
            },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <h3 className="heading mt-3 text-[15.5px] font-bold text-white">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-[11.5px] leading-relaxed text-ink-400">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-racing-400" />
          Antes de cobrar dinero real se revisarán con asesoría legal y fiscal el tratamiento del saldo prepago, la
          política de reembolsos, la vigencia y el IGTF. Esta sección describe el piloto propuesto; todavía no es un
          servicio de dinero electrónico autorizado.
        </p>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Calculadora</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Haz números con tu ritmo</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Ajusta tus viajes por semana y el ticket promedio. Te mostramos la comisión semanal, tu neto y la recarga
              que te conviene.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => openModal({ type: "driver" })}>
              Registrarme <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      <section id="rosa" className="scroll-mt-28 border-b border-white/8 bg-ink-900">
        <div className="wrap grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Badge tone="danger">Conductoras Rosa</Badge>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Un espacio verificado para conductoras.
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-300">
              Las conductoras con verificación especial pueden recibir solicitudes de pasajeras que eligen el modo
              Rosa. La verificación es gratuita y la comisión sigue siendo la misma del 10% por viaje.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">
                <ShieldCheck className="h-3 w-3" /> Verificación gratuita
              </Badge>
              <Badge tone="neutral">Misma comisión 10%</Badge>
              <Badge tone="neutral">Acompañamiento del equipo</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => openModal({ type: "driver" })}>Registrarme</Button>
              <Button variant="secondary" href="#billetera">
                Cómo funciona el prepago
              </Button>
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Incluye</p>
            <ul className="mt-3 grid gap-2.5">
              {[
                "Verificación especial Rosa, sin costo",
                "Preferencia de solicitudes de pasajeras del modo Rosa",
                "Misma billetera prepago y comisión del 10%",
                "Acompañamiento del equipo Rosa",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-ink-200">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={3} /> {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-white/8 pt-3 text-[11px] leading-relaxed text-ink-500">
              El modo Rosa es una opción de preferencia, no un servicio separado ni una garantía de solicitudes. No hay
              plan mensual Rosa.
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
        description="Elige tu servicio y deja tus datos. No hay plan mensual: al activarte recibes saldo de bienvenida y recargas cuando lo necesites."
        crumbs={[
          { label: "Conductores", to: "/conductores" },
          { label: "Registro", to: "/conductores/registro" },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "driver" })}>
              Empezar registro <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" to="/conductores/planes#billetera">
              Cómo funciona el prepago
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
                { n: "03", label: "Billetera y confirmación" },
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
              { title: "Entrevista corta", text: "Explicamos reglas, seguridad y uso de la billetera prepago." },
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
            {[...LAUNCH_SERVICES, ...UPCOMING_SERVICES].map((s) => (
              <div key={s.slug} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
                <span className="text-[13px] font-medium text-white">{s.name}</span>
                <span className={`text-[11.5px] ${s.status === "launch" ? "mono text-racing-400" : "text-ink-500"}`}>
                  {s.status === "launch" ? `desde $${s.minFareUSD.toFixed(2)}` : `Próximamente · ${s.phase}`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-500">
            Puedes registrarte para mototaxi, taxi o delivery. Minivan, autobús y carga se abren por fases; después de
            la verificación puedes sumarte a los nuevos servicios.
          </p>
        </div>
      </section>
    </>
  );
}
