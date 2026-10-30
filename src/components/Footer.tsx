import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Mail, MapPin, MessageCircle, Smartphone, Wallet } from "lucide-react";
import { Logo } from "./Logo";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";
import { useUI } from "../lib/ui";
import { DEMO_BCV_RATE, formatRate } from "../lib/format";
import { HUBS } from "../data/site";

const serviceLinks = [
  ...LAUNCH_SERVICES.map((s) => ({ label: s.name, to: `/servicios/${s.slug}` })),
  ...UPCOMING_SERVICES.map((s) => ({ label: `${s.name} · próximamente`, to: `/servicios/${s.slug}` })),
];

const columns = [
  {
    title: "Servicios",
    links: serviceLinks,
  },
  {
    title: "Para pasajeros",
    links: [
      { label: "Crear cuenta", to: "/registro" },
      { label: "Ingresar a mi cuenta", to: "/ingresar" },
      { label: "Tarifas", to: "/tarifas" },
      { label: "Cobertura", to: "/cobertura" },
      { label: "Club VIP", to: "/pasajeros/club-vip" },
      { label: "Seguridad", to: "/seguridad" },
      { label: "Centro de ayuda", to: "/ayuda" },
    ],
  },
  {
    title: "Para conductores",
    links: [
      { label: "Trabaja con Llégate", to: "/conductores" },
      { label: "Prepago y comisiones", to: "/conductores/planes" },
      { label: "Registro", to: "/conductores/registro" },
      { label: "Conductoras Rosa", to: "/conductores/planes#rosa" },
      { label: "Mercado Motor", to: "/mercado" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { label: "Llégate Empresas", to: "/empresas" },
      { label: "Aliados y patrocinios", to: "/nosotros/aliados" },
      { label: "Publica tu negocio", to: "/mercado/publicar" },
      { label: "Términos y condiciones", to: "/legal/terminos" },
      { label: "Privacidad", to: "/legal/privacidad" },
    ],
  },
];

export function Footer() {
  const { openModal } = useUI();
  const launchCities = HUBS.filter((h) => h.status === "launch").length;

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/8 bg-ink-900">
      <div className="h-[3px] w-full stripes-h opacity-80" aria-hidden="true" />
      <div className="wrap py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo className="h-10" />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-300">
              Movilidad venezolana en una sola app. Arrancamos con mototaxi, taxi y delivery; minivan, autobús y
              carga llegan en próximas fases. Precio claro antes de subir y pago en bolívares o dólares.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openModal({ type: "download" })}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-left transition hover:border-brand-400/50"
              >
                <Smartphone className="h-5 w-5 text-brand-400" />
                <span>
                  <span className="block text-[10px] uppercase tracking-wider text-ink-400">Próximamente en</span>
                  <span className="block text-[13px] font-semibold text-white">App Store y Google Play</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openModal({ type: "download" })}
                className="flex min-h-[48px] items-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 text-left transition hover:border-brand-400/50"
              >
                <Download className="h-5 w-5 text-racing-500" />
                <span>
                  <span className="block text-[10px] uppercase tracking-wider text-ink-400">Mientras tanto</span>
                  <span className="block text-[13px] font-semibold text-white">Probar la demo</span>
                </span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => openModal({ type: "bcv" })} className="chip">
                <Wallet className="h-3.5 w-3.5 text-racing-500" />
                BCV <span className="mono">{formatRate(DEMO_BCV_RATE)}</span>
              </button>
              <Link to="/cobertura" className="chip">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {launchCities} estados de lanzamiento
              </Link>
              <button
                type="button"
                onClick={() => openModal({ type: "lead", intent: "contacto" })}
                className="chip"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                Escríbenos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">{col.title}</p>
                <ul className="mt-3 grid gap-0.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="block py-1.5 text-[13.5px] text-ink-300 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-5 border-t border-white/8 pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-400">
            <span>© 2026 Llégate App</span>
            <span className="hidden text-ink-700 sm:inline">·</span>
            <Link to="/legal/terminos" className="hover:text-white">Términos</Link>
            <Link to="/legal/privacidad" className="hover:text-white">Privacidad</Link>
            <Link to="/legal/cookies" className="hover:text-white">Cookies</Link>
            <a href="mailto:hola@llegate.app" className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3.5 w-3.5" /> hola@llegate.app
            </a>
          </div>
          <Link
            to="/nosotros/aliados"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-400 hover:text-brand-300"
          >
            ¿Quieres ser aliado? <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="mt-6 max-w-4xl text-[11.5px] leading-relaxed text-ink-500">
          Prototipo de rediseño con fines de demostración. Las tarifas, fichas de negocios, saldos y datos de
          cobertura son ejemplos y no representan una oferta comercial vigente. Este sitio no procesa viajes,
          pagos ni registros reales. Ningún dato que escribas aquí se envía a un servidor.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden px-4 text-center"
      >
        <span className="display block translate-y-[18%] text-[clamp(90px,17vw,240px)] leading-none text-white/[0.035]">
          Llégate
        </span>
      </div>
    </footer>
  );
}
