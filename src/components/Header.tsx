import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  ChevronDown,
  CircleHelp,
  Download,
  Home,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Button, ServiceIcon } from "./ui";
import { LAUNCH_SERVICES, UPCOMING_SERVICES } from "../data/services";
import { useUI } from "../lib/ui";
import { DEMO_BCV_RATE, formatRate } from "../lib/format";

type MenuKey = "servicios" | "conductores" | "ayuda";

const navLinkBase =
  "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors";

export function Header() {
  const { openModal } = useUI();
  const location = useLocation();
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>("servicios");

  useEffect(() => {
    // Cerrar mega menú y drawer al navegar (incluye atrás/adelante del navegador).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenu(null);
    setDrawer(false);
  }, [location.pathname]);

  useEffect(() => {
    if (drawer) document.body.classList.add("drawer-open");
    else document.body.classList.remove("drawer-open");
    return () => document.body.classList.remove("drawer-open");
  }, [drawer]);

  const isActive = (prefix: string) =>
    prefix === "/" ? location.pathname === "/" : location.pathname.startsWith(prefix);

  const navClass = (prefix: string, extra = "") =>
    `${navLinkBase} ${isActive(prefix) ? "text-white" : "text-ink-300 hover:text-white hover:bg-white/[0.05]"} ${extra}`;

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      onMouseLeave={() => setMenu(null)}
    >
      {/* Utility strip: desktop only */}
      <div className="hidden h-9 border-b border-asphalt-800 bg-asphalt-950 lg:block">
        <div className="wrap flex h-full items-center justify-between text-[11.5px]">
          <div className="flex items-center gap-2.5 text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-racing-500 animate-pulse-dot" aria-hidden="true" />
              Prototipo de rediseño
            </span>
            <span className="text-ink-700" aria-hidden="true">·</span>
            <span>Datos de ejemplo</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/cobertura"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ink-300 transition hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-brand-400" />
              Cobertura en 8 estados
            </Link>
            <button
              type="button"
              onClick={() => openModal({ type: "bcv" })}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-ink-300 transition hover:text-white"
              aria-label="Ver tasa BCV y convertir montos"
            >
              <Wallet className="h-3.5 w-3.5 text-racing-500" />
              BCV <span className="mono text-racing-400">{formatRate(DEMO_BCV_RATE)}</span> Bs/USD
            </button>
            <span className="mx-1 h-3.5 w-px bg-white/10" aria-hidden="true" />
            <Link
              to="/registro"
              className="rounded-full px-2.5 py-1 font-semibold text-brand-400 transition hover:text-brand-300"
            >
              Crear cuenta
            </Link>
            <Link to="/empresas" className="rounded-full px-2.5 py-1 text-ink-300 transition hover:text-white">
              Empresas
            </Link>
            <Link to="/ayuda" className="rounded-full px-2.5 py-1 text-ink-300 transition hover:text-white">
              Ayuda
            </Link>
            <button
              type="button"
              onClick={() => openModal({ type: "lead", intent: "contacto" })}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ink-300 transition hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              Escríbenos
            </button>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-asphalt-800 bg-asphalt-950/92 backdrop-blur-xl">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link
              to="/"
              aria-label="Ir al inicio"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/12 px-3 text-[13px] font-semibold text-white lg:hidden"
            >
              <Home className="h-4 w-4 text-brand-400" />
              Inicio
            </Link>
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
              <NavLink to="/" end className={navClass("/")}>
                Inicio
              </NavLink>
              <div className="relative">
                <button
                  type="button"
                  className={navClass("/servicios")}
                  aria-expanded={menu === "servicios"}
                  aria-haspopup="true"
                  onMouseEnter={() => setMenu("servicios")}
                  onClick={() => setMenu(menu === "servicios" ? null : "servicios")}
                >
                  Servicios
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menu === "servicios" ? "rotate-180" : ""}`} />
                </button>
              </div>
              <NavLink to="/tarifas" className={({ isActive: a }) => navClass("/tarifas", a ? "text-white" : "")}>
                Tarifas
              </NavLink>
              <NavLink to="/cobertura" className={({ isActive: a }) => navClass("/cobertura", a ? "text-white" : "")}>
                Cobertura
              </NavLink>
              <div className="relative">
                <button
                  type="button"
                  className={navClass("/conductores")}
                  aria-expanded={menu === "conductores"}
                  aria-haspopup="true"
                  onMouseEnter={() => setMenu("conductores")}
                  onClick={() => setMenu(menu === "conductores" ? null : "conductores")}
                >
                  Conductores
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${menu === "conductores" ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              <NavLink to="/mercado" className={({ isActive: a }) => navClass("/mercado", a ? "text-white" : "")}>
                Mercado
              </NavLink>
              <div className="relative">
                <button
                  type="button"
                  className={navClass("/ayuda")}
                  aria-expanded={menu === "ayuda"}
                  aria-haspopup="true"
                  onMouseEnter={() => setMenu("ayuda")}
                  onClick={() => setMenu(menu === "ayuda" ? null : "ayuda")}
                >
                  Ayuda
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menu === "ayuda" ? "rotate-180" : ""}`} />
                </button>
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/ingresar"
              className="hidden h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-ink-200 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex"
            >
              <LogIn className="h-4 w-4 text-brand-400" />
              Ingresar
            </Link>
            <div className="hidden lg:block">
              <Button
                size="sm"
                onClick={() => openModal({ type: "download" })}
              >
                <Download className="h-4 w-4" />
                Descargar app
              </Button>
            </div>
            <button
              type="button"
              onClick={() => openModal({ type: "download" })}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 text-[13px] font-bold text-asphalt-950 lg:hidden"
            >
              <Download className="h-4 w-4" />
              App
            </button>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Abrir menú"
              aria-expanded={drawer}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mega menus */}
      {menu && (
        <div
          className="animate-fade-in hidden border-b border-asphalt-800 bg-asphalt-900/98 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:block"
          onMouseEnter={() => setMenu(menu)}
        >
          <div className="wrap py-7">
            {menu === "servicios" && <ServicesMenu onNavigate={() => setMenu(null)} />}
            {menu === "conductores" && <DriversMenu onNavigate={() => setMenu(null)} />}
            {menu === "ayuda" && <HelpMenu onNavigate={() => setMenu(null)} />}
          </div>
        </div>
      )}

      {drawer &&
        createPortal(
          <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="animate-fade-in absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <div className="animate-drawer-in absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-white/10 bg-ink-950">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 px-5">
                <p className="heading text-[14px] font-bold uppercase tracking-[0.16em] text-white">Menú</p>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  aria-label="Cerrar menú"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <div className="card mb-5 overflow-hidden p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="heading text-[16px] font-bold text-white">La app está en camino</p>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-400">
                        Déjanos tu contacto y te avisamos el día del lanzamiento.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => { setDrawer(false); openModal({ type: "download" }); }}>
                      Avísame
                    </Button>
                    <Button size="sm" variant="secondary" to="/app" onClick={() => setDrawer(false)}>
                      Probar demo
                    </Button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Link
                    to="/ingresar"
                    onClick={() => setDrawer(false)}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-asphalt-800 bg-asphalt-900 text-[14px] font-semibold text-white"
                  >
                    <LogIn className="h-4 w-4 text-brand-400" />
                    Ingresar
                  </Link>
                  <Link
                    to="/registro"
                    onClick={() => setDrawer(false)}
                    className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-500 text-[14px] font-bold text-asphalt-950"
                  >
                    <UserPlus className="h-4 w-4" />
                    Crear cuenta
                  </Link>
                </div>

                <nav aria-label="Menú móvil" className="divide-y divide-white/8">
                  <DrawerSection
                    title="Servicios"
                    open={mobileSection === "servicios"}
                    onToggle={() => setMobileSection(mobileSection === "servicios" ? null : "servicios")}
                  >
                    <div className="grid gap-1">
                      {LAUNCH_SERVICES.map((s) => (
                        <Link
                          key={s.slug}
                          to={`/servicios/${s.slug}`}
                          onClick={() => setDrawer(false)}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-brand-400">
                            <ServiceIcon icon={s.icon} className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-white">{s.name}</span>
                            <span className="block truncate text-[12px] text-ink-400">{s.short}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ink-500" />
                        </Link>
                      ))}
                      <p className="mt-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
                        Próximas fases
                      </p>
                      {UPCOMING_SERVICES.map((s) => (
                        <Link
                          key={s.slug}
                          to={`/servicios/${s.slug}`}
                          onClick={() => setDrawer(false)}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-ink-400">
                            <ServiceIcon icon={s.icon} className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold text-ink-200">{s.name}</span>
                            <span className="block truncate text-[12px] text-ink-500">
                              Próximamente · {s.phase}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ink-600" />
                        </Link>
                      ))}
                      <Link
                        to="/servicios"
                        onClick={() => setDrawer(false)}
                        className="mt-1 px-2 py-2 text-[13px] font-semibold text-brand-400"
                      >
                        Ver servicios
                      </Link>
                    </div>
                  </DrawerSection>

                  <Link
                    to="/tarifas"
                    onClick={() => setDrawer(false)}
                    className="flex min-h-[52px] items-center justify-between py-3 text-[15px] font-semibold text-white"
                  >
                    Tarifas <Calculator className="h-4 w-4 text-ink-500" />
                  </Link>
                  <Link
                    to="/cobertura"
                    onClick={() => setDrawer(false)}
                    className="flex min-h-[52px] items-center justify-between py-3 text-[15px] font-semibold text-white"
                  >
                    Cobertura <MapPin className="h-4 w-4 text-ink-500" />
                  </Link>

                  <DrawerSection
                    title="Conductores"
                    open={mobileSection === "conductores"}
                    onToggle={() => setMobileSection(mobileSection === "conductores" ? null : "conductores")}
                  >
                    <div className="grid gap-1 pb-2">
                      <DrawerLink to="/conductores" onNavigate={() => setDrawer(false)}>Trabaja con Llégate</DrawerLink>
                      <DrawerLink to="/conductores/planes" onNavigate={() => setDrawer(false)}>Prepago y comisiones</DrawerLink>
                      <DrawerLink to="/conductores/registro" onNavigate={() => setDrawer(false)}>Requisitos y registro</DrawerLink>
                      <DrawerLink to="/pasajeros/club-vip" onNavigate={() => setDrawer(false)}>Club VIP para pasajeros</DrawerLink>
                    </div>
                  </DrawerSection>

                  <Link
                    to="/mercado"
                    onClick={() => setDrawer(false)}
                    className="flex min-h-[52px] items-center justify-between py-3 text-[15px] font-semibold text-white"
                  >
                    Mercado Motor <BadgeCheck className="h-4 w-4 text-ink-500" />
                  </Link>

                  <DrawerSection
                    title="Ayuda"
                    open={mobileSection === "ayuda"}
                    onToggle={() => setMobileSection(mobileSection === "ayuda" ? null : "ayuda")}
                  >
                    <div className="grid gap-1 pb-2">
                      <DrawerLink to="/ayuda" onNavigate={() => setDrawer(false)}>Centro de ayuda</DrawerLink>
                      <DrawerLink to="/seguridad" onNavigate={() => setDrawer(false)}>Seguridad</DrawerLink>
                      <DrawerLink to="/empresas" onNavigate={() => setDrawer(false)}>Empresas</DrawerLink>
                      <DrawerLink to="/nosotros/aliados" onNavigate={() => setDrawer(false)}>Aliados</DrawerLink>
                    </div>
                  </DrawerSection>
                </nav>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setDrawer(false); openModal({ type: "bcv" }); }}
                    className="chip"
                  >
                    <Wallet className="h-3.5 w-3.5 text-racing-500" />
                    BCV {formatRate()} Bs/USD
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDrawer(false); openModal({ type: "lead", intent: "contacto" }); }}
                    className="chip"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    Escríbenos
                  </button>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
                  Prototipo de rediseño con datos de ejemplo. No es el sitio oficial ni procesa solicitudes reales.
                </p>
              </div>

              <div className="shrink-0 border-t border-white/8 bg-ink-950 px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                <Button full className="w-full" onClick={() => { setDrawer(false); openModal({ type: "download" }); }}>
                  <Download className="h-4 w-4" /> Descargar la app
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}

function DrawerSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between py-3 text-left text-[15px] font-semibold text-white"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

function DrawerLink({ to, children, onNavigate }: { to: string; children: React.ReactNode; onNavigate: () => void }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex min-h-[44px] items-center justify-between rounded-lg px-2 py-2 text-[14px] text-ink-200 transition hover:bg-white/[0.04] hover:text-white"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 text-ink-500" />
    </Link>
  );
}

function ServicesMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">Elige cómo moverte</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LAUNCH_SERVICES.map((s) => (
            <Link
              key={s.slug}
              to={`/servicios/${s.slug}`}
              onClick={onNavigate}
              className="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-white/[0.045]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
                <ServiceIcon icon={s.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold text-white">
                  {s.name}
                  <span className="mono text-[11px] font-normal text-racing-400">desde ${s.minFareUSD.toFixed(2)}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-400">{s.short}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-500">Próximas fases</p>
          <span className="h-px flex-1 bg-white/8" aria-hidden="true" />
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {UPCOMING_SERVICES.map((s) => (
            <Link
              key={s.slug}
              to={`/servicios/${s.slug}`}
              onClick={onNavigate}
              className="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-white/[0.045]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-ink-400 transition group-hover:border-brand-500/40 group-hover:text-brand-400">
                <ServiceIcon icon={s.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-200">
                  {s.name}
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-400">
                    {s.phase}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">Próximamente</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">Antes de pedir</p>
        <div className="mt-3 grid gap-1">
          <MenuLink to="/tarifas" label="Tarifas y calculadora" desc="Calcula tu viaje en USD y Bs" onNavigate={onNavigate} />
          <MenuLink to="/cobertura" label="Cobertura" desc="Ciudades activas y lista de espera" onNavigate={onNavigate} />
          <MenuLink to="/seguridad" label="Seguridad" desc="Verificación y ruta compartida" onNavigate={onNavigate} />
        </div>
        <div className="mt-4 rounded-xl border border-brand-500/25 bg-brand-500/10 p-3.5">
          <p className="text-[13.5px] font-semibold text-white">¿No sabes cuál elegir?</p>
          <p className="mt-1 text-[12px] leading-snug text-ink-300">Responde 3 preguntas y te recomendamos el servicio.</p>
          <Link
            to="/ayuda#elegir"
            onClick={onNavigate}
            className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-300"
          >
            Ver guía rápida <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DriversMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">Para conductores</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <MenuLink to="/conductores" label="Trabaja con Llégate" desc="Cómo funciona y cuánto puedes ganar" onNavigate={onNavigate} />
          <MenuLink to="/conductores/planes" label="Prepago y comisiones" desc="Saldo, recargas y 10% por viaje" onNavigate={onNavigate} />
          <MenuLink to="/conductores/registro" label="Requisitos y registro" desc="Documentos y verificación en 3 pasos" onNavigate={onNavigate} />
          <MenuLink to="/seguridad" label="Seguridad del conductor" desc="Protocolos y soporte en ruta" onNavigate={onNavigate} />
        </div>
      </div>
      <div className="rounded-2xl border border-racing-500/25 bg-racing-500/[0.06] p-5">
        <Badge tone="yellow">Prepago piloto</Badge>
        <p className="heading mt-3 text-[20px] font-bold text-white">Recarga desde $5</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">
          Sin mensualidad: la comisión del 10% sale de tu saldo al completar cada viaje. Empiezas con $2.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="yellow" to="/conductores/planes#billetera" onClick={onNavigate}>
            Ver billetera
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onNavigate()} to="/conductores/registro">
            Registrarme
          </Button>
        </div>
      </div>
    </div>
  );
}

function HelpMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400">Ayuda y compañía</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <MenuLink to="/ayuda" label="Centro de ayuda" desc="Preguntas frecuentes por tema" onNavigate={onNavigate} />
          <MenuLink to="/seguridad" label="Seguridad" desc="Verificación, emergencias y soporte" onNavigate={onNavigate} />
          <MenuLink to="/empresas" label="Llégate Empresas" desc="Movilidad para equipos y clientes" onNavigate={onNavigate} />
          <MenuLink to="/nosotros/aliados" label="Aliados y patrocinios" desc="Marcas, talleres y comercios" onNavigate={onNavigate} />
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <CircleHelp className="h-5 w-5 text-brand-400" />
        <p className="heading mt-3 text-[17px] font-bold text-white">¿Necesitas hablar con alguien?</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
          Escríbenos y te respondemos por el canal que prefieras.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onNavigate()} to="/ayuda#contacto">
            Canales de atención
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onNavigate()} to="/legal/terminos">
            Términos
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Soporte de lunes a sábado
        </div>
      </div>
    </div>
  );
}

function MenuLink({
  to,
  label,
  desc,
  onNavigate,
}: {
  to: string;
  label: string;
  desc: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="group flex items-start gap-2.5 rounded-xl p-3 transition hover:bg-white/[0.045]"
    >
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-brand-400 transition-transform group-hover:translate-x-0.5" />
      <span>
        <span className="block text-[14px] font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-[12px] text-ink-400">{desc}</span>
      </span>
    </Link>
  );
}
