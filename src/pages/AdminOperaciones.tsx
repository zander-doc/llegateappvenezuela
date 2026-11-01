import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { Badge, Button, DemoNote, PageHero } from "../components/ui";
import { Reveal } from "../components/Motion";
import {
  ApiError,
  getCuenta,
  getDriverReview,
  listDriversForReview,
  loadSession,
  realAuthEnabled,
  verificationErrorMessage,
  verifyDriver,
  type ConductorEnCola,
  type Cuenta,
  type DocumentoRevision,
  type EstadoVerificacion,
  type EventoSeguridad,
  type MotivoRiesgo,
  type RevisionConductor,
} from "../lib/api";

const TABS: Array<{ id: EstadoVerificacion; label: string }> = [
  { id: "pendiente", label: "Por revisar" },
  { id: "aprobado", label: "Aprobados" },
  { id: "rechazado", label: "Rechazados" },
];

const TIPO_DOCUMENTO: Record<string, string> = {
  cedula_frente: "Cédula · frente",
  cedula_reverso: "Cédula · reverso",
  licencia: "Licencia",
  certificado_medico: "Certificado médico",
};

const ESTADO: Record<EstadoVerificacion, { label: string; tone: "yellow" | "success" | "danger" }> = {
  pendiente: { label: "Por revisar", tone: "yellow" },
  aprobado: { label: "Aprobado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
};

const SEVERIDAD: Record<EventoSeguridad["severidad"], "neutral" | "yellow" | "danger"> = {
  info: "neutral",
  alerta: "yellow",
  critico: "danger",
};

const fechaFmt = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function fecha(iso: string | null) {
  if (!iso) return "—";
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? "—" : fechaFmt.format(value);
}

function nivelRiesgo(puntaje: number) {
  if (puntaje >= 50) return { label: "Riesgo alto", tone: "danger" as const };
  if (puntaje >= 20) return { label: "Riesgo medio", tone: "yellow" as const };
  return { label: "Riesgo bajo", tone: "success" as const };
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

function sinAcceso(titulo: string, detalle: string) {
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
        <Button variant="secondary" to="/conductores/verificacion">
          Soy piloto
        </Button>
      </div>
    </div>
  );
}

function RiskBadge({ puntaje }: { puntaje: number }) {
  const nivel = nivelRiesgo(puntaje);
  return (
    <Badge tone={nivel.tone} className="!px-2.5 !py-1 !text-[10.5px]">
      <ShieldAlert className="h-3 w-3" /> {nivel.label} · {puntaje}
    </Badge>
  );
}

function Motivos({ motivos }: { motivos: MotivoRiesgo[] }) {
  const utiles = motivos.filter((motivo) => motivo.peso > 0);
  if (utiles.length === 0) return <p className="text-[12px] text-ink-400">Sin señales de riesgo.</p>;
  return (
    <ul className="grid gap-1.5">
      {utiles.map((motivo) => (
        <li
          key={`${motivo.codigo}-${motivo.peso}`}
          className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5"
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-racing-400" />
          <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink-200">
            {motivo.detalle ?? motivo.codigo}
          </span>
          <span className="mono shrink-0 text-[10px] font-semibold text-racing-400">+{motivo.peso}</span>
        </li>
      ))}
    </ul>
  );
}

function DocumentoCard({ documento }: { documento: DocumentoRevision }) {
  const kb = Math.max(1, Math.round(documento.bytes / 1024));
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-white">{TIPO_DOCUMENTO[documento.tipo] ?? documento.tipo}</p>
        <span className="text-[10px] text-ink-500">{fecha(documento.updatedAt)}</span>
      </div>
      <p className="mt-0.5 text-[10.5px] text-ink-500">
        {documento.mime} · {kb} KB
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {documento.ocrEstado === "listo" ? (
          <Badge tone="success" className="!px-2 !py-0.5 !text-[9.5px]">
            OCR {Math.round((documento.ocrConfianza ?? 0) * 100)}%
          </Badge>
        ) : documento.ocrEstado === "fallido" ? (
          <Badge tone="yellow" className="!px-2 !py-0.5 !text-[9.5px]">
            OCR falló
          </Badge>
        ) : (
          <Badge tone="neutral" className="!px-2 !py-0.5 !text-[9.5px]">
            Sin OCR
          </Badge>
        )}
      </div>
      {documento.ocrTexto && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10.5px] font-semibold text-ink-400 transition hover:text-ink-200">
            Ver texto leído
          </summary>
          <pre className="mt-1.5 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-asphalt-950 p-2 text-[10px] leading-relaxed text-ink-300">
            {documento.ocrTexto}
          </pre>
        </details>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {documento.url ? (
          <a
            href={documento.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[30px] items-center gap-1 text-[11px] font-semibold text-brand-400 transition hover:text-brand-300"
          >
            Abrir documento <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-[10.5px] text-ink-500">Vista previa no disponible</span>
        )}
        <span className="mono truncate text-[9px] text-ink-600" title={documento.hashSha256}>
          {documento.hashSha256.slice(0, 10)}
        </span>
      </div>
    </div>
  );
}

function EventoTimeline({ eventos }: { eventos: EventoSeguridad[] }) {
  if (eventos.length === 0) {
    return <p className="text-[12px] text-ink-400">Sin eventos de seguridad registrados.</p>;
  }
  return (
    <ol className="grid gap-2.5">
      {eventos.map((evento) => (
        <li key={evento.id} className="flex items-start gap-2.5">
          <span
            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
              evento.severidad === "critico"
                ? "bg-red-400"
                : evento.severidad === "alerta"
                  ? "bg-racing-500"
                  : "bg-emerald-400"
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11.5px] font-semibold text-white">{evento.tipo.replaceAll("_", " ")}</p>
              <Badge tone={SEVERIDAD[evento.severidad]} className="!px-1.5 !py-0 !text-[9px]">
                {evento.severidad}
              </Badge>
            </div>
            <p className="mono mt-0.5 text-[10px] text-ink-500">{fecha(evento.createdAt)}</p>
            <p className="mt-0.5 break-words text-[10.5px] leading-snug text-ink-400">
              {Object.entries(evento.detalle)
                .map(([clave, valor]) => `${clave}: ${typeof valor === "string" ? valor : JSON.stringify(valor)}`)
                .join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DetalleRevision({
  revision,
  accion,
  motivo,
  ocupado,
  onAccion,
  onMotivo,
  onConfirmar,
  onCancelar,
  onRecargar,
}: {
  revision: RevisionConductor;
  accion: "aprobar" | "rechazar" | null;
  motivo: string;
  ocupado: boolean;
  onAccion: (accion: "aprobar" | "rechazar") => void;
  onMotivo: (motivo: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  onRecargar: () => void;
}) {
  const { conductor, usuario, documentos, eventos } = revision;
  const nivel = nivelRiesgo(conductor.riesgoPuntaje);

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Piloto</p>
            <h2 className="heading mt-1 truncate text-[22px] font-extrabold text-white">
              {usuario?.nombre ?? "Sin nombre"}
            </h2>
            <p className="mt-1 text-[12px] text-ink-400">
              {usuario?.telefono ?? "Sin teléfono"} · registrado {fecha(usuario?.createdAt ?? null)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ESTADO[conductor.verificacion].tone}>{ESTADO[conductor.verificacion].label}</Badge>
            <RiskBadge puntaje={conductor.riesgoPuntaje} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Cédula", value: conductor.cedula },
            { label: "Vehículo", value: conductor.tipoVehiculo === "moto" ? "Moto" : "Carro" },
            { label: "Placa", value: conductor.placa },
            { label: "Año", value: conductor.anio ? String(conductor.anio) : "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
              <dt className="text-[9.5px] uppercase tracking-wider text-ink-500">{item.label}</dt>
              <dd className="mono mt-0.5 truncate text-[12px] font-semibold text-ink-100">{item.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 text-[11.5px] text-ink-500">
          {[conductor.marca, conductor.modelo].filter(Boolean).join(" ") || "Sin marca ni modelo"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" /> Enviado {fecha(conductor.enviadoEn)}
          </span>
          <span>{conductor.intentosVerificacion} envío(s)</span>
          <span>{documentos.length}/4 documentos</span>
        </div>

        {conductor.motivoRechazo && (
          <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-red-300">
            Rechazo anterior: {conductor.motivoRechazo}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="heading text-[16px] font-bold text-white">Documentos</h3>
              <button
                type="button"
                onClick={onRecargar}
                className="inline-flex min-h-[30px] items-center gap-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-white"
              >
                <RefreshCw className="h-3 w-3" /> Refrescar enlaces
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {documentos.length === 0 ? (
                <p className="text-[12px] text-ink-400">Este piloto no ha subido documentos.</p>
              ) : (
                documentos.map((documento) => <DocumentoCard key={documento.tipo} documento={documento} />)
              )}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-ink-500">
              <FileSearch className="h-3.5 w-3.5" /> Los enlaces firman el acceso por 15 minutos.
            </p>
          </div>

          <div className="card p-5">
            <h3 className="heading text-[16px] font-bold text-white">Historial de seguridad</h3>
            <div className="mt-3">
              <EventoTimeline eventos={eventos} />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">Señales de riesgo</p>
              <Badge tone={nivel.tone}>{nivel.label}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <p className="mono text-[30px] font-semibold leading-none text-white">{conductor.riesgoPuntaje}</p>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${
                    nivel.tone === "danger" ? "bg-red-400" : nivel.tone === "yellow" ? "bg-racing-500" : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, conductor.riesgoPuntaje))}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-[10.5px] leading-snug text-ink-500">
              Señal para el revisor, no un veredicto. La decisión es humana.
            </p>
            <div className="mt-3">
              <Motivos motivos={conductor.riesgoMotivos} />
            </div>
          </div>

          <div className="card p-4">
            <h3 className="heading text-[15px] font-bold text-white">Decisión</h3>
            {conductor.verificacion === "aprobado" ? (
              <p className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-ink-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                Cuenta aprobada el {fecha(conductor.verificadoEn)}. Puede recibir viajes.
              </p>
            ) : accion === null ? (
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => onAccion("aprobar")}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-asphalt-950 transition hover:bg-emerald-400"
                >
                  <UserRoundCheck className="h-4 w-4" /> Aprobar piloto
                </button>
                <button
                  type="button"
                  onClick={() => onAccion("rechazar")}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-4 text-[13px] font-bold text-red-300 transition hover:bg-red-500/15"
                >
                  <UserRoundX className="h-4 w-4" /> Rechazar con motivo
                </button>
              </div>
            ) : accion === "aprobar" ? (
              <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
                <p className="text-[12px] leading-relaxed text-ink-200">
                  Al aprobar, el piloto podrá recibir viajes y ver su saldo prepago. ¿Confirmas la revisión?
                </p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={ocupado}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-[13px] font-bold text-asphalt-950 transition hover:bg-emerald-400 disabled:pointer-events-none disabled:opacity-45"
                  >
                    {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {ocupado ? "Aprobando…" : "Confirmar aprobación"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelar}
                    disabled={ocupado}
                    className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-white/10 px-4 text-[12px] font-semibold text-ink-300 transition hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3">
                <label htmlFor="motivo-rechazo" className="label">
                  Motivo del rechazo
                </label>
                <textarea
                  id="motivo-rechazo"
                  value={motivo}
                  onChange={(event) => onMotivo(event.target.value)}
                  maxLength={300}
                  rows={3}
                  className="field mt-1 resize-none text-[12.5px]"
                  placeholder="Ej.: la licencia no coincide con la cédula."
                />
                <p className="mt-1 text-[10.5px] text-ink-500">{motivo.trim().length}/300 · mínimo 3 caracteres</p>
                <div className="mt-2 grid gap-2">
                  <button
                    type="button"
                    onClick={onConfirmar}
                    disabled={ocupado || motivo.trim().length < 3}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 px-4 text-[13px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-45"
                  >
                    {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundX className="h-4 w-4" />}
                    {ocupado ? "Rechazando…" : "Confirmar rechazo"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelar}
                    disabled={ocupado}
                    className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-white/10 px-4 text-[12px] font-semibold text-ink-300 transition hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminOperacionesPage() {
  const [sesion] = useState(() => loadSession());
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(realAuthEnabled && sesion !== null);
  const [tab, setTab] = useState<EstadoVerificacion>("pendiente");
  const [cola, setCola] = useState<ConductorEnCola[]>([]);
  const [cargandoCola, setCargandoCola] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [revision, setRevision] = useState<RevisionConductor | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [accion, setAccion] = useState<"aprobar" | "rechazar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
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
        if (!activo) return;
        setError(
          fallo instanceof ApiError && fallo.status === 401
            ? "Tu sesión expiró. Vuelve a ingresar con tu teléfono."
            : verificationErrorMessage(fallo),
        );
      })
      .finally(() => {
        if (activo) setCargandoCuenta(false);
      });
    return () => {
      activo = false;
    };
  }, [sesion]);

  const cargarCola = useCallback(
    async (cual: EstadoVerificacion) => {
      setCargandoCola(true);
      setError("");
      try {
        const lista = await listDriversForReview(cual);
        setCola(lista);
        setSeleccion((actual) =>
          actual && lista.some((item) => item.usuarioId === actual) ? actual : (lista[0]?.usuarioId ?? null),
        );
        setAccion(null);
        setMotivo("");
        if (lista.length === 0) setRevision(null);
      } catch (fallo) {
        setError(verificationErrorMessage(fallo));
      } finally {
        setCargandoCola(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!esAdmin) return;
    // La cola vive en el backend: el efecto solo dispara la lectura al entrar o cambiar de pestaña.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarCola(tab);
  }, [esAdmin, tab, cargarCola]);

  const cargarDetalle = useCallback(async (usuarioId: string) => {
    setCargandoDetalle(true);
    setError("");
    try {
      setRevision(await getDriverReview(usuarioId));
    } catch (fallo) {
      setError(verificationErrorMessage(fallo));
      setRevision(null);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    if (!esAdmin || !seleccion) return;
    // Igual que la cola: cargar el expediente es una lectura externa, no estado derivado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarDetalle(seleccion);
  }, [esAdmin, seleccion, cargarDetalle]);

  async function confirmar() {
    if (!revision || !accion) return;
    if (accion === "rechazar" && motivo.trim().length < 3) {
      setError("Explica el motivo del rechazo (mínimo 3 caracteres).");
      return;
    }

    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const resultado = await verifyDriver(revision.conductor.usuarioId, {
        aprobado: accion === "aprobar",
        motivo: accion === "rechazar" ? motivo.trim() : undefined,
      });
      const nombre = revision.usuario?.nombre ?? "El piloto";
      setAviso(
        resultado.verificacion === "aprobado"
          ? `${nombre} quedó aprobado y ya puede recibir viajes.`
          : `${nombre} quedó rechazado. Se le mostró el motivo en su panel.`,
      );
      setAccion(null);
      setMotivo("");
      setRevision(null);
      setSeleccion(null);
      await cargarCola(tab);
    } catch (fallo) {
      setError(verificationErrorMessage(fallo));
    } finally {
      setOcupado(false);
    }
  }

  if (!realAuthEnabled) {
    return (
      <>
        <PageHero
          compact
          kicker="Operaciones · Verificación"
          title={<>Revisa pilotos.</>}
          description="La cola de verificación con documentos firmados, OCR y auditoría solo se activa con el backend de Llégate configurado."
        />
        <section className="asphalt">
          <div className="wrap py-10 lg:py-14">
            <div className="card mx-auto max-w-2xl p-6 sm:p-8">
              <Badge tone="yellow">Modo demostración</Badge>
              <h2 className="heading mt-4 text-[24px] font-extrabold text-white">Este panel necesita el backend real.</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
                En la demo no hay documentos ni cuentas que revisar. En producción, aquí ves la cola de pilotos con su
                puntaje de riesgo, los archivos firmados y el historial de seguridad.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button to="/conductores/verificacion">
                  Ver el flujo del piloto <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="secondary" to="/seguridad">
                  Cómo verificamos
                </Button>
              </div>
              <div className="mt-5">
                <DemoNote>sin backend configurado no se cargan documentos ni datos de pilotos.</DemoNote>
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
        kicker="Operaciones · Verificación"
        title={<>Cola de pilotos.</>}
        description="Revisa documentos, señales de riesgo y auditoría. La aprobación desbloquea viajes; el rechazo exige un motivo que el piloto verá."
        actions={
          <Button variant="secondary" to="/conductores/verificacion">
            Ver como piloto <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="asphalt">
        <div className="wrap py-8 lg:py-12">
          <Reveal>
            {!sesion ? (
              sinAcceso(
                "Entra con una cuenta de operaciones",
                "El panel de verificación solo está disponible para el equipo de Llégate con rol administrador.",
              )
            ) : cargandoCuenta ? (
              <div className="card mx-auto flex max-w-xl items-center justify-center gap-2 p-8 text-[13px] text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Abriendo operaciones…
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
            ) : !esAdmin ? (
              <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-racing-500/30 bg-racing-500/10 text-racing-400">
                  <ShieldAlert className="h-6 w-6" />
                </span>
                <h2 className="heading mt-4 text-[22px] font-extrabold text-white">Esta sección es de operaciones.</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                  Tu cuenta ({cuenta.usuario.nombre}) no tiene rol administrador. Si eres piloto, tus documentos y tu
                  estado están en tu panel de verificación.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button to="/conductores/verificacion">
                    Ir a mi verificación <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" to="/">
                    Volver al inicio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[360px_1fr] lg:items-start">
                <aside className="grid gap-3 lg:sticky lg:top-[116px]">
                  <div className="card overflow-hidden">
                    <div className="border-b border-white/8 p-3">
                      <div role="tablist" aria-label="Estado de verificación" className="grid grid-cols-3 gap-1 rounded-xl bg-asphalt-950/60 p-1">
                        {TABS.map((item) => (
                          <button
                            key={item.id}
                            role="tab"
                            type="button"
                            aria-selected={tab === item.id}
                            onClick={() => {
                              setTab(item.id);
                              setSeleccion(null);
                              setRevision(null);
                              setError("");
                            }}
                            className={`min-h-[34px] rounded-lg px-2 text-[11.5px] font-semibold transition ${
                              tab === item.id ? "bg-brand-500 text-asphalt-950" : "text-ink-300 hover:text-white"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[540px] overflow-y-auto overscroll-contain p-2">
                      {cargandoCola ? (
                        <p className="flex items-center justify-center gap-2 py-8 text-[12px] text-ink-400">
                          <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando cola…
                        </p>
                      ) : cola.length === 0 ? (
                        <p className="px-3 py-8 text-center text-[12px] leading-relaxed text-ink-400">
                          No hay pilotos {tab === "pendiente" ? "por revisar" : tab === "aprobado" ? "aprobados" : "rechazados"}.
                        </p>
                      ) : (
                        <ul className="grid gap-1">
                          {cola.map((item) => {
                            const activo = item.usuarioId === seleccion;
                            return (
                              <li key={item.usuarioId}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSeleccion(item.usuarioId);
                                    setAccion(null);
                                    setMotivo("");
                                    setError("");
                                  }}
                                  aria-pressed={activo}
                                  className={`w-full rounded-xl border p-2.5 text-left transition ${
                                    activo
                                      ? "border-brand-500/50 bg-brand-500/[0.10]"
                                      : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="min-w-0">
                                      <span className="block truncate text-[12.5px] font-semibold text-white">
                                        {item.usuario?.nombre ?? "Sin nombre"}
                                      </span>
                                      <span className="mono mt-0.5 block truncate text-[10.5px] text-ink-400">
                                        {item.cedula} · {item.placa}
                                      </span>
                                    </span>
                                    <RiskBadge puntaje={item.riesgoPuntaje} />
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-ink-500">
                                    <span>{item.documentos.length}/4 docs</span>
                                    <span>{fecha(item.enviadoEn)}</span>
                                    {item.intentosVerificacion > 1 && <span>{item.intentosVerificacion} envíos</span>}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-white/8 p-2">
                      <button
                        type="button"
                        onClick={() => void cargarCola(tab)}
                        disabled={cargandoCola}
                        className="inline-flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[11px] font-semibold text-ink-300 transition hover:border-brand-500/45 hover:text-white disabled:opacity-45"
                      >
                        <RefreshCw className={`h-3 w-3 ${cargandoCola ? "animate-spin" : ""}`} /> Actualizar cola
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">Cómo priorizar</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
                      La cola ordena por riesgo: primero los puntajes altos. Revisa que la cédula y la licencia
                      coincidan con el nombre y que el hash no se repita entre cuentas.
                    </p>
                  </div>
                </aside>

                <div className="grid min-w-0 gap-3">
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

                  {cargandoDetalle ? (
                    <div className="card flex items-center justify-center gap-2 p-10 text-[13px] text-ink-400">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Cargando expediente…
                    </div>
                  ) : revision ? (
                    <DetalleRevision
                      revision={revision}
                      accion={accion}
                      motivo={motivo}
                      ocupado={ocupado}
                      onAccion={(siguiente) => {
                        setAccion(siguiente);
                        setMotivo("");
                        setError("");
                      }}
                      onMotivo={setMotivo}
                      onConfirmar={() => void confirmar()}
                      onCancelar={() => {
                        setAccion(null);
                        setMotivo("");
                      }}
                      onRecargar={() => void cargarDetalle(revision.conductor.usuarioId)}
                    />
                  ) : (
                    <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ink-400">
                        <FileSearch className="h-5 w-5" />
                      </span>
                      <p className="text-[13px] font-semibold text-white">Elige un piloto de la cola</p>
                      <p className="max-w-sm text-[11.5px] leading-relaxed text-ink-400">
                        Aquí verás sus documentos firmados, el texto del OCR, las señales de riesgo y la auditoría antes
                        de aprobar o rechazar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
