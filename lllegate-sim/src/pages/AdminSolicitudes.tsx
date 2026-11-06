import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button, PageHero } from "../components/ui";
import { Reveal } from "../components/Motion";
import {
  getCuenta,
  listSolicitudes,
  loadSession,
  marcarSolicitud,
  realAuthEnabled,
  solicitudErrorMessage,
  type Cuenta,
  type EstadoSolicitud,
  type Solicitud,
  type TipoSolicitud,
} from "../lib/api";

const TABS: Array<{ id: EstadoSolicitud; label: string }> = [
  { id: "nueva", label: "Nuevas" },
  { id: "en_curso", label: "En curso" },
  { id: "respondida", label: "Respondidas" },
  { id: "archivada", label: "Archivadas" },
];

const TIPO_LABEL: Record<TipoSolicitud, string> = {
  contacto: "Atención",
  empresa: "Empresas",
  aliado: "Alianza",
  lanzamiento: "Lanzamiento",
  conductor: "Conductor",
  cobertura: "Cobertura",
  plan: "Plan",
};

const fechaFmt = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fecha(iso: string | null) {
  if (!iso) return "—";
  const valor = new Date(iso);
  return Number.isNaN(valor.getTime()) ? "—" : fechaFmt.format(valor);
}

function Datos({ datos }: { datos: Record<string, unknown> }) {
  const entradas = Object.entries(datos).filter(([, valor]) => valor !== null && valor !== "");
  if (entradas.length === 0) return null;

  return (
    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
      {entradas.map(([clave, valor]) => (
        <div key={clave} className="flex gap-1.5">
          <dt className="text-ink-500">{clave}</dt>
          <dd className="text-ink-200">{String(valor)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminSolicitudesPage() {
  const [sesion] = useState(() => loadSession());
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(realAuthEnabled && sesion !== null);
  const [estado, setEstado] = useState<EstadoSolicitud>("nueva");
  const [tipo, setTipo] = useState<TipoSolicitud | "">("");
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
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
        if (activo) setError(solicitudErrorMessage(fallo));
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
      setSolicitudes(await listSolicitudes({ estado, tipo: tipo || undefined }));
    } catch (fallo) {
      setError(solicitudErrorMessage(fallo));
    } finally {
      setCargando(false);
      setAbierta(null);
      setNota("");
    }
  }, [estado, tipo]);

  useEffect(() => {
    if (!esAdmin) return;
    // Lectura externa al cambiar de filtro: no es estado derivado de otra prop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [esAdmin, cargar]);

  async function clasificar(solicitud: Solicitud, nuevoEstado: EstadoSolicitud) {
    setGuardando(solicitud.id);
    setError("");
    setAviso("");
    try {
      const actualizada = await marcarSolicitud(solicitud.id, nuevoEstado, nota);
      setSolicitudes((list) => list.filter((item) => item.id !== actualizada.id));
      setAviso(`Solicitud de ${solicitud.nombre ?? "un visitante"} marcada como ${nuevoEstado.replace("_", " ")}.`);
    } catch (fallo) {
      setError(solicitudErrorMessage(fallo));
    } finally {
      setGuardando(null);
      setNota("");
    }
  }

  const sinBackend = !realAuthEnabled;

  return (
    <>
      <PageHero
        compact
        kicker="Operaciones · Bandeja"
        title={<>Solicitudes de los formularios.</>}
        description="Cada formulario público (contacto, empresas, alianzas, lanzamiento, conductores, cobertura y plan) llega aquí con el contacto que dio la persona. Clasificarla deja la fecha de gestión."
        actions={
          <Button variant="secondary" to="/admin">
            Cola de pilotos <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            {sinBackend ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                  <Inbox className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Sin backend configurado</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  En la demo los formularios se guardan en el navegador de cada visitante, así que no hay bandeja que
                  abrir. Con VITE_API_URL apuntando a la API, este panel lista las solicitudes reales.
                </p>
              </div>
            ) : !sesion ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">
                  Entra con una cuenta de operaciones
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  La bandeja solo está disponible para el equipo de Llégate con rol administrador.
                </p>
                <div className="mt-5">
                  <Button to="/ingresar">
                    Ingresar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : cargandoCuenta ? (
              <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Abriendo la bandeja…
              </div>
            ) : !esAdmin ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Esta sección es de operaciones.</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  Tu cuenta ({cuenta?.usuario.nombre ?? "—"}) no tiene rol administrador.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button to="/ayuda">
                    Ir a ayuda <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" to="/">
                    Volver al inicio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto grid max-w-3xl gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div role="tablist" aria-label="Estado de la solicitud" className="flex flex-wrap gap-1 rounded-xl bg-asphalt-950/60 p-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        role="tab"
                        type="button"
                        aria-selected={estado === tab.id}
                        onClick={() => {
                          setEstado(tab.id);
                          setError("");
                          setAviso("");
                        }}
                        className={`min-h-[34px] rounded-lg px-3 text-[11.5px] font-semibold transition ${
                          estado === tab.id ? "bg-brand-500 text-asphalt-950" : "text-ink-300 hover:text-white"
                        }`}
                      >
                        {tab.label}
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

                <label className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink-400">
                  Filtrar por formulario
                  <select
                    value={tipo}
                    onChange={(event) => setTipo(event.target.value as TipoSolicitud | "")}
                    className="field min-h-[34px] max-w-[220px] appearance-none text-[12px]"
                  >
                    <option value="">Todos</option>
                    {(Object.keys(TIPO_LABEL) as TipoSolicitud[]).map((clave) => (
                      <option key={clave} value={clave}>
                        {TIPO_LABEL[clave]}
                      </option>
                    ))}
                  </select>
                </label>

                {(error || aviso) && (
                  <div className="grid gap-2">
                    {error && (
                      <p
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
                      >
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                      </p>
                    )}
                    {aviso && (
                      <p role="status" className="flex items-start gap-2 text-[12.5px] leading-relaxed text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {aviso}
                      </p>
                    )}
                  </div>
                )}

                {cargando ? (
                  <div className="card flex items-center justify-center gap-2 p-10 text-[13px] text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando solicitudes…
                  </div>
                ) : solicitudes.length === 0 ? (
                  <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                      <Clock3 className="h-5 w-5" />
                    </span>
                    <p className="text-[13px] font-semibold text-white">No hay solicitudes en este estado</p>
                    <p className="max-w-sm text-[11.5px] leading-relaxed text-ink-400">
                      Apenas alguien envía un formulario aparece aquí, con el contacto que dejó para responderle.
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-3">
                    {solicitudes.map((solicitud) => (
                      <li key={solicitud.id} className="card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-brand-300">
                              {TIPO_LABEL[solicitud.tipo] ?? solicitud.tipo}
                            </span>
                            <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-white">
                              <UserRound className="h-4 w-4 shrink-0 text-ink-400" />
                              {solicitud.nombre ?? "Sin nombre"}
                            </p>
                          </div>
                          <p className="flex items-center gap-1.5 text-[10.5px] text-ink-500">
                            <Clock3 className="h-3 w-3" /> {fecha(solicitud.createdAt)}
                          </p>
                        </div>

                        <div className="mt-2 grid gap-1 text-[12px]">
                          <a
                            className="flex items-center gap-1.5 text-brand-300 hover:text-brand-200"
                            href={solicitud.contacto.includes("@") ? `mailto:${solicitud.contacto}` : `tel:${solicitud.contacto}`}
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" /> {solicitud.contacto}
                          </a>
                          {solicitud.ciudad && (
                            <p className="flex items-center gap-1.5 text-ink-400">
                              <MapPin className="h-3.5 w-3.5 shrink-0" /> {solicitud.ciudad}
                              {solicitud.origen && <span className="mono text-[10.5px] text-ink-500">desde {solicitud.origen}</span>}
                            </p>
                          )}
                        </div>

                        {solicitud.mensaje && (
                          <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[12.5px] leading-relaxed text-ink-200">
                            {solicitud.mensaje}
                          </p>
                        )}

                        <Datos datos={solicitud.datos} />

                        {abierta === solicitud.id ? (
                          <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-asphalt-950/50 p-3">
                            <label className="block">
                              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                                Nota interna (solo la ve operaciones)
                              </span>
                              <input
                                value={nota}
                                onChange={(event) => setNota(event.target.value)}
                                maxLength={500}
                                className="field mt-1"
                                placeholder="Respondido por WhatsApp, pidió propuesta el martes"
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {(["en_curso", "respondida", "archivada"] as EstadoSolicitud[]).map((nuevoEstado) => (
                                <button
                                  key={nuevoEstado}
                                  type="button"
                                  onClick={() => void clasificar(solicitud, nuevoEstado)}
                                  disabled={guardando === solicitud.id}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[12px] font-semibold text-ink-200 transition hover:border-brand-500/45 hover:text-white disabled:opacity-45"
                                >
                                  {guardando === solicitud.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  {nuevoEstado.replace("_", " ")}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setAbierta(null);
                                  setNota("");
                                }}
                                disabled={guardando === solicitud.id}
                                className="inline-flex min-h-[36px] items-center rounded-lg px-3 text-[12px] font-semibold text-ink-400 transition hover:text-white disabled:opacity-45"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setAviso("");
                                setError("");
                                setAbierta(solicitud.id);
                                setNota(solicitud.notaAdmin ?? "");
                              }}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[12.5px] font-bold text-asphalt-950 transition hover:bg-brand-400"
                            >
                              <Inbox className="h-4 w-4" /> Gestionar
                            </button>
                            {solicitud.notaAdmin && (
                              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
                                Nota: {solicitud.notaAdmin} · gestionada {fecha(solicitud.atendidaEn)}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="card flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-ink-300">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-ink-400">
                    El formulario público está limitado por conexión y por contacto, así que un visitante no puede
                    llenar la bandeja de repeticiones. Nadie más que operaciones ve estos datos: la tabla tiene RLS y
                    no se expone al rol anónimo.
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
