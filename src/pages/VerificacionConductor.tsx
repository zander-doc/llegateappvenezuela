import { useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  IdCard,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ScanText,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Upload,
} from "lucide-react";
import { Badge, Button, DemoNote, PageHero } from "../components/ui";
import { Reveal } from "../components/Motion";
import {
  ApiError,
  getCuenta,
  getDriverVerification,
  loadSession,
  realAuthEnabled,
  saveDriverDetails,
  submitDriverVerification,
  uploadDriverDocument,
  verificationErrorMessage,
  type Cuenta,
  type DocumentoConductor,
  type MotivoRiesgo,
  type ResultadoEnvioVerificacion,
  type TipoDocumentoConductor,
  type VerificacionConductor,
} from "../lib/api";

const DOCUMENTOS: Array<{
  tipo: TipoDocumentoConductor;
  titulo: string;
  ayuda: string;
  icon: typeof IdCard;
}> = [
  { tipo: "cedula_frente", titulo: "Cédula · frente", ayuda: "Foto completa, sin reflejos", icon: IdCard },
  { tipo: "cedula_reverso", titulo: "Cédula · reverso", ayuda: "Se vea el número y la firma", icon: Fingerprint },
  { tipo: "licencia", titulo: "Licencia de conducir", ayuda: "Vigente y legible", icon: FileText },
  { tipo: "certificado_medico", titulo: "Certificado médico", ayuda: "Emitido en los últimos 12 meses", icon: Stethoscope },
];

const ESTADO_COPY: Record<
  VerificacionConductor["verificacion"],
  { titulo: string; detalle: string; tone: "neutral" | "success" | "yellow" | "danger" }
> = {
  pendiente: {
    titulo: "En revisión",
    detalle: "Un operador revisa tus documentos. Suele tardar menos de 15 minutos en horario de oficina.",
    tone: "yellow",
  },
  aprobado: {
    titulo: "Aprobado",
    detalle: "Ya puedes recibir viajes. Tu comisión del 10% se descuenta del saldo prepago.",
    tone: "success",
  },
  rechazado: {
    titulo: "Rechazado",
    detalle: "Corrige lo indicado, reemplaza los documentos necesarios y vuelve a enviar.",
    tone: "danger",
  },
};

const NIVEL_RIESGO: Record<ResultadoEnvioVerificacion["riesgoNivel"], { label: string; tone: "success" | "yellow" | "danger" }> = {
  bajo: { label: "Riesgo bajo", tone: "success" },
  medio: { label: "Riesgo medio", tone: "yellow" },
  alto: { label: "Riesgo alto", tone: "danger" },
};

const fechaFmt = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function fecha(iso: string | null) {
  if (!iso) return "";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? "" : fechaFmt.format(value);
}

function ErrorBox({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-red-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </p>
  );
}

function OcrBadge({ documento }: { documento: DocumentoConductor }) {
  if (documento.ocrEstado === "listo") {
    const confianza = documento.ocrConfianza ?? 0.85;
    const baja = confianza < 0.6;
    return (
      <Badge tone={baja ? "yellow" : "success"} className="!px-2 !py-0.5 !text-[10px]">
        <ScanText className="h-3 w-3" /> Lectura {Math.round(confianza * 100)}%
      </Badge>
    );
  }
  if (documento.ocrEstado === "fallido") {
    return (
      <Badge tone="yellow" className="!px-2 !py-0.5 !text-[10px]">
        <ScanText className="h-3 w-3" /> Sin lectura
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className="!px-2 !py-0.5 !text-[10px]">
      <ScanText className="h-3 w-3" /> Revisión manual
    </Badge>
  );
}

function MotivosList({ motivos }: { motivos: MotivoRiesgo[] }) {
  const utiles = motivos.filter((motivo) => motivo.peso > 0);
  if (utiles.length === 0) {
    return <p className="text-[12px] text-ink-400">Sin señales de riesgo detectadas.</p>;
  }
  return (
    <ul className="grid gap-2">
      {utiles.map((motivo) => (
        <li key={motivo.codigo} className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-racing-400" />
          <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink-200">
            {motivo.detalle ?? motivo.codigo}
          </span>
          <span className="mono shrink-0 text-[10.5px] font-semibold text-racing-400">+{motivo.peso}</span>
        </li>
      ))}
    </ul>
  );
}

function RiskPanel({
  puntaje,
  nivel,
  motivos,
}: {
  puntaje: number;
  nivel: ResultadoEnvioVerificacion["riesgoNivel"];
  motivos: MotivoRiesgo[];
}) {
  const meta = NIVEL_RIESGO[nivel];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Señales de riesgo</p>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <p className="mono text-[30px] font-semibold leading-none text-white">{puntaje}</p>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${nivel === "alto" ? "bg-red-400" : nivel === "medio" ? "bg-racing-500" : "bg-emerald-400"}`}
            style={{ width: `${Math.min(100, Math.max(4, puntaje))}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-500">
        Es una señal para el revisor, no una aprobación automática. La decisión final es humana.
      </p>
      <div className="mt-3">
        <MotivosList motivos={motivos} />
      </div>
    </div>
  );
}

function SinCuenta({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/15 text-brand-400">
        <LockKeyhole className="h-6 w-6" />
      </span>
      <h2 className="heading mt-4 text-[22px] font-extrabold text-white">{titulo}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">{detalle}</p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Button to="/ingresar">
          Ingresar con mi teléfono <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" to="/registro">
          Crear cuenta
        </Button>
      </div>
    </div>
  );
}

export function VerificacionConductorPage() {
  const [sesion] = useState(() => loadSession());
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [conductor, setConductor] = useState<VerificacionConductor | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoConductor[]>([]);
  const [sinRegistro, setSinRegistro] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvioVerificacion | null>(null);
  const [cargando, setCargando] = useState(realAuthEnabled && sesion !== null);
  const [subiendo, setSubiendo] = useState<TipoDocumentoConductor | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!realAuthEnabled || !sesion) return;
    let activo = true;

    (async () => {
      try {
        const actual = await getCuenta();
        if (!activo) return;
        setCuenta(actual);

        try {
          const mi = await getDriverVerification();
          if (!activo) return;
          setConductor(mi.conductor);
          setDocumentos(mi.documentos);
          if (mi.conductor.riesgoMotivos.length > 0) {
            const nivel: ResultadoEnvioVerificacion["riesgoNivel"] =
              mi.conductor.riesgoPuntaje >= 50 ? "alto" : mi.conductor.riesgoPuntaje >= 20 ? "medio" : "bajo";
            setResultado({
              ok: true,
              verificacion: mi.conductor.verificacion,
              riesgoPuntaje: mi.conductor.riesgoPuntaje,
              riesgoNivel: nivel,
              motivos: mi.conductor.riesgoMotivos,
              documentos: mi.documentos.length,
              enviadoEn: mi.conductor.enviadoEn,
            });
          }
        } catch (fallo) {
          if (fallo instanceof ApiError && fallo.code === "conductor_no_registrado") {
            setSinRegistro(true);
          } else {
            throw fallo;
          }
        }
      } catch (fallo) {
        if (!activo) return;
        setError(
          fallo instanceof ApiError && fallo.status === 401
            ? "Tu sesión expiró. Vuelve a ingresar con tu teléfono."
            : verificationErrorMessage(fallo),
        );
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [sesion]);

  async function subir(tipo: TipoDocumentoConductor, file: File | undefined) {
    if (!file) return;
    setError("");
    setAviso("");
    setSubiendo(tipo);
    try {
      const documento = await uploadDriverDocument({ tipo, file });
      setDocumentos((previos) => [...previos.filter((item) => item.tipo !== tipo), documento]);
      setAviso("Documento cargado. Ya quedó asociado a tu cuenta.");
    } catch (fallo) {
      setError(verificationErrorMessage(fallo));
    } finally {
      setSubiendo(null);
    }
  }

  async function enviar() {
    setError("");
    setAviso("");
    setEnviando(true);
    try {
      const envio = await submitDriverVerification();
      setResultado(envio);
      setConductor((previo) =>
        previo
          ? {
              ...previo,
              verificacion: envio.verificacion,
              riesgoPuntaje: envio.riesgoPuntaje,
              riesgoMotivos: envio.motivos,
              enviadoEn: envio.enviadoEn,
              intentosVerificacion: previo.intentosVerificacion + 1,
              motivoRechazo: null,
            }
          : previo,
      );
      setAviso("Verificación enviada. Un operador revisa tus documentos y te avisa.");
    } catch (fallo) {
      setError(verificationErrorMessage(fallo));
    } finally {
      setEnviando(false);
    }
  }

  if (!realAuthEnabled) {
    return (
      <>
        <PageHero
          compact
          kicker="Pilotos · Verificación"
          title={<>Sube tus documentos.</>}
          description="La verificación real con OCR y revisión humana solo se activa cuando la web está conectada al backend de Llégate."
          crumbs={[{ label: "Conductores", to: "/conductores" }, { label: "Verificación", to: "/conductores/verificacion" }]}
        />
        <section className="asphalt">
          <div className="wrap py-10 lg:py-14">
            <div className="card mx-auto max-w-2xl p-6 sm:p-8">
              <Badge tone="yellow">Modo demostración</Badge>
              <h2 className="heading mt-4 text-[24px] font-extrabold text-white">Esta vista necesita el backend real.</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
                En la demo no se suben documentos ni se envían cédulas: todo el flujo de verificación es simulado. El
                formulario de requisitos te muestra qué pide Llégate en producción.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button to="/conductores/registro">
                  Ver requisitos <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="secondary" to="/conductores/planes">
                  Prepago y comisiones
                </Button>
              </div>
              <div className="mt-5">
                <DemoNote>
                  sin backend configurado no se lee, guarda ni transmite ningún archivo personal.
                </DemoNote>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        compact
        kicker="Pilotos · Verificación"
        title={<>Sube tus documentos.</>}
        description="Cédula por ambos lados, licencia y certificado médico. Comparamos la lectura automática con tus datos y un operador da la decisión final."
        crumbs={[{ label: "Conductores", to: "/conductores" }, { label: "Verificación", to: "/conductores/verificacion" }]}
        actions={
          <Button variant="secondary" to="/conductores/planes">
            Prepago y comisiones <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            <Link
              to="/conductores"
              className="mb-5 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-ink-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a conductores
            </Link>
          </Reveal>

          {!sesion ? (
            <SinCuenta
              titulo="Entra para verificar tu cuenta"
              detalle="Usa el mismo teléfono con el que te registraste. La web y la app comparten el mismo perfil de piloto."
            />
          ) : cargando ? (
            <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando tu verificación…
            </div>
          ) : !cuenta ? (
            <div className="card mx-auto max-w-xl p-6">
              {error ? <ErrorBox>{error}</ErrorBox> : <p className="text-[13px] text-ink-300">No pudimos abrir tu cuenta.</p>}
              <div className="mt-4">
                <Button to="/ingresar" variant="secondary">
                  Volver a ingresar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
              <div className="grid min-w-0 gap-5">
                <div className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Piloto</p>
                      <h2 className="heading mt-1 truncate text-[22px] font-extrabold text-white">{cuenta.usuario.nombre}</h2>
                      <p className="mt-1 text-[12px] text-ink-400">
                        {conductor
                          ? `${conductor.tipoVehiculo === "moto" ? "Moto" : "Carro"} · placa ${conductor.placa}`
                          : "Completa tus datos de vehículo para empezar"}
                      </p>
                    </div>
                    {conductor && (
                      <Badge tone={ESTADO_COPY[conductor.verificacion].tone}>
                        {ESTADO_COPY[conductor.verificacion].titulo}
                      </Badge>
                    )}
                  </div>

                  {conductor && (
                    <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
                      <p className="text-[12.5px] font-semibold text-white">{ESTADO_COPY[conductor.verificacion].titulo}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{ESTADO_COPY[conductor.verificacion].detalle}</p>
                      {conductor.verificacion === "rechazado" && conductor.motivoRechazo && (
                        <p className="mt-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-300">
                          {conductor.motivoRechazo}
                        </p>
                      )}
                      {conductor.enviadoEn && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
                          <Clock3 className="h-3.5 w-3.5" /> Enviado el {fecha(conductor.enviadoEn)}
                          {conductor.intentosVerificacion > 1 ? ` · ${conductor.intentosVerificacion} intentos` : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {(error || aviso) && (
                    <div className="mt-4 grid gap-2">
                      {error && <ErrorBox>{error}</ErrorBox>}
                      {aviso && (
                        <p role="status" className="flex items-start gap-2 text-[12.5px] leading-relaxed text-emerald-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {aviso}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {sinRegistro ? (
                  <DatosVehiculo
                    onGuardado={(detalle) => {
                      setConductor(detalle);
                      setSinRegistro(false);
                    }}
                    onError={(mensaje) => setError(mensaje)}
                  />
                ) : (
                  <div className="card p-5 sm:p-6">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h3 className="heading text-[17px] font-bold text-white">Documentos</h3>
                        <p className="mt-1 text-[12px] text-ink-400">
                          JPG, PNG, WebP o PDF · máximo 5 MB por archivo.
                        </p>
                      </div>
                      <span className="mono text-[11px] text-ink-500">{documentos.length}/4 cargados</span>
                    </div>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {DOCUMENTOS.map(({ tipo, titulo, ayuda, icon: Icon }) => {
                        const documento = documentos.find((item) => item.tipo === tipo);
                        const ocupado = subiendo === tipo;
                        return (
                          <div
                            key={tipo}
                            className={`rounded-xl border p-3 ${
                              documento ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/10 bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  documento ? "bg-emerald-400/12 text-emerald-300" : "bg-white/[0.04] text-ink-400"
                                }`}
                              >
                                <Icon className="h-4.5 w-4.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-semibold text-white">{titulo}</p>
                                <p className="mt-0.5 text-[10.5px] text-ink-500">{ayuda}</p>
                                {documento ? (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <OcrBadge documento={documento} />
                                    <span className="text-[10px] text-ink-500">{fecha(documento.updatedAt)}</span>
                                  </div>
                                ) : (
                                  <p className="mt-1.5 text-[10.5px] text-racing-400">Pendiente</p>
                                )}
                              </div>
                            </div>

                            <label
                              className={`mt-2.5 flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-[11.5px] font-semibold transition ${
                                ocupado
                                  ? "border-white/10 text-ink-500"
                                  : "border-white/12 text-ink-200 hover:border-brand-500/45 hover:text-white"
                              }`}
                            >
                              {ocupado ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo…
                                </>
                              ) : (
                                <>
                                  {documento ? <RefreshCw className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                                  {documento ? "Reemplazar" : "Subir archivo"}
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="sr-only"
                                disabled={ocupado || conductor?.verificacion === "aprobado"}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  event.target.value = "";
                                  void subir(tipo, file);
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    {conductor?.verificacion === "aprobado" ? (
                      <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-300">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        Tu cuenta ya está aprobada. Si necesitas cambiar un documento, escríbenos por soporte.
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] leading-relaxed text-ink-500">
                          {documentos.length < 4
                            ? `Faltan ${4 - documentos.length} documento${4 - documentos.length === 1 ? "" : "s"}.`
                            : "Todo listo para enviar a revisión."}
                        </p>
                        <button
                          type="button"
                          onClick={() => void enviar()}
                          disabled={enviando || documentos.length < 4}
                          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-[13.5px] font-bold text-asphalt-950 transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-45"
                        >
                          {enviando ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          {enviando
                            ? "Enviando…"
                            : conductor?.verificacion === "pendiente"
                              ? "Reenviar a revisión"
                              : "Enviar a revisión"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <aside className="grid gap-4 lg:sticky lg:top-[116px]">
                {resultado && (
                  <RiskPanel puntaje={resultado.riesgoPuntaje} nivel={resultado.riesgoNivel} motivos={resultado.motivos} />
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Cómo revisamos</p>
                  <ol className="mt-3 grid gap-3">
                    {[
                      {
                        n: "01",
                        title: "Documento y hash",
                        text: "Validamos el archivo real y su huella para detectar documentos reutilizados.",
                      },
                      {
                        n: "02",
                        title: "Lectura automática",
                        text: "Si el OCR está activo, comparamos cédula y nombre contra lo declarado.",
                      },
                      {
                        n: "03",
                        title: "Decisión humana",
                        text: "Un operador aprueba o rechaza con motivo. El puntaje nunca decide solo.",
                      },
                    ].map((paso) => (
                      <li key={paso.n} className="flex items-start gap-2.5">
                        <span className="mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-brand-500/25 bg-brand-500/10 text-[10px] font-bold text-brand-400">
                          {paso.n}
                        </span>
                        <span>
                          <span className="block text-[12.5px] font-semibold text-white">{paso.title}</span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-400">{paso.text}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-racing-500/25 bg-racing-500/[0.06] p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-racing-400">
                    <LockKeyhole className="h-3.5 w-3.5" /> Privacidad
                  </p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-300">
                    Los archivos van al almacenamiento privado de Llégate y solo los ven tú y el equipo de verificación.
                    No se guardan en este navegador.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function DatosVehiculo({
  onGuardado,
  onError,
}: {
  onGuardado: (detalle: VerificacionConductor) => void;
  onError: (mensaje: string) => void;
}) {
  const [cedula, setCedula] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState<"moto" | "carro">("moto");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cedulaId = useId();
  const placaId = useId();
  const tipoId = useId();
  const marcaId = useId();
  const modeloId = useId();
  const anioId = useId();

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!/^[VE][0-9]{6,9}$/i.test(cedula.trim())) {
      setError("Escribe la cédula como V-12345678.");
      return;
    }
    if (!/^[A-Z0-9-]{5,10}$/i.test(placa.trim())) {
      setError("Escribe una placa válida, por ejemplo AB123CD.");
      return;
    }

    setGuardando(true);
    try {
      const detalle = await saveDriverDetails({
        cedula,
        placa,
        tipoVehiculo,
        marca,
        modelo,
        anio: anio ? Number(anio) : undefined,
      });
      onGuardado(detalle);
    } catch (fallo) {
      const mensaje = verificationErrorMessage(fallo);
      setError(mensaje);
      onError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="card p-5 sm:p-6" onSubmit={guardar} noValidate>
      <h3 className="heading text-[17px] font-bold text-white">Datos del vehículo</h3>
      <p className="mt-1 text-[12px] text-ink-400">
        Se verifican contra la cédula y la licencia. No se pueden cambiar después de la aprobación.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={cedulaId} className="label">
            Cédula
          </label>
          <input
            id={cedulaId}
            className="field mono"
            value={cedula}
            onChange={(event) => setCedula(event.target.value.toUpperCase())}
            placeholder="V-12345678"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={tipoId} className="label">
            Vehículo
          </label>
          <select
            id={tipoId}
            className="field"
            value={tipoVehiculo}
            onChange={(event) => setTipoVehiculo(event.target.value as "moto" | "carro")}
          >
            <option value="moto">Moto</option>
            <option value="carro">Carro</option>
          </select>
        </div>
        <div>
          <label htmlFor={placaId} className="label">
            Placa
          </label>
          <input
            id={placaId}
            className="field mono"
            value={placa}
            onChange={(event) => setPlaca(event.target.value.toUpperCase())}
            placeholder="AB123CD"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={anioId} className="label">
            Año (opcional)
          </label>
          <input
            id={anioId}
            className="field mono"
            inputMode="numeric"
            value={anio}
            onChange={(event) => setAnio(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="2022"
          />
        </div>
        <div>
          <label htmlFor={marcaId} className="label">
            Marca (opcional)
          </label>
          <input
            id={marcaId}
            className="field"
            value={marca}
            onChange={(event) => setMarca(event.target.value)}
            placeholder="Bera"
          />
        </div>
        <div>
          <label htmlFor={modeloId} className="label">
            Modelo (opcional)
          </label>
          <input
            id={modeloId}
            className="field"
            value={modelo}
            onChange={(event) => setModelo(event.target.value)}
            placeholder="Socialista"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-[13.5px] font-bold text-asphalt-950 transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-45"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {guardando ? "Guardando…" : "Guardar y subir documentos"}
      </button>
    </form>
  );
}
