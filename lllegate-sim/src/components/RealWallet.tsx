import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "./ui";
import { RECHARGE_PACKS } from "../data/prepaid";
import { formatUSD } from "../lib/format";
import {
  cancelPayment,
  createPaymentIntent,
  getPaymentMethods,
  getWallet,
  listPayments,
  paymentErrorMessage,
  reportPayment,
  type Billetera,
  type EstadoPago,
  type MetodoPago,
  type MetodoPagoDisponible,
  type PagoIntento,
} from "../lib/api";

const ESTADO_PAGO: Record<EstadoPago, { label: string; tone: "neutral" | "success" | "yellow" | "danger" }> = {
  pendiente: { label: "Pendiente", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "yellow" },
  confirmado: { label: "Confirmado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
  expirado: { label: "Expirado", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};

const ESTADO_BILLETERA: Record<Billetera["estado"], { label: string; tone: "success" | "yellow" | "danger" }> = {
  activo: { label: "Saldo activo", tone: "success" },
  saldo_bajo: { label: "Saldo bajo", tone: "yellow" },
  sin_saldo: { label: "Sin saldo", tone: "danger" },
};

const METODO_LABEL: Record<MetodoPago, { nombre: string; detalle: string }> = {
  pago_movil: { nombre: "Pago Móvil", detalle: "Revisión manual" },
  binance_pay: { nombre: "Binance Pay", detalle: "Confirmación automática" },
};

const fechaFmt = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fecha(iso: string | null) {
  if (!iso) return "";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? "" : fechaFmt.format(value);
}

function ErrorBox({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-red-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </p>
  );
}

export function RealWallet({ onCuentaActualizada }: { onCuentaActualizada?: () => void }) {
  const [billetera, setBilletera] = useState<Billetera | null>(null);
  const [metodos, setMetodos] = useState<MetodoPagoDisponible[]>([]);
  const [pagos, setPagos] = useState<PagoIntento[]>([]);
  const [metodo, setMetodo] = useState<MetodoPago>("pago_movil");
  const [monto, setMonto] = useState("10");
  const [referencia, setReferencia] = useState("");
  const [intento, setIntento] = useState<PagoIntento | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const intentoRef = useRef<PagoIntento | null>(null);
  useEffect(() => {
    intentoRef.current = intento;
  }, [intento]);

  const datos = useCallback(
    () => Promise.all([getWallet(), getPaymentMethods(), listPayments()]),
    [],
  );

  const aplicar = useCallback(
    ([wallet, disponibles, historial]: [Billetera, MetodoPagoDisponible[], PagoIntento[]]) => {
      setBilletera(wallet);
      setMetodos(disponibles);
      setPagos(historial);
      const primero = disponibles.find((item) => item.disponible);
      if (primero) setMetodo(primero.id);
    },
    [],
  );

  useEffect(() => {
    let activo = true;
    datos()
      .then((resultado) => {
        if (activo) aplicar(resultado);
      })
      .catch((fallo) => {
        if (activo) setError(paymentErrorMessage(fallo));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [aplicar, datos]);

  const reintentar = useCallback(() => {
    setCargando(true);
    setError("");
    datos()
      .then(aplicar)
      .catch((fallo) => setError(paymentErrorMessage(fallo)))
      .finally(() => setCargando(false));
  }, [aplicar, datos]);

  const sincronizar = useCallback(async () => {
    try {
      const [wallet, historial] = await Promise.all([getWallet(), listPayments()]);
      setBilletera(wallet);
      setPagos(historial);

      const actual = intentoRef.current;
      if (!actual) return;
      const nuevo = historial.find((pago) => pago.id === actual.id);
      if (!nuevo) return;
      setIntento(nuevo);
      if (nuevo.estado === "confirmado" && actual.estado !== "confirmado") {
        setAviso(`Recarga de ${formatUSD(nuevo.montoUSD)} confirmada y acreditada.`);
        onCuentaActualizada?.();
      }
    } catch {
      // El sondeo no interrumpe lo que el usuario está haciendo.
    }
  }, [onCuentaActualizada]);

  const enProceso = intento !== null && (intento.estado === "pendiente" || intento.estado === "en_revision");

  useEffect(() => {
    if (!enProceso) return;
    const id = window.setInterval(() => {
      void sincronizar();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [enProceso, sincronizar]);

  async function crearIntento(event: FormEvent) {
    event.preventDefault();
    setError("");
    setAviso("");

    const valor = Number(monto.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Escribe un monto mayor a cero.");
      return;
    }
    if (billetera) {
      const { recargaMinimaUSD: min, recargaMaximaUSD: max } = billetera.limites;
      if (valor < min || valor > max) {
        setError(`La recarga va de ${formatUSD(min)} a ${formatUSD(max)}.`);
        return;
      }
    }

    setEnviando(true);
    try {
      const pago = await createPaymentIntent({ metodo, montoUSD: Math.round(valor * 100) / 100 });
      setIntento(pago);
      setPagos((previos) => [pago, ...previos.filter((item) => item.id !== pago.id)]);
      setReferencia("");
      setAviso(
        pago.metodo === "binance_pay"
          ? "Orden creada. Abre Binance Pay para completarla."
          : "Usa los datos de abajo y reporta la referencia de tu banco.",
      );
    } catch (fallo) {
      setError(paymentErrorMessage(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function reportar(event: FormEvent) {
    event.preventDefault();
    if (!intento) return;
    setError("");
    setAviso("");

    const limpia = referencia.trim();
    if (!/^\d{6,12}$/.test(limpia)) {
      setError("La referencia del Pago Móvil debe tener de 6 a 12 dígitos.");
      return;
    }

    setEnviando(true);
    try {
      const resultado = await reportPayment({ id: intento.id, referencia: limpia });
      setIntento({ ...intento, estado: resultado.estado, referenciaReportada: limpia });
      setPagos((previos) =>
        previos.map((item) =>
          item.id === intento.id ? { ...item, estado: resultado.estado, referenciaReportada: limpia } : item,
        ),
      );

      if (resultado.ok) {
        const sla = billetera?.limites.slaAprobacionMinutos ?? 15;
        setAviso(`Referencia ${limpia} enviada. Un operador la revisa en hasta ${sla} minutos.`);
      } else {
        setError("El pago expiró antes de reportar la referencia. Crea una recarga nueva.");
      }
    } catch (fallo) {
      setError(paymentErrorMessage(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarIntento() {
    if (!intento) return;
    setError("");
    setAviso("");
    setEnviando(true);
    try {
      const resultado = await cancelPayment(intento.id);
      if (resultado.ok) {
        setIntento({ ...intento, estado: "cancelado" });
        setPagos((previos) => previos.map((item) => (item.id === intento.id ? { ...item, estado: "cancelado" } : item)));
        setAviso("Cancelaste esta recarga. No se cobró nada.");
      }
    } catch (fallo) {
      setError(paymentErrorMessage(fallo));
    } finally {
      setEnviando(false);
    }
  }

  function limpiarIntento() {
    setIntento(null);
    setReferencia("");
    setError("");
    setAviso("");
  }

  if (cargando) {
    return (
      <section className="mt-6 rounded-2xl border border-asphalt-800 bg-asphalt-950/60 p-5 text-left" aria-busy="true">
        <p className="flex items-center gap-2 text-[12.5px] text-ink-400">
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando tu billetera real…
        </p>
      </section>
    );
  }

  const estadoBilletera = billetera ? ESTADO_BILLETERA[billetera.estado] : null;
  const metodoActual = metodos.find((item) => item.id === metodo);
  const pagoMovil = metodos.find((item) => item.id === "pago_movil" && item.disponible);
  const binance = metodos.find((item) => item.id === "binance_pay" && item.disponible);
  const sinMetodos = !pagoMovil && !binance;

  return (
    <section className="mt-6 text-left" aria-label="Billetera real">
      <div className="overflow-hidden rounded-2xl border border-asphalt-800 bg-asphalt-950/60">
        <div className="border-b border-white/8 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-300">
              <Wallet className="h-4 w-4 text-brand-400" /> Billetera real
            </p>
            <div className="flex items-center gap-2">
              {estadoBilletera && <Badge tone={estadoBilletera.tone}>{estadoBilletera.label}</Badge>}
              <button
                type="button"
                onClick={() => void sincronizar()}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-[10.5px] font-semibold text-ink-300 transition hover:border-brand-500/45 hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Actualizar
              </button>
            </div>
          </div>

          {billetera ? (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="mono text-[36px] font-semibold leading-none text-white">{formatUSD(billetera.disponibleUSD)}</p>
                <p className="pb-1 text-[12px] text-ink-400">
                  disponible {billetera.tipo === "piloto" ? "para recibir viajes" : "para tus viajes"}
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">Saldo total</dt>
                  <dd className="mono mt-0.5 text-[13px] font-semibold text-ink-100">{formatUSD(billetera.saldoUSD)}</dd>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wider text-ink-500">Reservado en viaje</dt>
                  <dd className="mono mt-0.5 text-[13px] font-semibold text-ink-100">
                    {formatUSD(billetera.reservadoUSD)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <button
              type="button"
              onClick={reintentar}
              className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-[12.5px] font-semibold text-brand-400 hover:text-brand-300"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          )}
        </div>

        <form className="border-b border-white/8 p-4 sm:p-5" onSubmit={crearIntento} noValidate>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="heading text-[16px] font-bold text-white">Recargar saldo</h3>
            {billetera?.tipo === "piloto" && (
              <span className="text-[10.5px] text-ink-500">
                De {formatUSD(billetera.limites.recargaMinimaUSD)} a {formatUSD(billetera.limites.recargaMaximaUSD)}
              </span>
            )}
          </div>

          <fieldset className="mt-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Método de pago</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["pago_movil", "binance_pay"] as const).map((id) => {
                const disponible = metodos.find((item) => item.id === id)?.disponible ?? false;
                const activo = metodo === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!disponible || enviando}
                    aria-pressed={activo}
                    onClick={() => setMetodo(id)}
                    className={`rounded-xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      activo
                        ? "border-brand-500/50 bg-brand-500/[0.10]"
                        : "border-white/10 bg-white/[0.02] hover:border-brand-500/40"
                    }`}
                  >
                    <span className="block text-[12.5px] font-semibold text-white">{METODO_LABEL[id].nombre}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-400">
                      {disponible ? METODO_LABEL[id].detalle : "No disponible ahora"}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Monto en dólares</legend>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {RECHARGE_PACKS.map((pack) => (
                <button
                  key={pack.amount}
                  type="button"
                  aria-pressed={Number(monto) === pack.amount}
                  onClick={() => setMonto(String(pack.amount))}
                  className={`mono rounded-lg border py-2 text-[12.5px] font-semibold transition ${
                    Number(monto) === pack.amount
                      ? "border-brand-500/50 bg-brand-500/[0.10] text-white"
                      : "border-white/10 bg-white/[0.02] text-ink-200 hover:border-brand-500/40"
                  }`}
                >
                  {formatUSD(pack.amount)}
                </button>
              ))}
            </div>
            <label className="mt-2 block">
              <span className="sr-only">Otro monto en dólares</span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                max="10000"
                step="0.5"
                value={monto}
                onChange={(event) => setMonto(event.target.value)}
                className="field mono"
                aria-label="Monto a recargar en dólares"
              />
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={enviando || sinMetodos || !metodoActual?.disponible}
            className="mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[14px] font-bold text-asphalt-950 transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-45"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
            {enviando ? "Preparando pago…" : "Crear orden de recarga"}
          </button>

          {sinMetodos && (
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              Las pasarelas aún no están configuradas en este entorno. Cuando lo estén, aquí verás Pago Móvil y
              Binance Pay.
            </p>
          )}
        </form>

        {(error || aviso) && (
          <div className="border-b border-white/8 px-4 py-3 sm:px-5">
            {error && <ErrorBox>{error}</ErrorBox>}
            {aviso && (
              <p role="status" className="flex items-start gap-2 text-[12px] leading-relaxed text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {aviso}
              </p>
            )}
          </div>
        )}

        {intento && (
          <div className="border-b border-white/8 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                  {METODO_LABEL[intento.metodo].nombre} · {intento.codigo}
                </p>
                <p className="mono mt-1 text-[22px] font-semibold leading-none text-white">
                  {formatUSD(intento.montoUSD)}
                </p>
              </div>
              <Badge tone={ESTADO_PAGO[intento.estado].tone}>{ESTADO_PAGO[intento.estado].label}</Badge>
            </div>

            {intento.estado === "pendiente" && (
              <>
                {intento.metodo === "pago_movil" ? (
                  <>
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11.5px] sm:grid-cols-3">
                      <div>
                        <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">Monto Bs</dt>
                        <dd className="mono mt-0.5 font-semibold text-white">
                          {intento.montoBs === null ? "—" : `Bs. ${intento.montoBs.toFixed(2)}`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">Banco</dt>
                        <dd className="mt-0.5 text-ink-200">{intento.instrucciones.banco ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">Teléfono</dt>
                        <dd className="mono mt-0.5 text-ink-200">{intento.instrucciones.telefono ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">Cédula</dt>
                        <dd className="mono mt-0.5 text-ink-200">{intento.instrucciones.cedula ?? "—"}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">Titular</dt>
                        <dd className="mt-0.5 text-ink-200">{intento.instrucciones.titular ?? "—"}</dd>
                      </div>
                    </dl>

                    <form className="mt-3 grid gap-2" onSubmit={reportar} noValidate>
                      <label className="block">
                        <span className="label">Referencia de tu banco</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={12}
                          value={referencia}
                          onChange={(event) => setReferencia(event.target.value.replace(/\D/g, ""))}
                          className="field mono"
                          placeholder="6 a 12 dígitos"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={enviando}
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[14px] font-bold text-asphalt-950 transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-45"
                      >
                        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {enviando ? "Enviando…" : "Reportar pago"}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="mt-3 grid gap-2">
                    <p className="text-[12px] leading-relaxed text-ink-300">
                      Completa el pago en Binance Pay. Cuando Binance nos avise, acreditamos tu saldo
                      automáticamente; esta pantalla se actualiza sola.
                    </p>
                    {intento.checkoutUrl ? (
                      <a
                        href={intento.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[14px] font-bold text-asphalt-950 transition hover:bg-brand-400"
                      >
                        Abrir Binance Pay <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="text-[11.5px] text-racing-400">
                        Binance no entregó el enlace de pago. Cancela esta orden e intenta de nuevo.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void sincronizar()}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/12 px-4 text-[12.5px] font-semibold text-ink-200 transition hover:border-brand-500/45 hover:text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Ya pagué, revisar estado
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void cancelarIntento()}
                  disabled={enviando}
                  className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-[11.5px] font-semibold text-ink-400 transition hover:text-white disabled:opacity-45"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar orden
                </button>
              </>
            )}

            {intento.estado === "en_revision" && (
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-ink-300">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-racing-400" />
                Referencia {intento.referenciaReportada ?? "reportada"} recibida. Un operador confirma el pago y tu
                saldo se acredita solo.
              </p>
            )}

            {intento.estado === "confirmado" && (
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Recarga confirmada y acreditada en tu saldo.
              </p>
            )}

            {intento.estado === "rechazado" && (
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {intento.motivoRechazo ?? "El pago fue rechazado. Revisa los datos e intenta de nuevo."}
              </p>
            )}

            {(intento.estado === "expirado" || intento.estado === "cancelado") && (
              <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
                {intento.estado === "expirado"
                  ? "La orden venció sin confirmar la referencia. Puedes crear una nueva."
                  : "Esta orden quedó cancelada."}
              </p>
            )}

            {intento.estado !== "pendiente" && (
              <button
                type="button"
                onClick={limpiarIntento}
                className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[11.5px] font-semibold text-brand-400 transition hover:text-brand-300"
              >
                Cerrar detalle
              </button>
            )}
          </div>
        )}

        <div>
          <p className="flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-300 sm:px-5">
            <History className="h-4 w-4 text-brand-400" /> Recargas recientes
          </p>
          {pagos.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-ink-400 sm:px-5">Aún no hay recargas en esta cuenta.</p>
          ) : (
            <ul className="divide-y divide-white/8 border-t border-white/8">
              {pagos.slice(0, 5).map((pago) => (
                <li key={pago.id}>
                  <button
                    type="button"
                    onClick={() => setIntento(pago)}
                    aria-label={`Ver recarga ${pago.codigo}`}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.03] sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ink-100">
                        {METODO_LABEL[pago.metodo].nombre} · {pago.codigo}
                      </p>
                      <p className="text-[10px] text-ink-500">{fecha(pago.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="mono text-[12px] font-semibold text-ink-200">{formatUSD(pago.montoUSD)}</span>
                      <Badge
                        tone={ESTADO_PAGO[pago.estado].tone}
                        className="!whitespace-nowrap !px-2 !py-0.5 !text-[9.5px]"
                      >
                        {ESTADO_PAGO[pago.estado].label}
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
        Esta billetera opera contra el backend real de Llégate. Pago Móvil se revisa manualmente; Binance Pay se
        confirma con su webhook firmado. La web nunca recibe tus claves bancarias.
      </p>
    </section>
  );
}
