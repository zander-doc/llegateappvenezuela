import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  MapPin,
  Navigation,
  Package,
  Phone,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, Button, Eyebrow, Money, PageHero, SectionHead, ServiceIcon } from "../components/ui";
import { useUI } from "../lib/ui";
import { getService, SERVICES } from "../data/services";
import { estimateFare, formatUSD } from "../lib/format";

type Mode = "ride" | "package" | "driver";

const places = ["Altamira", "Sabana Grande", "Bellas Artes", "Chacao"];

export function AppDemoPage() {
  const { openModal, notify } = useUI();
  const [mode, setMode] = useState<Mode>("ride");
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("Altamira");
  const [serviceSlug, setServiceSlug] = useState("taxi-pana");
  const [payment, setPayment] = useState("Efectivo Bs");
  const [online, setOnline] = useState(false);

  const service = getService(serviceSlug)!;
  const fare = estimateFare(service.fromUSD, service.perKmUSD, 2.5);

  function reset(nextMode: Mode = mode) {
    setMode(nextMode);
    setStep(0);
    setOnline(false);
  }

  const stepLabels =
    mode === "ride"
      ? ["Destino", "Servicio", "Confirmar", "En camino"]
      : mode === "package"
        ? ["Ruta", "Paquete", "Confirmar", "En camino"]
        : ["Disponible", "Solicitud", "Aceptado", "Completado"];

  return (
    <>
      <PageHero
        kicker="Demo interactiva"
        title={
          <>
            Pruébala
            <br />
            antes de descargarla.
          </>
        }
        description="Recorre el flujo de pedir un viaje, enviar un paquete o conectarte como conductor. Es una simulación: no se envía ninguna solicitud ni se mueve dinero."
        crumbs={[{ label: "Demo", to: "/app" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "download" })}>
              <Smartphone className="h-4 w-4" /> Avísame del lanzamiento
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "fare" })}>
              Calcular una tarifa real
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <Badge tone="yellow">Sin datos reales</Badge>
            <ul className="mt-3 grid gap-2 text-[12px] text-ink-300">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> No pide tu ubicación
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> No crea una cuenta
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> No procesa pagos
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> No solicita un viaje
              </li>
            </ul>
            <p className="mt-3 border-t border-white/8 pt-2 text-[10.5px] leading-relaxed text-ink-500">
              Todo ocurre en tu navegador y se reinicia al recargar.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="lg:sticky lg:top-32">
            <Eyebrow>Elige el modo</Eyebrow>
            <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Tres recorridos, una app.</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
              Cambia de modo y avanza con los botones dentro del teléfono. Cada paso refleja una pantalla del flujo
              propuesto.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { id: "ride" as Mode, label: "Pasajero", icon: UserRound },
                { id: "package" as Mode, label: "Paquete", icon: Package },
                { id: "driver" as Mode, label: "Conductor", icon: Navigation },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => reset(m.id)}
                    className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-semibold transition ${
                      mode === m.id
                        ? "border-brand-500 bg-brand-500/12 text-white"
                        : "border-white/12 bg-white/[0.025] text-ink-300 hover:border-white/25"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${mode === m.id ? "text-brand-400" : "text-ink-400"}`} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-400">Paso {Math.min(step + 1, 4)} de 4 · {stepLabels[step]}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
                {mode === "ride" && step === 0 && "Elige el destino. En la app real se usaría tu ubicación y el mapa."}
                {mode === "ride" && step === 1 && "Compara servicios con el mismo recorrido y elige por precio o capacidad."}
                {mode === "ride" && step === 2 && "Revisa conductor, tarifa y método de pago antes de confirmar."}
                {mode === "ride" && step === 3 && "Durante el viaje puedes compartir la ruta y usar el botón de emergencia."}
                {mode === "package" && step === 0 && "Define recogida y entrega. El código de entrega protege a ambas partes."}
                {mode === "package" && step === 1 && "El tamaño y el peso determinan la unidad y la tarifa."}
                {mode === "package" && step === 2 && "Se muestra el precio y el tiempo estimado antes de confirmar."}
                {mode === "package" && step === 3 && "El seguimiento muestra el avance hasta la puerta."}
                {mode === "driver" && step === 0 && "El conductor decide cuándo conectarse. No hay turnos obligatorios."}
                {mode === "driver" && step === 1 && "La solicitud muestra origen, destino, tarifa y distancia antes de aceptar."}
                {mode === "driver" && step === 2 && "Al aceptar, la app guía al punto de recogida y registra el viaje."}
                {mode === "driver" && step === 3 && "El resumen muestra lo cobrado y lo que se queda el conductor."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="chip" onClick={() => reset()}>
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar demo
              </button>
              <button type="button" className="chip" onClick={() => openModal({ type: "download" })}>
                <Smartphone className="h-3.5 w-3.5" /> Quiero la app
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[360px]">
            <div className="relative overflow-hidden rounded-[42px] border-[7px] border-ink-800 bg-ink-950 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
              <div className="flex h-8 items-center justify-between bg-ink-950 px-5 text-[9px] text-ink-300">
                <span className="mono">9:41</span>
                <span className="h-4 w-20 rounded-full bg-ink-800" aria-hidden="true" />
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Demo
                </span>
              </div>

              <div className="relative h-[540px] overflow-hidden bg-[#0c141b]">
                <DemoMap
                  mode={mode}
                  step={step}
                  online={online}
                  destination={mode === "ride" ? destination : "Sabana Grande"}
                />

                <div className="absolute left-3 right-3 top-3 rounded-xl border border-white/10 bg-ink-900/92 px-3 py-2 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
                      <span className="stripe-mark h-1 w-5" /> Llégate
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8.5px] text-ink-400">Simulación</span>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-ink-900/97 px-4 pb-4 pt-2.5 backdrop-blur">
                  <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/20" aria-hidden="true" />

                  {mode === "ride" && (
                    <RideFlow
                      step={step}
                      destination={destination}
                      setDestination={setDestination}
                      serviceSlug={serviceSlug}
                      setServiceSlug={setServiceSlug}
                      payment={payment}
                      setPayment={setPayment}
                      fare={fare}
                      onNext={() => setStep((s) => Math.min(3, s + 1))}
                      onBack={() => setStep((s) => Math.max(0, s - 1))}
                      onReset={() => reset()}
                      onShare={() => notify("Ruta compartida (simulación).")}
                    />
                  )}

                  {mode === "package" && (
                    <PackageFlow
                      step={step}
                      onNext={() => setStep((s) => Math.min(3, s + 1))}
                      onBack={() => setStep((s) => Math.max(0, s - 1))}
                      onReset={() => reset()}
                      onShare={() => notify("Seguimiento compartido (simulación).")}
                    />
                  )}

                  {mode === "driver" && (
                    <DriverFlow
                      step={step}
                      online={online}
                      setOnline={setOnline}
                      onNext={() => setStep((s) => Math.min(3, s + 1))}
                      onBack={() => setStep((s) => Math.max(0, s - 1))}
                      onReset={() => reset()}
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[10.5px] text-ink-500">
              Interfaz de demostración. Los nombres, placas y montos son de ejemplo.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Qué estás probando"
            title="Los detalles que hacen la diferencia"
            align="center"
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Wallet,
                title: "Precio antes de pedir",
                text: "El monto y la conversión a bolívares se muestran antes de confirmar, no al final.",
              },
              {
                icon: Share2,
                title: "Ruta compartida",
                text: "Un enlace en vivo para un contacto de confianza, sin instalar nada.",
              },
              {
                icon: ShieldCheck,
                title: "Conductor verificado",
                text: "La ficha del conductor muestra el estado de verificación y los datos del vehículo.",
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
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="heading text-[20px] font-bold text-white">La demo termina aquí. La app sigue en camino.</p>
            <p className="mt-1 text-[13px] text-ink-400">
              Déjanos tu contacto para recibir el enlace cuando esté publicada.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openModal({ type: "download" })}>
              Avísame <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" to="/servicios">
              Ver servicios
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function DemoMap({
  mode,
  step,
  online,
  destination,
}: {
  mode: Mode;
  step: number;
  online: boolean;
  destination: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,160,180,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,180,0.16) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />
      <div className="absolute left-[12%] top-[18%] h-[16%] w-[24%] rounded-md border border-white/5 bg-[#13202a]" />
      <div className="absolute right-[10%] top-[24%] h-[22%] w-[28%] rounded-md border border-white/5 bg-[#13202a]" />
      <div className="absolute bottom-[32%] left-[18%] h-[20%] w-[34%] rounded-md border border-white/5 bg-[#13202a]" />
      <div className="absolute bottom-[18%] right-[16%] h-[14%] w-[20%] rounded-md border border-white/5 bg-[#13202a]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 340 540" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M60 440 C 90 380, 130 350, 160 300 S 230 210, 246 150" stroke="#ff6b00" strokeWidth="7" strokeLinecap="round" opacity="0.16" />
        <path d="M60 440 C 90 380, 130 350, 160 300 S 230 210, 246 150" stroke="#ff6b00" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="8 7" className="route-line" />
        <circle cx="60" cy="440" r="7" fill="#07090c" stroke="#ffd200" strokeWidth="3" />
        <circle cx="246" cy="150" r="7" fill="#ff6b00" stroke="#07090c" strokeWidth="3" />
      </svg>
      <div className="absolute bottom-[39%] left-[34%] rounded-md border border-white/10 bg-ink-950/85 px-2 py-1 text-[8.5px] text-ink-200">
        <span className="flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 text-racing-500" /> Tu ubicación
        </span>
      </div>
      <div className="absolute left-[50%] top-[22%] rounded-md border border-white/10 bg-ink-950/85 px-2 py-1 text-[8.5px] text-ink-200">
        <span className="flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 text-brand-400" /> {destination}
        </span>
      </div>
      {mode === "driver" && (
        <div className="absolute right-3 top-16 flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/90 px-2.5 py-1 text-[9px]">
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse-dot" : "bg-ink-500"}`} />
          {online ? "En línea" : "Desconectado"}
        </div>
      )}
      {mode === "ride" && step === 3 && (
        <div className="absolute left-3 top-16 flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-950/80 px-2.5 py-1 text-[9px] text-emerald-300">
          <Clock className="h-2.5 w-2.5" /> Llega en 4 min
        </div>
      )}
    </div>
  );
}

function RideFlow({
  step,
  destination,
  setDestination,
  serviceSlug,
  setServiceSlug,
  payment,
  setPayment,
  fare,
  onNext,
  onBack,
  onReset,
  onShare,
}: {
  step: number;
  destination: string;
  setDestination: (v: string) => void;
  serviceSlug: string;
  setServiceSlug: (v: string) => void;
  payment: string;
  setPayment: (v: string) => void;
  fare: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  onShare: () => void;
}) {
  const service = getService(serviceSlug)!;
  const options = ["mototaxi", "taxi-pana", "minivan-vip"].map((slug) => getService(slug)!);

  return (
    <div className="animate-fade-in">
      {step === 0 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 1 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">¿A dónde vas?</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {places.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDestination(p)}
                className={`rounded-full border px-2 py-1 text-[9.5px] ${
                  destination === p ? "border-brand-500 bg-brand-500/20 text-white" : "border-white/12 text-ink-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/70 px-2.5 py-2 text-[10px] text-ink-200">
            <Navigation className="h-3 w-3 text-brand-400" /> Tu ubicación → {destination}
          </div>
          <DemoButton onClick={onNext}>Buscar servicio</DemoButton>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 2 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Elige cómo moverte</p>
          <div className="mt-2 grid gap-1.5">
            {options.map((s) => {
              const price = estimateFare(s.fromUSD, s.perKmUSD, 2.5);
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setServiceSlug(s.slug)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${
                    serviceSlug === s.slug ? "border-brand-500 bg-brand-500/12" : "border-white/10 bg-ink-950/60"
                  }`}
                >
                  <span className="text-brand-400">
                    <ServiceIcon icon={s.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold text-white">{s.name}</span>
                    <span className="block text-[8px] text-ink-400">{s.eta} · {s.capacity}</span>
                  </span>
                  <span className="mono text-[10px] font-semibold text-white">{formatUSD(price)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-2 py-1.5 text-[9.5px] text-ink-300">
              Atrás
            </button>
            <button type="button" onClick={onNext} className="flex-1 rounded-lg bg-brand-500 py-1.5 text-[10px] font-semibold text-white">
              Continuar
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 3 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Confirma tu viaje</p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 p-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-white">
                Conductor asignado <BadgeCheck className="h-3 w-3 text-brand-400" />
              </p>
              <p className="text-[8px] text-ink-400">Unidad demo · placa ABC123</p>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {["Efectivo Bs", "Efectivo USD", "Saldo"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPayment(p)}
                className={`rounded-full border px-2 py-1 text-[9px] ${
                  payment === p ? "border-racing-500/50 bg-racing-500/10 text-racing-300" : "border-white/12 text-ink-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-end justify-between border-t border-white/8 pt-2">
            <div>
              <p className="text-[8px] text-ink-500">{service.name} · 2,5 km</p>
              <p className="mono text-[16px] font-semibold text-white">{formatUSD(fare)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-ink-500">Se paga al final</p>
              <p className="text-[9px] text-ink-300">{payment}</p>
            </div>
          </div>
          <DemoButton onClick={onNext}>Confirmar viaje · {formatUSD(fare)}</DemoButton>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            <p className="text-[9px] font-semibold text-emerald-300">Conductor en camino · 4 min</p>
          </div>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Todo listo para salir</p>
          <p className="mt-0.5 text-[9px] text-ink-400">Ruta: Tu ubicación → {destination}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onShare} className="flex items-center justify-center gap-1 rounded-lg border border-white/12 py-2 text-[9.5px] text-ink-200">
              <Share2 className="h-3 w-3" /> Compartir ruta
            </button>
            <button type="button" onClick={onShare} className="flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-[9.5px] text-red-300">
              <ShieldCheck className="h-3 w-3" /> Emergencia
            </button>
          </div>
          <div className="mt-2 rounded-lg border border-white/8 bg-ink-950/60 p-2">
            <div className="flex justify-between text-[9px]"><span className="text-ink-400">Recogida</span><span className="text-white">2 min</span></div>
            <div className="mt-1 flex justify-between text-[9px]"><span className="text-ink-400">Llegada estimada</span><span className="text-white">12:45 PM</span></div>
          </div>
          <button type="button" onClick={onReset} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-white/12 py-1.5 text-[9.5px] text-ink-300">
            <RotateCcw className="h-3 w-3" /> Reiniciar demo
          </button>
        </>
      )}
    </div>
  );
}

function PackageFlow({
  step,
  onNext,
  onBack,
  onReset,
  onShare,
}: {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  onShare: () => void;
}) {
  const [pickup] = useState("Chacao");
  const [dropoff, setDropoff] = useState("Sabana Grande");
  const [size, setSize] = useState("Caja mediana");
  const price = size === "Sobre" ? 2.4 : size === "Caja mediana" ? 3.2 : 4.1;

  return (
    <div className="animate-fade-in">
      {step === 0 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 1 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">¿Qué envías y a dónde?</p>
          <div className="mt-2 grid gap-1.5 text-[9.5px]">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/70 px-2 py-1.5">
              <MapPin className="h-3 w-3 text-racing-500" /> Recoger en <span className="font-semibold text-white">{pickup}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/70 px-2 py-1.5">
              <Navigation className="h-3 w-3 text-brand-400" />
              <select
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                className="w-full bg-transparent text-[9.5px] text-white outline-none"
              >
                {places.map((p) => (
                  <option key={p} className="bg-ink-900">{p}</option>
                ))}
              </select>
            </div>
          </div>
          <DemoButton onClick={onNext}>Continuar</DemoButton>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 2 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Tamaño del paquete</p>
          <div className="mt-2 grid gap-1.5">
            {["Sobre", "Caja mediana", "Hasta 5 kg"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[10px] ${
                  size === s ? "border-brand-500 bg-brand-500/12 text-white" : "border-white/10 bg-ink-950/60 text-ink-300"
                }`}
              >
                {s}
                <span className="mono text-[9.5px]">{formatUSD(s === "Sobre" ? 2.4 : s === "Caja mediana" ? 3.2 : 4.1)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-2 py-1.5 text-[9.5px] text-ink-300">Atrás</button>
            <button type="button" onClick={onNext} className="flex-1 rounded-lg bg-brand-500 py-1.5 text-[10px] font-semibold text-white">Continuar</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 3 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Confirma la entrega</p>
          <div className="mt-2 grid gap-1 rounded-lg border border-white/10 bg-ink-950/60 p-2 text-[9px] text-ink-300">
            <p><span className="text-ink-500">Recogida:</span> {pickup}</p>
            <p><span className="text-ink-500">Entrega:</span> {dropoff}</p>
            <p><span className="text-ink-500">Paquete:</span> {size}</p>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/8 pt-2">
            <div>
              <p className="text-[8px] text-ink-500">Delivery Express</p>
              <p className="mono text-[16px] font-semibold text-white">{formatUSD(price)}</p>
            </div>
            <span className="rounded-full border border-racing-500/30 bg-racing-500/10 px-2 py-0.5 text-[8px] text-racing-300">
              Código al recibir
            </span>
          </div>
          <DemoButton onClick={onNext}>Confirmar envío · {formatUSD(price)}</DemoButton>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            <p className="text-[9px] font-semibold text-emerald-300">Mensajero en camino · 18 min</p>
          </div>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Tu paquete va en ruta</p>
          <p className="mt-0.5 text-[9px] text-ink-400">{pickup} → {dropoff}</p>
          <div className="mt-2 rounded-lg border border-white/8 bg-ink-950/60 p-2">
            <div className="flex justify-between text-[9px]"><span className="text-ink-400">Código de entrega</span><span className="mono text-racing-400">4 2 8 6</span></div>
            <p className="mt-1 text-[8px] text-ink-500">Compártelo solo con quien recibe.</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onShare} className="flex items-center justify-center gap-1 rounded-lg border border-white/12 py-2 text-[9.5px] text-ink-200">
              <Share2 className="h-3 w-3" /> Compartir
            </button>
            <button type="button" onClick={onReset} className="flex items-center justify-center gap-1 rounded-lg border border-white/12 py-2 text-[9.5px] text-ink-300">
              <RotateCcw className="h-3 w-3" /> Reiniciar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DriverFlow({
  step,
  online,
  setOnline,
  onNext,
  onBack,
  onReset,
}: {
  step: number;
  online: boolean;
  setOnline: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
}) {
  return (
    <div className="animate-fade-in">
      {step === 0 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Paso 1 de 3</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Conéctate cuando quieras</p>
          <p className="mt-0.5 text-[9px] text-ink-400">Zona: Caracas · Este</p>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-2">
            <div>
              <p className="text-[10px] font-semibold text-white">{online ? "Recibiendo solicitudes" : "Estás desconectado"}</p>
              <p className="text-[8px] text-ink-400">{online ? "Buscando viajes en tu zona" : "Actívate para empezar"}</p>
            </div>
            <button
              type="button"
              onClick={() => setOnline(!online)}
              role="switch"
              aria-checked={online}
              className={`relative h-5 w-9 rounded-full transition ${online ? "bg-emerald-500" : "bg-ink-600"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${online ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
          <DemoButton onClick={() => { setOnline(true); onNext(); }} disabled={!online && false}>
            {online ? "Ver solicitud" : "Conectarme y ver solicitud"}
          </DemoButton>
        </>
      )}

      {step === 1 && (
        <>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-400">Solicitud</p>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Taxi Pana · 2,5 km</p>
          <div className="mt-2 rounded-lg border border-white/10 bg-ink-950/60 p-2 text-[9px]">
            <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-racing-500" /> Chacao</p>
            <p className="mt-1 flex items-center gap-1"><Navigation className="h-3 w-3 text-brand-400" /> Altamira</p>
            <div className="mt-2 flex items-end justify-between border-t border-white/8 pt-1.5">
              <span className="text-ink-400">Ganas</span>
              <span className="mono text-[15px] font-semibold text-white">$6,20</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={onBack} className="rounded-lg border border-white/10 py-2 text-[9.5px] text-ink-400">Rechazar</button>
            <button type="button" onClick={onNext} className="rounded-lg bg-brand-500 py-2 text-[9.5px] font-semibold text-white">Aceptar viaje</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            <p className="text-[9px] font-semibold text-emerald-300">Viaje aceptado</p>
          </div>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Ve al punto de recogida</p>
          <p className="mt-0.5 text-[9px] text-ink-400">Chacao · 4 min</p>
          <div className="mt-2 grid gap-1.5">
            <button type="button" className="flex items-center justify-center gap-1 rounded-lg bg-brand-500 py-2 text-[9.5px] font-semibold text-white">
              <Navigation className="h-3 w-3" /> Abrir navegación
            </button>
            <button type="button" onClick={onBack} className="flex items-center justify-center gap-1 rounded-lg border border-white/12 py-2 text-[9.5px] text-ink-300">
              <Phone className="h-3 w-3" /> Llamar al pasajero
            </button>
          </div>
          <button type="button" onClick={onNext} className="mt-2 w-full rounded-lg border border-white/12 py-1.5 text-[9px] text-ink-300">
            Simular llegada y completar
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            <p className="text-[9px] font-semibold text-emerald-300">Viaje completado</p>
          </div>
          <p className="heading mt-0.5 text-[16px] font-bold text-white">Resumen del viaje</p>
          <div className="mt-2 rounded-lg border border-white/10 bg-ink-950/60 p-2 text-[9px]">
            <div className="flex justify-between"><span className="text-ink-400">Cobrado al pasajero</span><span className="mono text-white">$6,20</span></div>
            <div className="mt-1 flex justify-between"><span className="text-ink-400">Comisión del plan</span><span className="mono text-emerald-400">$0,00</span></div>
            <div className="mt-1 flex justify-between border-t border-white/8 pt-1"><span className="text-ink-300">Te quedas con</span><span className="mono font-semibold text-white">$6,20</span></div>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={onReset} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/12 py-1.5 text-[9px] text-ink-300">
              <RotateCcw className="h-3 w-3" /> Reiniciar
            </button>
            <button type="button" onClick={() => onNext()} className="flex-1 rounded-lg bg-brand-500 py-1.5 text-[9px] font-semibold text-white">
              Seguir conectado
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DemoButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-2 w-full rounded-lg bg-brand-500 py-2 text-[10px] font-semibold text-white transition hover:bg-brand-400 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
