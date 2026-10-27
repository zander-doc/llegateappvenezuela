import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Clock,
  FileSpreadsheet,
  MapPin,
  Package,
  ShieldCheck,
  Users,
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
import { useUI } from "../lib/ui";
import { HUBS } from "../data/site";

const useCases = [
  {
    icon: Users,
    title: "Traslados de personal",
    text: "Rutas fijas para turnos de entrada y salida, con conductores asignados y registro de cada viaje.",
    detail: "Ideal para plantas, bancos, clínicas y oficinas con horarios rotativos.",
  },
  {
    icon: Building2,
    title: "Movilidad de clientes",
    text: "Recoge y lleva a tus clientes con un solo proveedor y un precio acordado por trayecto.",
    detail: "Hoteles, concesionarios, clínicas y servicios que reciben visitantes.",
  },
  {
    icon: CalendarClock,
    title: "Eventos y convenciones",
    text: "Coordina varios vehículos para un mismo evento, con un punto de encuentro y horarios claros.",
    detail: "Congresos, ferias, conciertos y visitas corporativas.",
  },
  {
    icon: Package,
    title: "Delivery recurrente",
    text: "Entregas diarias de documentos, repuestos o insumos con seguimiento y comprobante.",
    detail: "Farmacias, talleres, distribuidores y comercios con ruta propia.",
  },
];

const steps = [
  {
    n: "01",
    title: "Diagnóstico",
    text: "Revisamos cuántas personas o paquetes se mueven, en qué horarios y entre qué zonas.",
  },
  {
    n: "02",
    title: "Propuesta",
    text: "Definimos servicios, niveles de atención y una forma de pago centralizada para tu empresa.",
  },
  {
    n: "03",
    title: "Operación",
    text: "Activamos las cuentas del equipo y acompañamos las primeras semanas de uso.",
  },
];

const included = [
  "Una sola factura mensual con el detalle de cada viaje",
  "Panel de uso para administrar personas y centros de costo",
  "Atención preferente para incidencias operativas",
  "Conductores verificados y vehículos revisados",
  "Precio acordado antes de cada traslado",
  "Reportes de consumo por área o sucursal",
];

export function EmpresasPage() {
  const { openModal } = useUI();
  const launchCities = HUBS.filter((h) => h.status === "launch");

  return (
    <>
      <PageHero
        kicker="Llégate Empresas"
        title={
          <>
            Tu equipo se mueve.
            <br />
            Tú tienes el control.
          </>
        }
        description="Un solo proveedor para traslados de personal, movilidad de clientes, eventos y entregas recurrentes. Facturación centralizada y visibilidad de cada viaje."
        crumbs={[{ label: "Empresas", to: "/empresas" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "lead", intent: "empresa" })}>
              <Building2 className="h-4 w-4" /> Solicitar una llamada
            </Button>
            <Button size="lg" variant="secondary" to="/tarifas">
              Ver tarifas <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <Badge tone="brand">
                <Building2 className="h-3 w-3" /> Cuenta corporativa
              </Badge>
              <span className="text-[10.5px] text-ink-500">Sin costo de apertura</span>
            </div>
            <p className="heading mt-4 text-[19px] font-bold text-white">Lo que resuelve</p>
            <div className="mt-3">
              <CheckList
                items={[
                  "Menos proveedores y llamadas sueltas",
                  "Pagos centralizados, sin reembolsos",
                  "Registro de cada viaje y pasajero",
                ]}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11.5px] text-ink-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              Operación con conductores verificados
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-500">
              Demostración: la solicitud no se envía a un servidor.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <SectionHead
          kicker="Casos de uso"
          title="Cuatro formas de usar Llégate en tu empresa"
          text="No es una tarifa especial sobre el mismo servicio: es una forma distinta de organizar la movilidad de tu operación."
        />
        <div className="mt-7 grid gap-3 md:grid-cols-2">
          {useCases.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="heading text-[18px] font-bold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-300">{item.text}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-ink-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              De la primera llamada a la operación
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
              Empezamos con un piloto acotado y lo ampliamos cuando la operación está estable.
            </p>
            <div className="mt-6 grid gap-3">
              {steps.map((step) => (
                <div key={step.n} className="flex gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                  <span className="mono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-[13px] font-semibold text-brand-300">
                    {step.n}
                  </span>
                  <div>
                    <p className="heading text-[15.5px] font-bold text-white">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-6" onClick={() => openModal({ type: "lead", intent: "empresa" })}>
              Hablar con ventas <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3">
            <div className="card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Incluido en la cuenta</p>
              <div className="mt-3">
                <CheckList items={included} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileSpreadsheet, label: "Factura única", value: "Mensual" },
                { icon: Wallet, label: "Pago", value: "Bs. o USD" },
                { icon: Clock, label: "Soporte", value: "Preferente" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
                    <Icon className="h-4.5 w-4.5 text-brand-400" />
                    <p className="mono mt-2 text-[15px] font-semibold text-white">{item.value}</p>
                    <p className="text-[10.5px] text-ink-500">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow>Cobertura</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">
              Empezamos donde ya operamos
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-400">
              La cuenta corporativa está disponible en los estados con cobertura de lanzamiento. Si tu operación
              incluye otra zona, la evaluamos junto con la propuesta.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {launchCities.map((hub) => (
                <span key={hub.stateId} className="chip">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  {hub.city}
                </span>
              ))}
            </div>
            <Button variant="secondary" to="/cobertura" className="mt-5">
              Ver cobertura completa <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <p className="heading text-[17px] font-bold text-white">Antes de la llamada, ten a mano</p>
            <ul className="mt-3 grid gap-2.5">
              {[
                "Cantidad aproximada de personas o envíos por día",
                "Ciudades y zonas donde se mueven",
                "Horarios de mayor demanda",
                "Quién administrará las cuentas del equipo",
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-ink-300">
                  <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10.5px] text-ink-200">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[11.5px] text-emerald-200">
              <Check className="h-3.5 w-3.5" /> Sin compromiso y sin costo de evaluación.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap pb-12 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow>Preguntas de empresas</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Lo que suelen preguntar</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              ¿Falta algo? Escríbenos y lo revisamos con tu equipo.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              Hacer una pregunta
            </Button>
          </div>
          <Accordion
            items={[
              {
                q: "¿Hay un mínimo de viajes o de personas?",
                a: "No exigimos un mínimo para empezar. La propuesta se ajusta al volumen y a la frecuencia de uso; un piloto pequeño es la mejor forma de medir el servicio.",
              },
              {
                q: "¿Cómo se paga la cuenta corporativa?",
                a: "Con una factura mensual consolidada. Puedes pagar en bolívares a la tasa BCV o en dólares, según lo acordado en la propuesta.",
              },
              {
                q: "¿Puedo limitar quién usa el servicio?",
                a: "Sí. La cuenta administra las personas autorizadas, sus centros de costo y los horarios permitidos para pedir viajes.",
              },
              {
                q: "¿Los viajes se pueden auditar?",
                a: "Cada traslado queda registrado con fecha, ruta, conductor y monto. Ese detalle acompaña la factura mensual.",
              },
              {
                q: "¿Atienden eventos fuera de la ciudad?",
                a: "Se evalúa caso por caso. Para eventos, lo habitual es coordinar la operación con anticipación y confirmar disponibilidad en la zona.",
              },
            ]}
          />
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-500/[0.12] to-racing-500/[0.05] p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="heading text-[22px] font-bold text-white">Movamos tu operación.</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-300">
                Cuéntanos cuántas personas se mueven y qué necesitas resolver. Te contactamos para preparar una
                propuesta a tu medida.
              </p>
            </div>
            <Button onClick={() => openModal({ type: "lead", intent: "empresa" })}>
              Solicitar una llamada <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
