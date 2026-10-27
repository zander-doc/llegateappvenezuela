import { Link } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import {
  Apple,
  ArrowRight,
  Check,
  LayoutGrid,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Badge } from "./ui";
import { Logo } from "./Logo";
import { Reveal, Stagger, StaggerItem } from "./Motion";
import { useUI } from "../lib/ui";
import { STATS } from "../data/site";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Streak = {
  id: string;
  top: string;
  width: number;
  height: number;
  duration: number;
  delay: number;
  gradient: string;
  glow: string;
  reverse?: boolean;
  headlight?: string;
};

const STREAKS: Streak[] = [
  {
    id: "streak-1",
    top: "12%",
    width: 420,
    height: 2,
    duration: 2.4,
    delay: 0,
    gradient: "linear-gradient(90deg, transparent 0%, #FF6B00 55%, #FFFFFF 100%)",
    glow: "rgba(255, 107, 0, 0.7)",
    headlight: "#FFF4E5",
  },
  {
    id: "streak-2",
    top: "22%",
    width: 340,
    height: 1.5,
    duration: 3.1,
    delay: 1.2,
    gradient: "linear-gradient(90deg, transparent 0%, #FFD200 55%, #FFFFFF 100%)",
    glow: "rgba(255, 210, 0, 0.65)",
    headlight: "#FFFFF0",
  },
  {
    id: "streak-3",
    top: "35%",
    width: 580,
    height: 2.5,
    duration: 1.9,
    delay: 0.4,
    gradient: "linear-gradient(90deg, transparent 0%, #FF6B00 35%, #FFE033 70%, #FFFFFF 100%)",
    glow: "rgba(255, 107, 0, 0.75)",
    headlight: "#FFFFFF",
  },
  {
    id: "streak-4",
    top: "49%",
    width: 380,
    height: 1.5,
    duration: 2.8,
    delay: 1.7,
    gradient: "linear-gradient(90deg, transparent 0%, #E51D1D 60%, #FF8F33 100%)",
    glow: "rgba(229, 29, 29, 0.65)",
  },
  {
    id: "streak-5",
    top: "63%",
    width: 460,
    height: 2,
    duration: 2.2,
    delay: 0.9,
    gradient: "linear-gradient(90deg, transparent 0%, #FF8F33 55%, #FFE033 100%)",
    glow: "rgba(255, 107, 0, 0.7)",
    headlight: "#FFEAA7",
  },
  {
    id: "streak-6",
    top: "77%",
    width: 360,
    height: 1.5,
    duration: 3.3,
    delay: 2.1,
    gradient: "linear-gradient(90deg, transparent 0%, #FFD200 60%, #FFFFFF 100%)",
    glow: "rgba(255, 210, 0, 0.65)",
    headlight: "#FFFFFF",
  },
  {
    id: "streak-7",
    top: "89%",
    width: 540,
    height: 2.5,
    duration: 2,
    delay: 1.4,
    gradient: "linear-gradient(90deg, transparent 0%, #FF6B00 30%, #E51D1D 65%, #FFFFFF 100%)",
    glow: "rgba(255, 107, 0, 0.75)",
    headlight: "#FFFFFF",
  },
  {
    id: "streak-rev-1",
    top: "29%",
    width: 360,
    height: 1.5,
    duration: 3.8,
    delay: 0.6,
    gradient: "linear-gradient(90deg, #FFFFFF 0%, #E51D1D 45%, transparent 100%)",
    glow: "rgba(229, 29, 29, 0.55)",
    reverse: true,
    headlight: "#FF6B6B",
  },
  {
    id: "streak-rev-2",
    top: "69%",
    width: 420,
    height: 1.5,
    duration: 3.2,
    delay: 1.9,
    gradient: "linear-gradient(90deg, #FFFFFF 0%, #C20F0F 45%, transparent 100%)",
    glow: "rgba(229, 29, 29, 0.5)",
    reverse: true,
    headlight: "#FF8787",
  },
];

const RACING_LINES = [
  { top: "25%", via: "rgba(255, 107, 0, 0.18)", duration: 8 },
  { top: "50%", via: "rgba(255, 107, 0, 0.30)", duration: 6 },
  { top: "75%", via: "rgba(255, 107, 0, 0.12)", duration: 10 },
];

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  top: `${(i * 37.5 + 8) % 100}%`,
  left: `${(i * 61.8 + 4) % 100}%`,
  size: i % 4 === 0 ? 4 : 3,
  duration: 3 + (i % 5) * 0.45,
  delay: (i % 9) * 0.55,
}));

const SPEED_LINES = [0, 1, 2, 3, 4];

function GooglePlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M3.4 2.1 14.2 12 3.4 21.9c-.3-.3-.4-.6-.4-1.1V3.2c0-.5.1-.8.4-1.1Z" fill="#00C3FF" />
      <path d="M4.5 2.9 14.2 12l3.2-2.3L4.5 2.9Z" fill="#00E676" />
      <path d="M4.5 21.1 14.2 12l3.2 2.3-12.9 6.8Z" fill="#FF3D57" />
      <path d="m17.4 9.7 2.5 1.4c.7.4.7 1.4 0 1.8l-2.5 1.4-1.8-2.3 1.8-2.3Z" fill="#FFC400" />
    </svg>
  );
}

function StoreButton({
  eyebrow,
  label,
  icon,
  onClick,
}: {
  eyebrow: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[60px] items-center gap-3 rounded-xl border border-asphalt-700 bg-asphalt-900/80 px-4 py-2.5 text-left transition hover:border-brand-500/60 hover:bg-asphalt-850"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        {icon}
      </span>
      <span>
        <span className="block text-[9px] font-semibold uppercase leading-tight tracking-[0.16em] text-ink-400">
          {eyebrow}
        </span>
        <span className="heading mt-0.5 block text-[16.5px] font-bold leading-tight text-white">{label}</span>
      </span>
    </button>
  );
}

function RoadDash({
  top,
  color,
  dash,
  gap,
  duration,
  opacity,
  reverse = false,
}: {
  top: string;
  color: string;
  dash: number;
  gap: number;
  duration: number;
  opacity: number;
  reverse?: boolean;
}) {
  const period = dash + gap;

  return (
    <div className="absolute left-0 h-px w-full overflow-hidden" style={{ top, opacity }} aria-hidden="true">
      <motion.div
        className="h-full w-full"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} ${dash}px, transparent ${dash}px, transparent ${period}px)`,
        }}
        animate={{ backgroundPositionX: reverse ? [`${period}px`, "0px"] : ["0px", `-${period}px`] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Subtle 60px grid with a radial mask so it fades before the edges */}
      <div className="asphalt-grid absolute inset-0" />

      {/* Slow-moving orange light orbs */}
      <motion.div
        className="absolute right-[4%] top-[8%] h-[420px] w-[420px] rounded-full blur-[90px] sm:h-[520px] sm:w-[520px]"
        style={{
          background: "radial-gradient(ellipse, rgba(255, 107, 0, 0.12), transparent 70%)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[2%] top-[38%] h-[320px] w-[320px] rounded-full blur-[90px] sm:h-[420px] sm:w-[420px]"
        style={{
          background: "radial-gradient(ellipse, rgba(255, 107, 0, 0.10), transparent 70%)",
        }}
        animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-[6%] right-[20%] h-[340px] w-[340px] rounded-full blur-[90px] sm:h-[460px] sm:w-[460px]"
        style={{
          background: "radial-gradient(ellipse, rgba(255, 107, 0, 0.08), transparent 70%)",
        }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Horizontal racing lines crossing at different speeds */}
      {RACING_LINES.map((line) => (
        <motion.div
          key={line.duration}
          className="absolute left-0 h-px w-full"
          style={{
            top: line.top,
            backgroundImage: `linear-gradient(90deg, transparent 0%, ${line.via} 50%, transparent 100%)`,
            willChange: "transform",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: line.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Twinkling light particles */}
      <div className="absolute inset-0">
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-brand-500/70"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              boxShadow: "0 0 6px rgba(255, 107, 0, 0.75)",
              willChange: "transform, opacity",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Moving lane dashes */}
      <div className="absolute inset-0 opacity-65">
        <RoadDash top="31%" color="rgba(255, 107, 0, 0.45)" dash={24} gap={28} duration={1.8} opacity={0.25} />
        <RoadDash
          top="66%"
          color="rgba(255, 210, 0, 0.40)"
          dash={28}
          gap={32}
          duration={2.2}
          opacity={0.2}
          reverse
        />
        <RoadDash top="84%" color="rgba(255, 107, 0, 0.35)" dash={18} gap={26} duration={1.8} opacity={0.18} />
      </div>

      {/* Diagonal speed lines on the right half */}
      <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden opacity-30">
        {SPEED_LINES.map((i) => (
          <motion.div
            key={i}
            className="absolute h-px w-[200px]"
            style={{
              top: `${20 + i * 15}%`,
              rotate: -45,
              backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(255, 107, 0, 0.55) 100%)",
              willChange: "transform",
            }}
            initial={{ x: "-200px" }}
            animate={{ x: ["-200px", "800px"] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
          />
        ))}
      </div>


      {/* Traffic light streaks with their headlights */}
      <div className="absolute inset-0 opacity-65">
        {STREAKS.map((streak) => (
          <motion.div
            key={streak.id}
            className="absolute left-0 rounded-full"
            style={{
              top: streak.top,
              width: streak.width,
              height: streak.height,
              backgroundImage: streak.gradient,
              filter: `drop-shadow(0 0 5px ${streak.glow})`,
              willChange: "transform, opacity",
            }}
            initial={{ x: streak.reverse ? "300%" : "-150%", scaleX: 0.4, opacity: 0 }}
            animate={{
              x: streak.reverse
                ? ["300%", "232%", "30%", "-150%"]
                : ["-150%", "-82%", "120%", "300%"],
              scaleX: streak.reverse ? [0.4, 0.53, 0.94, 1.3] : [0.4, 0.55, 1, 1.4],
              opacity: streak.reverse ? [0, 0.45, 0.4, 0] : [0, 0.65, 0.6, 0],
            }}
            transition={{
              duration: streak.duration,
              delay: streak.delay,
              repeat: Infinity,
              ease: EASE,
              times: [0, 0.15, 0.6, 1],
            }}
          >
            {streak.headlight ? (
              <span
                className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
                  streak.reverse ? "left-0" : "right-0"
                }`}
                style={{
                  backgroundColor: streak.headlight,
                  boxShadow: `0 0 10px 2px ${streak.glow}, 0 0 3px #FFFFFF`,
                }}
              />
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const { openModal } = useUI();

  return (
    <section className="asphalt-texture relative flex min-h-[calc(100svh-64px)] flex-col overflow-hidden border-b border-asphalt-800 lg:min-h-[calc(100svh-100px)]">
      {/* The ambient loop runs even when the OS requests reduced motion. */}
      <MotionConfig reducedMotion="never">
        <HeroBackdrop />
      </MotionConfig>

      <div className="wrap relative z-10 grid flex-1 items-center gap-10 pb-10 pt-8 sm:pt-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8 lg:pb-14 lg:pt-12">
        <Stagger gap={0.14}>
          <StaggerItem>
            <Logo className="h-12 sm:h-14 lg:h-[72px]" link={false} />
          </StaggerItem>
          <StaggerItem>
            <Badge tone="brand" className="mb-5 mt-6 uppercase tracking-[0.16em]">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse-dot" aria-hidden="true" />
              Venezuela · Próximo lanzamiento
            </Badge>
          </StaggerItem>
          <StaggerItem>
            <h1 className="heading text-[48px] font-black uppercase leading-[0.95] tracking-tight text-white sm:text-[68px] lg:text-[84px]">
              <span className="block">Pide.</span>
              <span className="block">Súbete.</span>
              <span className="block italic text-brand-500 drop-shadow-[0_10px_20px_rgba(255,107,0,0.3)]">
                Llega.
              </span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-300 sm:text-[16.5px]">
              <strong className="font-semibold text-white">
                Mototaxi, taxi, delivery, minivan o autobús: tú eliges.
              </strong>{" "}
              Seis servicios en una sola app, con la tarifa clara antes de pedir y pago en
              bolívares o dólares.
            </p>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <StoreButton
                eyebrow="Disponible en"
                label="Google Play"
                icon={<GooglePlayIcon className="h-5 w-5" />}
                onClick={() => openModal({ type: "download" })}
              />
              <StoreButton
                eyebrow="Úsala en la web"
                label="iPhone & PWA"
                icon={<Apple className="h-5 w-5 fill-current text-white" />}
                onClick={() => openModal({ type: "download" })}
              />
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-300">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" strokeWidth={3} /> Precio antes de pedir
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" strokeWidth={3} /> Pago en Bs y USD
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" strokeWidth={3} /> Ruta compartida
              </span>
            </div>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-4 text-[11.5px] text-ink-500">
              Prototipo de rediseño. La app está en preparación.{" "}
              <Link to="/app" className="font-semibold text-brand-400 hover:text-brand-300">
                Prueba la demo web <ArrowRight className="inline h-3 w-3" />
              </Link>
            </p>
          </StaggerItem>
        </Stagger>

        <Reveal
          className="relative mx-auto w-full max-w-[300px] sm:max-w-[350px]"
          y={24}
          delay={0.25}
        >
          <MotionConfig reducedMotion="never">
            <div className="relative mx-auto w-full max-w-[250px] sm:max-w-[280px]">
              <motion.div
                className="absolute inset-x-8 bottom-8 top-8 rounded-full bg-brand-500/20 blur-[70px]"
                aria-hidden="true"
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                className="absolute inset-x-10 bottom-1 h-[3px] stripes-h rounded-full opacity-70"
                aria-hidden="true"
              />

              <motion.div
                className="relative"
                animate={{ y: [0, -12, 0], rotate: [-1.2, 1.2, -1.2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="relative aspect-[1/2] w-full [filter:drop-shadow(0_28px_50px_rgba(0,0,0,0.6))]">
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src="/telefono.webp"
                      alt="Vista de la app Llégate con un viaje en curso y la ruta marcada en el mapa"
                      width={1024}
                      height={1024}
                      className="absolute left-[-65.18%] top-[-5.8%] w-[228.57%] max-w-none"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </MotionConfig>

          <div className="relative mt-6 grid gap-2.5 sm:grid-cols-2">
            <Link
              to="/registro"
              className="group flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-brand-500/45 bg-brand-500/12 px-3 py-2.5 transition hover:border-brand-500/80 hover:bg-brand-500/18"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-asphalt-950">
                <UserPlus className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-300">
                  Cliente
                </span>
                <span className="heading mt-0.5 block text-[15.5px] font-bold leading-tight text-white">
                  Regístrate
                </span>
              </span>
            </Link>
            <Link
              to="/servicios"
              className="group flex min-h-[64px] items-center gap-2.5 rounded-2xl border border-asphalt-700 bg-asphalt-900/80 px-3 py-2.5 transition hover:border-brand-500/60 hover:bg-asphalt-850"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-brand-400">
                <LayoutGrid className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
                  Servicios
                </span>
                <span className="heading mt-0.5 block text-[15.5px] font-bold leading-tight text-white">
                  Ver servicios
                </span>
              </span>
            </Link>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-brand-400" strokeWidth={3} /> Registro 100% gratuito
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Verificación en minutos
            </span>
          </div>
        </Reveal>
      </div>

      <div className="relative z-10 border-t border-white/8 bg-ink-950/85">
        <div className="wrap grid grid-cols-2 gap-px bg-white/8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-ink-950 px-4 py-5 sm:px-5">
              <p className="mono text-[24px] font-semibold leading-none text-white sm:text-[28px]">{s.value}</p>
              <p className="mt-1.5 text-[12px] font-medium text-ink-200">{s.label}</p>
              <p className="mt-0.5 hidden text-[11px] leading-snug text-ink-500 sm:block">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
