import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { Button, PageHero } from "../components/ui";
import { Reveal } from "../components/Motion";
import { getCuenta, getMetricasPilotos, loadSession, realAuthEnabled, type Cuenta, type MetricasPilotos } from "../lib/api";

// Meta de arranque: 90 pilotos activos (prepago recurrente) al cierre del mes 3.
// "Activo" = piloto aprobado con una recarga confirmada en los últimos 30 días.

const tarjeta = "rounded-xl border border-asphalt-800 bg-asphalt-950/70 p-4 text-left";

function Cifra({ titulo, valor, nota }: { titulo: string; valor: number; nota: string }) {
  return (
    <div className={tarjeta}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">{titulo}</p>
      <p className="heading mt-1 text-[28px] font-extrabold text-white">{valor}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{nota}</p>
    </div>
  );
}

function Medidor({ datos }: { datos: MetricasPilotos }) {
  const porcentaje = Math.min(100, Math.round((datos.activos30d / datos.meta) * 100));
  const faltan = Math.max(0, datos.meta - datos.activos30d);
  const maximo = Math.max(1, ...datos.semanas.map((item) => item.aprobados));

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className={tarjeta} aria-label="Avance hacia la meta">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Pilotos activos (últimos 30 días)</p>
        <p className="heading mt-1 text-[34px] font-extrabold text-white">
          {datos.activos30d} <span className="text-[18px] font-semibold text-ink-500">/ {datos.meta}</span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={datos.meta}
          aria-valuenow={Math.min(datos.activos30d, datos.meta)}
          aria-label="Avance hacia la meta de pilotos activos"
          className="mt-3 h-3 overflow-hidden rounded-full bg-asphalt-800"
        >
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink-300">
          {faltan === 0 ? "Meta alcanzada: se cumple el hito para abrir el Hub." : `Faltan ${faltan} pilotos activos para la meta.`}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra titulo="Aprobados" valor={datos.aprobados} nota="Registro verificado" />
        <Cifra titulo="Con saldo" valor={datos.conSaldo} nota="Pueden recibir viajes" />
        <Cifra titulo="En línea" valor={datos.enLinea} nota="Conectados ahora" />
        <Cifra titulo="Por revisar" valor={datos.pendientes} nota="Esperan aprobación" />
      </div>

      <section className={tarjeta} aria-label="Aprobados por semana">
        <h3 className="heading text-[15px] font-bold text-white">Pilotos aprobados por semana</h3>
        <ul className="mt-3 flex h-28 items-end gap-2">
          {datos.semanas.map((item) => (
            <li key={item.semana} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] text-ink-300">{item.aprobados}</span>
              <span
                className="w-full rounded-t bg-brand-500/80"
                style={{ height: `${Math.max(4, (item.aprobados / maximo) * 100)}%` }}
                title={`Semana del ${item.semana}`}
              />
              <span className="text-[10px] text-ink-500">{item.semana.slice(5)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function AdminPilotosPage() {
  const [sesion] = useState(() => loadSession());
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(realAuthEnabled && sesion !== null);
  const [datos, setDatos] = useState<MetricasPilotos | null>(null);
  const [error, setError] = useState("");

  const esAdmin = cuenta?.usuario.rol === "admin";

  useEffect(() => {
    if (!realAuthEnabled || !sesion) return;
    let activo = true;
    getCuenta()
      .then((actual) => activo && setCuenta(actual))
      .catch(() => activo && setError("No pudimos abrir tu cuenta. Vuelve a ingresar."))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [sesion]);

  useEffect(() => {
    if (!esAdmin) return;
    let activo = true;
    getMetricasPilotos()
      .then((resultado) => activo && setDatos(resultado))
      .catch(() => activo && setError("No pudimos cargar las métricas. Inténtalo de nuevo."));
    return () => {
      activo = false;
    };
  }, [esAdmin]);

  return (
    <>
      <PageHero
        compact
        kicker="Operaciones · Meta"
        title={<>Meta de pilotos.</>}
        description="Seguimiento de los 90 pilotos activos con prepago recurrente. Activo significa aprobado y con una recarga confirmada en los últimos 30 días."
        actions={
          <Button variant="secondary" to="/admin">
            Cola de pilotos <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            {!realAuthEnabled || !sesion ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Entra con una cuenta de operaciones</h2>
                <div className="mt-5">
                  <Button to="/ingresar">
                    Ingresar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : cargando ? (
              <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Abriendo métricas…
              </div>
            ) : !esAdmin ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <h2 className="heading text-[22px] font-extrabold text-white">Esta sección es de operaciones.</h2>
                <p className="mt-2 text-[13.5px] text-ink-300">Tu cuenta no tiene rol administrador.</p>
              </div>
            ) : error ? (
              <p role="alert" className="mx-auto max-w-xl text-center text-[13.5px] text-red-300">
                {error}
              </p>
            ) : datos ? (
              <Medidor datos={datos} />
            ) : (
              <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Calculando…
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
