import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bike, Car, ShieldCheck, Store } from "lucide-react";
import { RealWallet } from "./RealWallet";
import {
  getCodigoReferido,
  getEnLinea,
  getPilotosFavoritos,
  setEnLinea,
  type Cuenta,
  type PilotoFavorito,
} from "../lib/api";

// Panel de la cuenta por rol: la misma cabecera para todos y, debajo, solo lo
// que cada rol necesita (el pasajero sus pilotos, el piloto su saldo).

type Rol = "pasajero" | "piloto" | "comercio";

const ROLES: Array<{ id: Rol; titulo: string }> = [
  { id: "pasajero", titulo: "Pasajero" },
  { id: "piloto", titulo: "Piloto" },
  { id: "comercio", titulo: "Comercio" },
];

const tarjeta = "rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-4 text-left";
const enlace = "inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-brand-400 transition hover:text-brand-300";

function Pasajero() {
  const [favoritos, setFavoritos] = useState<PilotoFavorito[] | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getPilotosFavoritos()
      .then((lista) => activo && setFavoritos(lista))
      .catch(() => activo && setFavoritos([]));
    getCodigoReferido()
      .then((valor) => activo && setCodigo(valor))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="grid gap-3">
      <Link
        to="/app"
        className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-[15px] font-bold text-asphalt-950 transition hover:bg-brand-400"
      >
        Pedir un viaje <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>

      <section className={tarjeta} aria-label="Mis pilotos favoritos">
        <h3 className="heading text-[15px] font-bold text-white">Mis pilotos favoritos</h3>
        {favoritos !== null && favoritos.some((piloto) => piloto.enLinea) && (
          <p className="mt-1 text-[12px] font-semibold text-emerald-300">
            {favoritos.filter((piloto) => piloto.enLinea).length} en línea ahora
          </p>
        )}
        {favoritos === null ? (
          <p className="mt-2 text-[12.5px] text-ink-500">Cargando…</p>
        ) : favoritos.length === 0 ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
            Aún no tienes favoritos. Cuando un piloto te guste, márcalo desde la app y aparecerá aquí.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {favoritos.map((piloto) => (
              <li key={piloto.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-brand-400">
                  {piloto.tipoVehiculo === "moto" ? (
                    <Bike className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Car className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-white">{piloto.nombre}</span>
                  <span className="block text-[11.5px] text-ink-500">
                    {piloto.tipoVehiculo === "moto" ? "Moto" : "Carro"} · {piloto.placa}
                  </span>
                </span>
                {piloto.enLinea && (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    En línea
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {codigo && (
        <section className={tarjeta} aria-label="Invitar amigos">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Tu código para invitar</p>
          <p className="heading mt-1 text-[20px] font-extrabold tracking-[0.06em] text-white">{codigo}</p>
        </section>
      )}
    </div>
  );
}

function InterruptorEnLinea() {
  const [enLinea, setValor] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getEnLinea()
      .then((valor) => activo && setValor(valor))
      .catch(() => activo && setValor(false));
    return () => {
      activo = false;
    };
  }, []);

  async function cambiar() {
    if (enLinea === null || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      setValor(await setEnLinea(!enLinea));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cambiar tu estado. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={tarjeta} aria-label="Estado en línea">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="heading text-[15px] font-bold text-white">{enLinea ? "Estás en línea" : "Estás desconectado"}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
            {enLinea
              ? "Tus pasajeros favoritos ven que estás disponible. Se desconecta solo tras 12 horas."
              : "Conéctate para que tus pasajeros favoritos sepan que estás disponible."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enLinea === true}
          aria-label="Estar en línea"
          disabled={enLinea === null || guardando}
          onClick={cambiar}
          className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
            enLinea ? "bg-emerald-400" : "bg-asphalt-700"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${enLinea ? "left-7" : "left-1"}`}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

function Piloto({ cuenta, onCuentaActualizada }: { cuenta: Cuenta; onCuentaActualizada: () => void }) {
  const { conductor, capacidades } = cuenta;

  if (capacidades.puedeConducir) {
    return (
      <div className="grid gap-3">
        <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-2.5 text-left text-[12.5px] leading-relaxed text-ink-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          Piloto verificado. La comisión de cada viaje se descuenta de tu saldo prepago.
        </p>
        <InterruptorEnLinea />
        <RealWallet onCuentaActualizada={onCuentaActualizada} />
      </div>
    );
  }

  return (
    <section className={tarjeta}>
      <h3 className="heading text-[15px] font-bold text-white">
        {conductor ? "Tu registro de piloto" : "Maneja con Llégate"}
      </h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
        {conductor
          ? conductor.verificacion === "rechazado"
            ? "Necesitamos correcciones en tu registro. Revisa lo indicado y vuelve a enviarlo."
            : "Completa los pasos y envía tu registro: un operador lo revisa y te avisa aquí."
          : "Regístrate como piloto en 4 pasos: vehículo, documentos y revisión. Puedes ser pasajero y piloto con la misma cuenta."}
      </p>
      <Link to="/conductores/verificacion" className={`${enlace} mt-2`}>
        {conductor ? "Continuar mi registro" : "Ser piloto"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function Comercio() {
  return (
    <section className={tarjeta}>
      <h3 className="heading flex items-center gap-2 text-[15px] font-bold text-white">
        <Store className="h-4 w-4 text-brand-400" aria-hidden="true" /> Anuncia tu negocio
      </h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
        Publica tu negocio en el Mercado de Llégate. Un operador revisa la ficha antes de mostrarla.
      </p>
      <Link to="/mercado" className={`${enlace} mt-2`}>
        Ir al Mercado <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export function PanelRol({ cuenta, onCuentaActualizada }: { cuenta: Cuenta; onCuentaActualizada: () => void }) {
  // Quien ya es piloto abre directo en su pestaña; el resto, en la de pasajero.
  const [rol, setRol] = useState<Rol>(cuenta.capacidades.puedeConducir ? "piloto" : "pasajero");

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Cambiar de rol"
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-asphalt-800 bg-asphalt-900/70 p-1.5"
      >
        {ROLES.map(({ id, titulo }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`rol-${id}`}
            aria-selected={rol === id}
            aria-controls="panel-rol"
            onClick={() => setRol(id)}
            className={`min-h-[44px] rounded-xl text-[13.5px] font-semibold transition ${
              rol === id ? "bg-brand-500 text-asphalt-950" : "text-ink-300 hover:text-white"
            }`}
          >
            {titulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-rol" aria-labelledby={`rol-${rol}`} className="mt-3">
        {rol === "pasajero" && <Pasajero />}
        {rol === "piloto" && <Piloto cuenta={cuenta} onCuentaActualizada={onCuentaActualizada} />}
        {rol === "comercio" && <Comercio />}
      </div>
    </div>
  );
}
