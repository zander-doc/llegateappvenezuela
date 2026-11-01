import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldAlert, Wallet } from "lucide-react";
import { Button, PageHero } from "../components/ui";
import { Reveal } from "../components/Motion";
import { formatUSD } from "../lib/format";
import {
  ApiError,
  approveAdminRecharge,
  confirmAdminPayment,
  getCuenta,
  listAdminPayments,
  listAdminRecharges,
  loadSession,
  realAuthEnabled,
  rejectAdminPayment,
  rejectAdminRecharge,
  type Cuenta,
  type PagoAdmin,
  type RecargaAdmin,
} from "../lib/api";

type Tab = "pagos" | "recargas";

const fechaFmt = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function fecha(iso: string | null) {
  if (!iso) return "—";
  const valor = new Date(iso);
  return Number.isNaN(valor.getTime()) ? "—" : fechaFmt.format(valor);
}

function mensajeError(fallo: unknown) {
  if (fallo instanceof ApiError) {
    if (fallo.status === 401) return "Tu sesión expiró. Vuelve a ingresar con tu teléfono.";
    if (fallo.status === 403) return "Tu cuenta no tiene permisos de administración.";
    if (fallo.code === "sin_conexion") return fallo.message;
    return fallo.message;
  }
  return "No pudimos completar la operación. Intenta de nuevo.";
}

function ErrorBox({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </p>
  );
}

function Persona({ nombre, telefono }: { nombre: string | null; telefono: string | null }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[12.5px] font-semibold text-white">{nombre ?? "Sin nombre"}</span>
      <span className="mono mt-0.5 block truncate text-[10.5px] text-ink-400">{telefono ?? "—"}</span>
    </span>
  );
}

function Acciones({
  ocupado,
  enviando,
  onAprobar,
  onRechazar,
}: {
  ocupado: boolean;
  enviando: boolean;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  if (ocupado) {
    return (
      <div className="mt-3 grid gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
        <p className="text-[12px] leading-relaxed text-ink-200">
          Al confirmar, el saldo se acredita una sola vez y el piloto puede volver a operar. ¿Confirmas?
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onAprobar}
            disabled={enviando}
            className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-[12.5px] font-bold text-asphalt-950 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-45"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {enviando ? "Acreditando…" : "Confirmar cobro"}
          </button>
          <button
            type="button"
            onClick={onRechazar}
            disabled={enviando}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-white/10 px-3 text-[12px] font-semibold text-ink-300 transition hover:text-white disabled:opacity-45"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onAprobar}
        className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-[12.5px] font-bold text-asphalt-950 transition hover:bg-emerald-400"
      >
        <CheckCircle2 className="h-4 w-4" /> Confirmar cobro
      </button>
      <button
        type="button"
        onClick={onRechazar}
        className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-red-500/35 bg-red-500/10 px-3 text-[12.5px] font-semibold text-red-300 transition hover:bg-red-500/15"
      >
        Rechazar
      </button>
    </div>
  );
}

export function AdminCobrosPage() {
  const [sesion] = useState(() => loadSession());
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(realAuthEnabled && sesion !== null);
  const [tab, setTab] = useState<Tab>("pagos");
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [recargas, setRecargas] = useState<RecargaAdmin[]>([]);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const esAdmin = cuenta?.usuario.rol === "admin";

  useEffect(() => {
    if (!realAuthEnabled || !sesion) return;
    let activo = true;
    getCuenta()
      .then((actual) => {
        if (activo) setCuenta(actual);
      })
      .catch((fallo) => {
        if (activo) setError(mensajeError(fallo));
      })
      .finally(() => {
        if (activo) setCargandoCuenta(false);
      });
    return () => {
      activo = false;
    };
  }, [sesion]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [pendientesPagos, pendientesRecargas] = await Promise.all([
        listAdminPayments("en_revision"),
        listAdminRecharges("pendiente"),
      ]);
      setPagos(pendientesPagos);
      setRecargas(pendientesRecargas);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
      setConfirmando(null);
      setRechazando(null);
      setMotivo("");
    }
  }, []);

  useEffect(() => {
    if (!esAdmin) return;
    // Lectura externa al entrar: no es estado derivado de otra prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [esAdmin, cargar]);

  async function acreditar(id: string) {
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await confirmAdminPayment(id);
      if (!resultado.ok) {
        setError(resultado.motivo ?? "El cobro no se pudo confirmar.");
      } else {
        setAviso("Cobro confirmado y saldo acreditado.");
        await cargar();
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function rechazarPago(id: string) {
    if (motivo.trim().length < 3) {
      setError("Explica el motivo del rechazo (mínimo 3 caracteres).");
      return;
    }
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await rejectAdminPayment(id, motivo);
      if (!resultado.ok) {
        setError(resultado.motivo ?? "El cobro no se pudo rechazar.");
      } else {
        setAviso("Cobro rechazado. El piloto verá el motivo en su billetera.");
        await cargar();
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function aprobarRecarga(id: string) {
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await approveAdminRecharge(id);
      if (!resultado.ok) {
        setError(resultado.motivo ?? "La recarga no se pudo aprobar.");
      } else {
        setAviso("Recarga aprobada y saldo acreditado.");
        await cargar();
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function rechazarRecarga(id: string) {
    if (motivo.trim().length < 3) {
      setError("Explica el motivo del rechazo (mínimo 3 caracteres).");
      return;
    }
    setEnviando(true);
    setError("");
    setAviso("");
    try {
      const resultado = await rejectAdminRecharge(id, motivo);
      if (!resultado.ok) {
        setError(resultado.motivo ?? "La recarga no se pudo rechazar.");
      } else {
        setAviso("Recarga rechazada.");
        await cargar();
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  const pendientes = tab === "pagos" ? pagos.length : recargas.length;

  return (
    <>
      <PageHero
        compact
        kicker="Operaciones · Cobros"
        title={<>Cobros pendientes.</>}
        description="Cada recarga reportada espera una revisión manual. Al confirmar, el saldo se acredita una sola vez y la billetera del piloto se reactiva si alcanza el mínimo."
        actions={
          <Button variant="secondary" to="/admin">
            Cola de pilotos <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            {!sesion ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Entra con una cuenta de operaciones</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  Este panel solo está disponible para el equipo de Llégate con rol administrador.
                </p>
                <div className="mt-5">
                  <Button to="/ingresar">
                    Ingresar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : cargandoCuenta ? (
              <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Abriendo cobros…
              </div>
            ) : !esAdmin ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Esta sección es de operaciones.</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  Tu cuenta no tiene rol administrador. Si eres piloto, tu saldo y tus recargas están en tu perfil.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button to="/registro">
                    Ver mi cuenta <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" to="/">
                    Volver al inicio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid max-w-3xl gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div role="tablist" aria-label="Tipo de cobro" className="grid grid-cols-2 gap-1 rounded-xl bg-asphalt-950/60 p-1">
                    {(
                      [
                        { id: "pagos", label: `Pagos (${pagos.length})` },
                        { id: "recargas", label: `Recargas (${recargas.length})` },
                      ] as Array<{ id: Tab; label: string }>
                    ).map((item) => (
                      <button
                        key={item.id}
                        role="tab"
                        type="button"
                        aria-selected={tab === item.id}
                        onClick={() => {
                          setTab(item.id);
                          setConfirmando(null);
                          setRechazando(null);
                          setMotivo("");
                          setError("");
                        }}
                        className={`min-h-[34px] rounded-lg px-3 text-[11.5px] font-semibold transition ${
                          tab === item.id ? "bg-brand-500 text-asphalt-950" : "text-ink-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void cargar()}
                    disabled={cargando}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[11px] font-semibold text-ink-300 transition hover:border-brand-500/45 hover:text-white disabled:opacity-45"
                  >
                    <RefreshCw className={`h-3 w-3 ${cargando ? "animate-spin" : ""}`} /> Actualizar
                  </button>
                </div>

                {(error || aviso) && (
                  <div className="grid gap-2">
                    {error && <ErrorBox>{error}</ErrorBox>}
                    {aviso && (
                      <p role="status" className="flex items-start gap-2 text-[12.5px] leading-relaxed text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {aviso}
                      </p>
                    )}
                  </div>
                )}

                {cargando ? (
                  <div className="card flex items-center justify-center gap-2 p-10 text-[13px] text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando cobros…
                  </div>
                ) : pendientes === 0 ? (
                  <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                      <Clock3 className="h-5 w-5" />
                    </span>
                    <p className="text-[13px] font-semibold text-white">No hay {tab === "pagos" ? "pagos" : "recargas"} pendientes</p>
                    <p className="max-w-sm text-[11.5px] leading-relaxed text-ink-400">
                      Aquí aparecen en cuanto un piloto reporta una referencia de Pago Móvil o una recarga antigua.
                    </p>
                  </div>
                ) : tab === "pagos" ? (
                  <ul className="grid gap-3">
                    {pagos.map((pago) => (
                      <li key={pago.id} className="card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Persona nombre={pago.usuarioNombre} telefono={pago.usuarioTelefono} />
                          <span className="mono text-[18px] font-semibold text-white">{formatUSD(pago.montoUSD)}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                          <div>
                            <dt className="text-ink-500">Código</dt>
                            <dd className="mono mt-0.5 text-ink-200">{pago.codigo}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Método</dt>
                            <dd className="mt-0.5 text-ink-200">{pago.metodo === "pago_movil" ? "Pago Móvil" : "Binance Pay"}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Referencia</dt>
                            <dd className="mono mt-0.5 text-ink-200">{pago.referenciaReportada ?? "Sin reportar"}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Montos</dt>
                            <dd className="mono mt-0.5 text-ink-200">
                              {pago.montoBs === null ? formatUSD(pago.montoUSD) : `Bs. ${pago.montoBs.toFixed(2)}`}
                            </dd>
                          </div>
                        </dl>
                        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-500">
                          <Clock3 className="h-3 w-3" /> Reportado {fecha(pago.createdAt)}
                        </p>

                        {rechazando === pago.id ? (
                          <div className="mt-3 grid gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3">
                            <label className="block">
                              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">Motivo del rechazo</span>
                              <input
                                value={motivo}
                                onChange={(event) => setMotivo(event.target.value)}
                                maxLength={200}
                                className="field mt-1"
                                placeholder="La referencia no coincide con el monto"
                              />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => void rechazarPago(pago.id)}
                                disabled={enviando || motivo.trim().length < 3}
                                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 text-[12.5px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-45"
                              >
                                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar rechazo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRechazando(null);
                                  setMotivo("");
                                  setError("");
                                }}
                                disabled={enviando}
                                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-white/10 px-3 text-[12px] font-semibold text-ink-300 transition hover:text-white disabled:opacity-45"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : rechazando === null ? (
                          <Acciones
                            ocupado={confirmando === pago.id}
                            enviando={enviando}
                            onAprobar={() => {
                              setAviso("");
                              setError("");
                              if (confirmando === pago.id) {
                                void acreditar(pago.id);
                              } else {
                                setConfirmando(pago.id);
                              }
                            }}
                            onRechazar={() => {
                              setConfirmando(null);
                              setRechazando(pago.id);
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="grid gap-3">
                    {recargas.map((recarga) => (
                      <li key={recarga.id} className="card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <Persona nombre={recarga.usuarioNombre} telefono={recarga.usuarioTelefono} />
                          <span className="mono text-[18px] font-semibold text-white">{formatUSD(recarga.montoUSD)}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                          <div>
                            <dt className="text-ink-500">Método</dt>
                            <dd className="mt-0.5 text-ink-200">{recarga.metodo ?? "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Banco</dt>
                            <dd className="mt-0.5 text-ink-200">{recarga.banco ?? "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Referencia</dt>
                            <dd className="mono mt-0.5 text-ink-200">{recarga.referencia ?? "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Billetera</dt>
                            <dd className="mt-0.5 text-ink-200">{recarga.billetera ?? "—"}</dd>
                          </div>
                        </dl>
                        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-500">
                          <Clock3 className="h-3 w-3" /> Reportada {fecha(recarga.createdAt)}
                        </p>

                        {rechazando === recarga.id ? (
                          <div className="mt-3 grid gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3">
                            <label className="block">
                              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">Motivo del rechazo</span>
                              <input
                                value={motivo}
                                onChange={(event) => setMotivo(event.target.value)}
                                maxLength={200}
                                className="field mt-1"
                                placeholder="La referencia no coincide con el monto"
                              />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => void rechazarRecarga(recarga.id)}
                                disabled={enviando || motivo.trim().length < 3}
                                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 text-[12.5px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-45"
                              >
                                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar rechazo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRechazando(null);
                                  setMotivo("");
                                  setError("");
                                }}
                                disabled={enviando}
                                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-white/10 px-3 text-[12px] font-semibold text-ink-300 transition hover:text-white disabled:opacity-45"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : rechazando === null ? (
                          <Acciones
                            ocupado={confirmando === recarga.id}
                            enviando={enviando}
                            onAprobar={() => {
                              setAviso("");
                              setError("");
                              if (confirmando === recarga.id) {
                                void aprobarRecarga(recarga.id);
                              } else {
                                setConfirmando(recarga.id);
                              }
                            }}
                            onRechazar={() => {
                              setConfirmando(null);
                              setRechazando(recarga.id);
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="card flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-ink-300">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-ink-400">
                    El monto de la comisión nunca lo envía el cliente: se calcula y se reserva al aceptar el viaje. Aquí
                    solo se acredita saldo ya pagado por el piloto.
                  </p>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
