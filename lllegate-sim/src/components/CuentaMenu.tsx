import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogIn, LogOut, UserPlus, Wallet } from "lucide-react";
import { SESSION_EVENT, getCuenta, loadSession, logout, realAuthEnabled, type Cuenta } from "../lib/api";

// Menú de la cuenta: con sesión abierta muestra foto o inicial, nombre y la
// opción de cerrar sesión; sin sesión, los accesos de ingresar y crear cuenta.

function useCuentaActual(): Cuenta | null {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let activo = true;
    const sincronizar = () => {
      const sesion = realAuthEnabled ? loadSession() : null;
      const pedido: Promise<Cuenta | null> = sesion ? getCuenta().catch(() => null) : Promise.resolve(null);
      void pedido.then((actual) => {
        if (activo) setCuenta(actual);
      });
    };

    sincronizar();
    window.addEventListener(SESSION_EVENT, sincronizar);
    return () => {
      activo = false;
      window.removeEventListener(SESSION_EVENT, sincronizar);
    };
  }, [pathname]);

  return cuenta;
}

function Avatar({ cuenta, className }: { cuenta: Cuenta; className: string }) {
  const inicial = cuenta.usuario.nombre.trim().charAt(0).toUpperCase() || "?";
  return cuenta.usuario.fotoUrl ? (
    <img
      src={cuenta.usuario.fotoUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={`${className} rounded-full object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center rounded-full bg-brand-500/15 font-bold text-brand-400`}
    >
      {inicial}
    </span>
  );
}

export function CuentaMenu({ variante }: { variante: "barra" | "cajon" }) {
  const cuenta = useCuentaActual();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    // Cerrar el menú al navegar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    };
    const escape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  async function salir() {
    await logout();
    setAbierto(false);
    navegar("/");
  }

  if (!cuenta) {
    if (variante === "barra") {
      return (
        <Link
          to="/ingresar"
          className="hidden h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold text-ink-200 transition hover:bg-white/[0.06] hover:text-white lg:inline-flex"
        >
          <LogIn className="h-4 w-4 text-brand-400" />
          Ingresar
        </Link>
      );
    }
    return (
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Link
          to="/ingresar"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-asphalt-800 bg-asphalt-900 text-[14px] font-semibold text-white"
        >
          <LogIn className="h-4 w-4 text-brand-400" />
          Ingresar
        </Link>
        <Link
          to="/registro"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-500 text-[14px] font-bold text-asphalt-950"
        >
          <UserPlus className="h-4 w-4" />
          Crear cuenta
        </Link>
      </div>
    );
  }

  const primerNombre = cuenta.usuario.nombre.trim().split(/\s+/)[0] ?? "";

  if (variante === "cajon") {
    return (
      <div className="mb-4 rounded-xl border border-asphalt-800 bg-asphalt-900 p-3">
        <div className="flex items-center gap-3">
          <Avatar cuenta={cuenta} className="h-11 w-11 shrink-0 text-[16px]" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">{cuenta.usuario.nombre}</p>
            <p className="truncate text-[12px] text-ink-400">{cuenta.usuario.etiquetaRol}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/ingresar"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-asphalt-800 text-[13px] font-semibold text-white"
          >
            Mi cuenta
          </Link>
          <button
            type="button"
            onClick={() => void salir()}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-asphalt-800 text-[13px] font-semibold text-white"
          >
            <LogOut className="h-4 w-4 text-brand-400" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={raiz} className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
        className="inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13.5px] font-semibold text-ink-200 transition hover:bg-white/[0.06] hover:text-white"
      >
        <Avatar cuenta={cuenta} className="h-7 w-7 text-[12px]" />
        <span className="max-w-[110px] truncate">{primerNombre}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 rounded-xl border border-asphalt-800 bg-asphalt-900 p-2 shadow-xl"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-[13px] font-semibold text-white">{cuenta.usuario.nombre}</p>
            <p className="truncate text-[11.5px] text-ink-400">{cuenta.usuario.etiquetaRol}</p>
          </div>
          <Link
            role="menuitem"
            to="/ingresar"
            className="flex min-h-[38px] items-center rounded-lg px-2.5 text-[13px] text-ink-200 hover:bg-white/[0.06] hover:text-white"
          >
            Mi cuenta
          </Link>
          <Link
            role="menuitem"
            to="/billetera"
            className="flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-[13px] text-ink-200 hover:bg-white/[0.06] hover:text-white"
          >
            <Wallet className="h-4 w-4 text-brand-400" aria-hidden="true" /> Billetera
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void salir()}
            className="flex min-h-[38px] w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-ink-200 hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="h-4 w-4 text-brand-400" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
