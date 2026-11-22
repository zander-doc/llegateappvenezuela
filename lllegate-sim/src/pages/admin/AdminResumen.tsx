import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { getResumenPanel, type ResumenPanel } from "../../lib/api";

const tarjeta = "rounded-2xl border border-asphalt-800 bg-asphalt-900/60 p-4 text-left";

function Cifra({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className={tarjeta}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">{titulo}</p>
      <p className="heading mt-1 text-[28px] font-extrabold text-white">{valor}</p>
      {nota ? <p className="mt-1 text-[12px] text-ink-400">{nota}</p> : null}
    </div>
  );
}

const usd = (n: number) => `$${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

export function pendientesVisibles(p: ResumenPanel["pendientes"]) {
  const filas: Array<{ n: number; texto: string; to: string }> = [];
  if (p.pilotos !== undefined) filas.push({ n: p.pilotos, texto: "pilotos por revisar", to: "/admin/verificacion" });
  if (p.cobros !== undefined) filas.push({ n: p.cobros, texto: "cobros por confirmar", to: "/admin/cobros" });
  if (p.solicitudes !== undefined) filas.push({ n: p.solicitudes, texto: "solicitudes nuevas", to: "/admin/solicitudes" });
  return filas;
}

export function AdminResumenPage() {
  const [datos, setDatos] = useState<ResumenPanel | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    getResumenPanel()
      .then((r) => activo && setDatos(r))
      .catch(() => activo && setError("No pudimos cargar el resumen. Inténtalo de nuevo."));
    return () => {
      activo = false;
    };
  }, []);

  if (error) return <p role="alert" className="p-6 text-[14px] text-racing-400">{error}</p>;
  if (!datos) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-[13px] text-ink-400" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando resumen…
      </div>
    );
  }

  const { pilotos, viajes, embudo, dinero } = datos;
  const porcentaje = Math.min(100, Math.round((pilotos.activos30d / pilotos.meta) * 100));
  const maximo = Math.max(1, ...viajes.porDia.map((d) => d.total));
  const pendientes = pendientesVisibles(datos.pendientes);

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 sm:p-6">
      <h1 className="heading text-[28px] font-extrabold text-white">Resumen</h1>

      <section className={tarjeta} aria-label="Meta de pilotos activos">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">Pilotos activos (30 días)</p>
        <p className="heading mt-1 text-[34px] font-extrabold text-white">
          {pilotos.activos30d} <span className="text-[18px] font-semibold text-ink-500">/ {pilotos.meta}</span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={pilotos.meta}
          aria-valuenow={Math.min(pilotos.activos30d, pilotos.meta)}
          aria-label="Avance hacia la meta de pilotos activos"
          className="mt-3 h-3 overflow-hidden rounded-full bg-asphalt-800"
        >
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${porcentaje}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dinero ? (
          <>
            <Cifra titulo="Recargas hoy" valor={usd(dinero.recargasHoyUsd)} nota={`${dinero.recargasHoy} confirmadas`} />
            <Cifra titulo="Por confirmar" valor={usd(dinero.porConfirmarUsd)} nota={`${dinero.porConfirmar} en revisión`} />
          </>
        ) : null}
        <Cifra titulo="Carreras hoy" valor={String(viajes.completadosHoy)} nota={`${viajes.canceladosHoy} canceladas`} />
        <Cifra titulo="Pilotos en línea" valor={String(pilotos.enLinea)} nota="Conectados ahora" />
        {dinero ? <Cifra titulo="Comisión del mes" valor={usd(dinero.comisionMesUsd)} /> : null}
      </div>

      {pendientes.length > 0 ? (
        <section className={tarjeta} aria-label="Por atender">
          <h2 className="heading text-[16px] font-bold text-white">Por atender</h2>
          <ul className="mt-3 grid gap-2">
            {pendientes.map((p) => (
              <li key={p.to}>
                <Link
                  to={p.to}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-asphalt-800 bg-asphalt-950/60 px-3 text-[14px] text-ink-100 hover:border-brand-400/50"
                >
                  <span>
                    <strong className="heading mr-1 text-[18px] text-white">{p.n}</strong> {p.texto}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-400">
                    Revisar <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={tarjeta} aria-label="Carreras de los últimos 7 días">
        <h2 className="heading text-[16px] font-bold text-white">Carreras completadas, 7 días</h2>
        <ul className="mt-3 flex h-28 items-end gap-2">
          {viajes.porDia.map((d) => (
            <li key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] text-ink-300">{d.total}</span>
              <span className="w-full rounded-t bg-brand-500/80" style={{ height: `${Math.max(4, (d.total / maximo) * 100)}%` }} />
              <span className="text-[10px] text-ink-500">{d.dia.slice(5)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={tarjeta} aria-label="Embudo de pilotos">
        <h2 className="heading text-[16px] font-bold text-white">Embudo</h2>
        <ol className="mt-3 grid gap-2 text-[13.5px] text-ink-200">
          <li className="flex justify-between"><span>Cuentas creadas</span><strong>{embudo.cuentas}</strong></li>
          <li className="flex justify-between"><span>Registros de piloto</span><strong>{embudo.registrosPiloto}</strong></li>
          <li className="flex justify-between"><span>Aprobados</span><strong>{embudo.aprobados}</strong></li>
          <li className="flex justify-between"><span>Activos (30 días)</span><strong>{embudo.activos30d}</strong></li>
        </ol>
      </section>
    </div>
  );
}
