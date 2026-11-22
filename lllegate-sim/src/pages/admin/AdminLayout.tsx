import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowLeft, Banknote, ClipboardCheck, Gauge, Headset, LayoutDashboard, Loader2, ShieldAlert, Users } from "lucide-react";
import { Logo } from "../../components/Logo";
import { Button } from "../../components/ui";
import { getAdminYo, loadSession, realAuthEnabled, type ModuloPanel, type PersonalYo } from "../../lib/api";
import { Toasts } from "../../components/Shell";
import { ModalHost } from "../../components/ModalHost";

export const ETIQUETA_ROL_PERSONAL = {
  superadmin: "Superadmin",
  operaciones: "Operaciones",
  finanzas: "Finanzas",
  soporte: "Soporte",
} as const;

interface Seccion {
  to: string;
  etiqueta: string;
  icono: typeof Gauge;
  modulo: ModuloPanel | null;
  end?: boolean;
}

export const SECCIONES: Seccion[] = [
  { to: "/admin", etiqueta: "Resumen", icono: LayoutDashboard, modulo: null, end: true },
  { to: "/admin/verificacion", etiqueta: "Verificación", icono: ClipboardCheck, modulo: "documentos" },
  { to: "/admin/cobros", etiqueta: "Cobros", icono: Banknote, modulo: "dinero" },
  { to: "/admin/pilotos", etiqueta: "Meta de pilotos", icono: Gauge, modulo: "metricas" },
  { to: "/admin/solicitudes", etiqueta: "Solicitudes", icono: Headset, modulo: "soporte" },
  { to: "/admin/personal", etiqueta: "Personal", icono: Users, modulo: "personal" },
];

export function seccionesVisibles(permisos: ModuloPanel[]): Seccion[] {
  return SECCIONES.filter((s) => s.modulo === null || permisos.includes(s.modulo));
}

function Mensaje({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children?: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-asphalt-950 p-6">
      <div className="card w-full max-w-md p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
          {icono}
        </span>
        <h1 className="heading mt-4 text-[22px] font-extrabold text-white">{titulo}</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [sesion] = useState(() => loadSession());
  const [yo, setYo] = useState<PersonalYo | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin_permiso" | "error">(
    realAuthEnabled && sesion ? "cargando" : "sin_permiso",
  );

  useEffect(() => {
    if (!realAuthEnabled || !sesion) return;
    let activo = true;
    getAdminYo()
      .then((datos) => {
        if (!activo) return;
        setYo(datos);
        setEstado("listo");
      })
      .catch((error: unknown) => {
        if (!activo) return;
        const status = (error as { status?: number }).status;
        setEstado(status === 401 || status === 403 ? "sin_permiso" : "error");
      });
    return () => {
      activo = false;
    };
  }, [sesion]);

  if (!realAuthEnabled || !sesion) {
    return (
      <Mensaje icono={<ShieldAlert className="h-6 w-6" />} titulo="Entra con una cuenta del equipo">
        <Button to="/ingresar">Ingresar</Button>
        <Button variant="secondary" to="/">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Button>
      </Mensaje>
    );
  }
  if (estado === "cargando") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-asphalt-950" role="status" aria-label="Abriendo el panel">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </div>
    );
  }
  if (estado === "sin_permiso" || !yo) {
    return (
      <Mensaje
        icono={<ShieldAlert className="h-6 w-6" />}
        titulo={estado === "error" ? "No pudimos abrir el panel" : "Esta cuenta no es del equipo"}
      >
        <Button variant="secondary" to="/">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Button>
      </Mensaje>
    );
  }

  const secciones = seccionesVisibles(yo.permisos);
  const enlace = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-[13.5px] font-semibold transition ${
      isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-[100dvh] bg-asphalt-950 text-ink-100 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/8 bg-ink-900 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 lg:block lg:px-5 lg:pt-5">
          <Logo className="h-8" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-racing-400 lg:mt-3">
            {ETIQUETA_ROL_PERSONAL[yo.rolPersonal]}
          </p>
        </div>
        <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {secciones.map(({ to, etiqueta, icono: Icono, end }) => (
            <NavLink key={to} to={to} end={end} className={enlace}>
              <Icono className="h-4 w-4 shrink-0" aria-hidden="true" /> {etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 pt-4 lg:block">
          <NavLink to="/" className={enlace}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al sitio
          </NavLink>
        </div>
      </aside>

      <main id="contenido" className="min-w-0">
        <Suspense
          fallback={
            <div className="grid min-h-[60dvh] place-items-center" role="status" aria-label="Cargando sección">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-brand-500" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <ModalHost />
      <Toasts />
    </div>
  );
}
