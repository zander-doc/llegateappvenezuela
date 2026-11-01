// Cliente de la API de Llégate para la web. Solo se activa cuando VITE_API_URL
// apunta a la API real; sin esa variable el sitio sigue en modo demostración.

const rawApiUrl = import.meta.env.VITE_API_URL?.trim() ?? "";

export const API_URL = rawApiUrl.replace(/\/+$/, "");
export const realAuthEnabled = API_URL.length > 0;

const SESSION_KEY = "llegate_sesion_v1";
const REFRESH_MARGIN_MS = 60_000;

export type Rol = "cliente" | "conductor" | "admin";

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string;
  telefono: string | null;
  telefonoVerificado: boolean;
  email: string | null;
  whatsapp: string | null;
  saldoBilletera: number;
}

export interface Conductor {
  tipoVehiculo: "moto" | "carro" | null;
  placa: string | null;
  verificacion: "pendiente" | "aprobado" | "rechazado" | null;
  estado: string | null;
  motivoRechazo: string | null;
  verificadoEn: string | null;
}

export interface Cuenta {
  usuario: Perfil;
  conductor: Conductor | null;
  capacidades: { puedePedirViajes: boolean; puedeConducir: boolean };
}

export type MetodoPago = "pago_movil" | "binance_pay";

export type EstadoPago = "pendiente" | "en_revision" | "confirmado" | "rechazado" | "expirado" | "cancelado";

export interface MetodoPagoDisponible {
  id: MetodoPago;
  disponible: boolean;
  revision: "manual" | "automatica";
}

export interface LimitesBilletera {
  comisionPorcentaje: number;
  comisionMinimaUSD: number;
  saldoMinimoUSD: number;
  alertaSaldoBajoUSD: number;
  recargaMinimaUSD: number;
  recargaMaximaUSD: number;
  slaAprobacionMinutos: number;
  bienvenidaUSD: number;
}

export interface Billetera {
  tipo: "pasajero" | "piloto";
  saldoUSD: number;
  reservadoUSD: number;
  disponibleUSD: number;
  estado: "activo" | "saldo_bajo" | "sin_saldo";
  limites: LimitesBilletera;
}

export interface InstruccionesPago {
  tipo?: string;
  banco?: string;
  telefono?: string;
  cedula?: string;
  titular?: string;
  monto_bs?: number;
  tasa_bs?: number;
  nota?: string;
}

export interface PagoIntento {
  id: string;
  codigo: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  montoUSD: number;
  montoBs: number | null;
  tasaBs: number | null;
  checkoutUrl: string | null;
  instrucciones: InstruccionesPago;
  referenciaReportada: string | null;
  comprobanteUrl: string | null;
  expiraEn: string | null;
  confirmadoEn: string | null;
  motivoRechazo: string | null;
  createdAt: string | null;
}

export interface ReportePago {
  ok: boolean;
  estado: EstadoPago;
  motivo?: string;
  yaReportado: boolean;
}

interface OtpResponse {
  ok: boolean;
  mensaje?: string;
}

interface VerifyResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  usuario: { id: string; telefono: string | null };
}

interface RefreshResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface MeResponse {
  ok: boolean;
  usuario: {
    id: string;
    rol: Rol;
    nombre: string;
    telefono: string | null;
    telefono_verificado: boolean;
    email: string | null;
    whatsapp: string | null;
    saldo_billetera: number | string;
  };
  conductor: {
    tipo_vehiculo: "moto" | "carro" | null;
    placa: string | null;
    verificacion: "pendiente" | "aprobado" | "rechazado" | null;
    estado: string | null;
    motivo_rechazo: string | null;
    verificado_en: string | null;
  } | null;
  capacidades: { puede_pedir_viajes: boolean; puede_conducir: boolean };
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  detalles?: unknown;

  constructor(code: string, status: number, message: string, detalles?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detalles = detalles;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("api_no_configurada", 0, "El acceso real no está configurado.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("sin_conexion", 0, "No pudimos conectar con Llégate. Revisa tu conexión.");
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => null)) as
    | { error?: string; mensaje?: string; detalles?: unknown }
    | null;

  if (!response.ok) {
    throw new ApiError(
      data?.error ?? "error",
      response.status,
      data?.mensaje ?? "No pudimos completar la solicitud.",
      data?.detalles,
    );
  }

  return data as T;
}

function isValidSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<Session>;
  return (
    typeof session.access_token === "string" &&
    session.access_token.length > 0 &&
    typeof session.refresh_token === "string" &&
    session.refresh_token.length > 0 &&
    typeof session.expires_at === "number"
  );
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que limpiar.
  }
}

export async function requestOtp(input: { telefono: string; nombre?: string; rol?: "cliente" | "conductor" }) {
  const data = await request<OtpResponse>("/auth/otp", {
    method: "POST",
    body: { telefono: input.telefono, nombre: input.nombre, rol: input.rol ?? "cliente" },
  });
  return data.mensaje ?? "Código enviado por SMS";
}

export async function refreshSession(refreshToken?: string): Promise<string> {
  const token = refreshToken ?? loadSession()?.refresh_token;
  if (!token) {
    clearSession();
    throw new ApiError("sin_sesion", 401, "Inicia sesión con tu teléfono para continuar.");
  }

  try {
    const data = await request<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: token },
    });
    saveSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    return data.access_token;
  } catch (error) {
    clearSession();
    if (error instanceof ApiError && error.status === 401) {
      throw new ApiError("sesion_invalida", 401, "Tu sesión expiró. Vuelve a ingresar con tu teléfono.");
    }
    throw error;
  }
}

async function accessToken(): Promise<string> {
  const session = loadSession();
  if (!session) {
    throw new ApiError("sin_sesion", 401, "Inicia sesión con tu teléfono para continuar.");
  }
  if (session.expires_at * 1000 - Date.now() > REFRESH_MARGIN_MS) {
    return session.access_token;
  }
  return refreshSession(session.refresh_token);
}

function mapCuenta(data: MeResponse): Cuenta {
  const usuario = data.usuario;
  return {
    usuario: {
      id: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      telefonoVerificado: Boolean(usuario.telefono_verificado),
      email: usuario.email,
      whatsapp: usuario.whatsapp,
      saldoBilletera: Number(usuario.saldo_billetera ?? 0),
    },
    conductor: data.conductor
      ? {
          tipoVehiculo: data.conductor.tipo_vehiculo,
          placa: data.conductor.placa,
          verificacion: data.conductor.verificacion,
          estado: data.conductor.estado,
          motivoRechazo: data.conductor.motivo_rechazo,
          verificadoEn: data.conductor.verificado_en,
        }
      : null,
    capacidades: {
      puedePedirViajes: Boolean(data.capacidades?.puede_pedir_viajes),
      puedeConducir: Boolean(data.capacidades?.puede_conducir),
    },
  };
}

export async function getCuenta(): Promise<Cuenta> {
  const token = await accessToken();
  try {
    const data = await request<MeResponse>("/auth/me", { token });
    return mapCuenta(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearSession();
    throw error;
  }
}

export async function verifyOtp(input: { telefono: string; token: string }): Promise<Cuenta> {
  const data = await request<VerifyResponse>("/auth/verify", {
    method: "POST",
    body: { telefono: input.telefono, token: input.token },
  });

  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  });

  return getCuenta();
}

export async function logout() {
  const session = loadSession();
  if (session) {
    try {
      await request("/auth/logout", { method: "POST", token: session.access_token });
    } catch {
      // Cerramos la sesión local aunque el proveedor no responda.
    }
  }
  clearSession();
}

export function maskPhone(phone: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const prefix = phone.trim().startsWith("+") ? `+${digits.slice(0, 2)} ` : "";
  return `${prefix}••• ${digits.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Billetera y pagos reales
// ---------------------------------------------------------------------------

interface WalletResponse {
  ok: boolean;
  billetera: "pasajero" | "piloto";
  saldo_billetera: number | string;
  reservado_usd: number | string;
  disponible_usd: number | string;
  estado_billetera: "activo" | "saldo_bajo" | "sin_saldo";
  limites: {
    comision_porcentaje: number | string;
    comision_minima_usd: number | string;
    saldo_minimo_usd: number | string;
    alerta_saldo_bajo_usd: number | string;
    recarga_minima_usd: number | string;
    recarga_maxima_usd: number | string;
    sla_aprobacion_minutos: number | string;
    bienvenida_usd: number | string;
  };
}

interface PaymentRow {
  id: string;
  codigo: string;
  metodo: MetodoPago;
  estado: EstadoPago;
  monto_usd: number | string;
  monto_bs: number | string | null;
  tasa_bs: number | string | null;
  checkout_url: string | null;
  instrucciones: InstruccionesPago | null;
  referencia_reportada?: string | null;
  comprobante_url?: string | null;
  expira_en?: string | null;
  confirmado_en?: string | null;
  motivo_rechazo?: string | null;
  created_at?: string | null;
}

interface CreatePaymentResponse {
  ok: boolean;
  pago: PaymentRow;
}

interface ReportPaymentResponse {
  ok: boolean;
  motivo?: string;
  estado: EstadoPago;
  ya_reportado?: boolean;
}

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPago(row: PaymentRow): PagoIntento {
  return {
    id: row.id,
    codigo: row.codigo,
    metodo: row.metodo,
    estado: row.estado,
    montoUSD: num(row.monto_usd),
    montoBs: row.monto_bs === null || row.monto_bs === undefined ? null : num(row.monto_bs),
    tasaBs: row.tasa_bs === null || row.tasa_bs === undefined ? null : num(row.tasa_bs),
    checkoutUrl: row.checkout_url ?? null,
    instrucciones: row.instrucciones ?? {},
    referenciaReportada: row.referencia_reportada ?? null,
    comprobanteUrl: row.comprobante_url ?? null,
    expiraEn: row.expira_en ?? null,
    confirmadoEn: row.confirmado_en ?? null,
    motivoRechazo: row.motivo_rechazo ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function getWallet(): Promise<Billetera> {
  const token = await accessToken();
  const data = await request<WalletResponse>("/wallet/billetera", { token });

  return {
    tipo: data.billetera,
    saldoUSD: num(data.saldo_billetera),
    reservadoUSD: num(data.reservado_usd),
    disponibleUSD: num(data.disponible_usd),
    estado: data.estado_billetera,
    limites: {
      comisionPorcentaje: num(data.limites.comision_porcentaje),
      comisionMinimaUSD: num(data.limites.comision_minima_usd),
      saldoMinimoUSD: num(data.limites.saldo_minimo_usd),
      alertaSaldoBajoUSD: num(data.limites.alerta_saldo_bajo_usd),
      recargaMinimaUSD: num(data.limites.recarga_minima_usd),
      recargaMaximaUSD: num(data.limites.recarga_maxima_usd),
      slaAprobacionMinutos: num(data.limites.sla_aprobacion_minutos),
      bienvenidaUSD: num(data.limites.bienvenida_usd),
    },
  };
}

export async function getPaymentMethods(): Promise<MetodoPagoDisponible[]> {
  const token = await accessToken();
  const data = await request<{ ok: boolean; metodos: MetodoPagoDisponible[] }>("/payments/metodos", { token });
  return data.metodos;
}

export async function listPayments(): Promise<PagoIntento[]> {
  const token = await accessToken();
  const data = await request<{ ok: boolean; pagos: PaymentRow[] | null }>("/payments", { token });
  return (data.pagos ?? []).map(mapPago);
}

export async function createPaymentIntent(input: { metodo: MetodoPago; montoUSD: number }): Promise<PagoIntento> {
  const token = await accessToken();
  const data = await request<CreatePaymentResponse>("/payments/intents", {
    method: "POST",
    token,
    body: { metodo: input.metodo, monto_usd: input.montoUSD },
  });
  return mapPago(data.pago);
}

export async function reportPayment(input: {
  id: string;
  referencia: string;
  comprobanteUrl?: string;
}): Promise<ReportePago> {
  const token = await accessToken();
  const data = await request<ReportPaymentResponse>(`/payments/${encodeURIComponent(input.id)}/report`, {
    method: "POST",
    token,
    body: { referencia: input.referencia.trim(), comprobante_url: input.comprobanteUrl },
  });
  return {
    ok: Boolean(data.ok),
    estado: data.estado,
    motivo: data.motivo,
    yaReportado: Boolean(data.ya_reportado),
  };
}

export async function cancelPayment(id: string): Promise<{ ok: boolean; estado?: EstadoPago }> {
  const token = await accessToken();
  return request<{ ok: boolean; estado?: EstadoPago }>(`/payments/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    token,
  });
}

const PAYMENT_ERROR_COPY: Array<[RegExp, string]> = [
  [/REFERENCIA_DUPLICADA/, "Esa referencia ya está registrada. Revisa el número que te dio tu banco."],
  [/PAGO_NO_REPORTABLE/, "Este pago ya no se puede reportar. Crea una recarga nueva."],
  [/PAGO_EN_REVISION/, "Ya reportaste este pago: no se puede cancelar, solo esperar la revisión."],
  [/PAGO_NO_CANCELABLE/, "Este pago ya no se puede cancelar."],
  [/PAGO_NO_ENCONTRADO/, "No encontramos ese pago. Recarga la página e intenta de nuevo."],
  [/METODO_AUTOMATICO/, "Los pagos de Binance se confirman automáticamente."],
  [/MONTO_FUERA_DE_RANGO/, "El monto está fuera del rango permitido para tu billetera."],
  [/NO_AUTORIZADO/, "Tu sesión no permite esta operación. Vuelve a ingresar."],
];

export function paymentErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "No pudimos completar el pago. Intenta de nuevo.";
  const copy = PAYMENT_ERROR_COPY.find(([pattern]) => pattern.test(error.message));
  return copy ? copy[1] : error.message;
}

// ---------------------------------------------------------------------------
// Verificación de conductores y antifraude
// ---------------------------------------------------------------------------

export type TipoDocumentoConductor = "cedula_frente" | "cedula_reverso" | "licencia" | "certificado_medico";
export type EstadoOcr = "no_configurado" | "listo" | "fallido";
export type NivelRiesgo = "bajo" | "medio" | "alto";
export type EstadoVerificacion = "pendiente" | "aprobado" | "rechazado";

export interface MotivoRiesgo {
  codigo: string;
  peso: number;
  detalle?: string | null;
}

export interface DocumentoConductor {
  tipo: TipoDocumentoConductor;
  mime: string;
  bytes: number;
  ocrEstado: EstadoOcr;
  ocrConfianza: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VerificacionConductor {
  cedula: string;
  tipoVehiculo: "moto" | "carro";
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  verificacion: EstadoVerificacion;
  estado: string;
  motivoRechazo: string | null;
  riesgoPuntaje: number;
  riesgoMotivos: MotivoRiesgo[];
  enviadoEn: string | null;
  intentosVerificacion: number;
}

export interface MiVerificacion {
  conductor: VerificacionConductor;
  documentos: DocumentoConductor[];
}

export interface ResultadoEnvioVerificacion {
  ok: boolean;
  verificacion: EstadoVerificacion;
  riesgoPuntaje: number;
  riesgoNivel: NivelRiesgo;
  motivos: MotivoRiesgo[];
  documentos: number;
  enviadoEn: string | null;
}

export interface DocumentoRevision extends DocumentoConductor {
  url: string | null;
  hashSha256: string;
  ocrTexto: string | null;
  ocrDatos: unknown;
}

export interface ConductorRevision extends VerificacionConductor {
  usuarioId: string;
  verificadoPor: string | null;
  verificadoEn: string | null;
  createdAt: string | null;
}

export interface EventoSeguridad {
  id: number;
  tipo: string;
  severidad: "info" | "alerta" | "critico";
  detalle: Record<string, unknown>;
  createdAt: string;
}

export interface PerfilConductor {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  telefonoVerificado: boolean;
  createdAt: string | null;
}

export interface ConductorEnCola extends ConductorRevision {
  usuario: PerfilConductor | null;
  documentos: DocumentoConductor[];
}

export interface RevisionConductor {
  conductor: ConductorRevision;
  usuario: PerfilConductor | null;
  documentos: DocumentoRevision[];
  eventos: EventoSeguridad[];
}

interface DriverRow {
  usuario_id?: string;
  cedula: string;
  tipo_vehiculo: "moto" | "carro";
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  verificacion: EstadoVerificacion;
  estado: string;
  motivo_rechazo: string | null;
  riesgo_puntaje: number | string | null;
  riesgo_motivos: MotivoRiesgo[] | null;
  enviado_en: string | null;
  intentos_verificacion: number | string | null;
  verificado_por?: string | null;
  verificado_en?: string | null;
  created_at?: string | null;
}

interface DriverDocumentRow {
  usuario_id?: string;
  tipo: TipoDocumentoConductor;
  mime: string;
  bytes: number | string;
  hash_sha256?: string;
  ocr_estado: EstadoOcr;
  ocr_texto?: string | null;
  ocr_confianza: number | string | null;
  ocr_datos?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  url?: string | null;
}

interface PerfilConductorRow {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  telefono_verificado: boolean;
  created_at?: string | null;
}

function mapConductor(row: DriverRow): VerificacionConductor {
  return {
    cedula: row.cedula,
    tipoVehiculo: row.tipo_vehiculo,
    placa: row.placa,
    marca: row.marca ?? null,
    modelo: row.modelo ?? null,
    anio: row.anio === null || row.anio === undefined ? null : Number(row.anio),
    verificacion: row.verificacion,
    estado: row.estado,
    motivoRechazo: row.motivo_rechazo ?? null,
    riesgoPuntaje: num(row.riesgo_puntaje),
    riesgoMotivos: Array.isArray(row.riesgo_motivos) ? row.riesgo_motivos : [],
    enviadoEn: row.enviado_en ?? null,
    intentosVerificacion: num(row.intentos_verificacion),
  };
}

function mapDocumento(row: DriverDocumentRow): DocumentoConductor {
  return {
    tipo: row.tipo,
    mime: row.mime,
    bytes: num(row.bytes),
    ocrEstado: row.ocr_estado,
    ocrConfianza: row.ocr_confianza === null || row.ocr_confianza === undefined ? null : num(row.ocr_confianza),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapPerfil(row: PerfilConductorRow | null | undefined): PerfilConductor | null {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono ?? null,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    telefonoVerificado: Boolean(row.telefono_verificado),
    createdAt: row.created_at ?? null,
  };
}

function mapConductorRevision(row: DriverRow): ConductorRevision {
  return {
    ...mapConductor(row),
    usuarioId: row.usuario_id ?? "",
    verificadoPor: row.verificado_por ?? null,
    verificadoEn: row.verificado_en ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function getDriverVerification(): Promise<MiVerificacion> {
  const token = await accessToken();
  const data = await request<{ ok: boolean; conductor: DriverRow; documentos: DriverDocumentRow[] | null }>(
    "/drivers/me",
    { token },
  );
  return {
    conductor: mapConductor(data.conductor),
    documentos: (data.documentos ?? []).map(mapDocumento),
  };
}

export async function saveDriverDetails(input: {
  cedula: string;
  tipoVehiculo: "moto" | "carro";
  placa: string;
  marca?: string;
  modelo?: string;
  anio?: number;
}): Promise<VerificacionConductor> {
  const token = await accessToken();
  const data = await request<{ ok: boolean; conductor: DriverRow }>("/drivers/me", {
    method: "POST",
    token,
    body: {
      cedula: input.cedula.trim().toUpperCase(),
      tipo_vehiculo: input.tipoVehiculo,
      placa: input.placa.trim().toUpperCase(),
      marca: input.marca?.trim() || undefined,
      modelo: input.modelo?.trim() || undefined,
      anio: input.anio,
    },
  });
  return mapConductor(data.conductor);
}

const MAX_DOCUMENTO_BYTES = 5 * 1024 * 1024;
const MIMES_DOCUMENTO = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function leerArchivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new ApiError("lectura_fallida", 0, "No pudimos leer el archivo. Intenta de nuevo."));
    reader.onload = () => {
      const resultado = String(reader.result ?? "");
      const coma = resultado.indexOf(",");
      resolve(coma >= 0 ? resultado.slice(coma + 1) : resultado);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadDriverDocument(input: { tipo: TipoDocumentoConductor; file: File }): Promise<DocumentoConductor> {
  if (input.file.size === 0) {
    throw new ApiError("documento_vacio", 0, "El archivo está vacío.");
  }
  if (input.file.size > MAX_DOCUMENTO_BYTES) {
    throw new ApiError("documento_muy_grande", 0, "El archivo supera los 5 MB.");
  }
  if (!MIMES_DOCUMENTO.has(input.file.type)) {
    throw new ApiError("formato_no_soportado", 0, "Sube una foto JPG, PNG, WebP o un PDF.");
  }

  const token = await accessToken();
  const contenido = await leerArchivoBase64(input.file);
  const data = await request<{ ok: boolean; documento: DriverDocumentRow }>("/drivers/me/documentos", {
    method: "POST",
    token,
    body: { tipo: input.tipo, mime: input.file.type, contenido_base64: contenido },
  });
  return mapDocumento(data.documento);
}

export async function submitDriverVerification(): Promise<ResultadoEnvioVerificacion> {
  const token = await accessToken();
  const data = await request<{
    ok: boolean;
    verificacion: EstadoVerificacion;
    riesgo_puntaje: number | string;
    riesgo_nivel: NivelRiesgo;
    motivos: MotivoRiesgo[] | null;
    documentos: number | string;
    enviado_en: string | null;
  }>("/drivers/me/enviar", { method: "POST", token });

  return {
    ok: Boolean(data.ok),
    verificacion: data.verificacion,
    riesgoPuntaje: num(data.riesgo_puntaje),
    riesgoNivel: data.riesgo_nivel,
    motivos: data.motivos ?? [],
    documentos: num(data.documentos),
    enviadoEn: data.enviado_en,
  };
}

export async function listDriversForReview(verificacion: EstadoVerificacion): Promise<ConductorEnCola[]> {
  const token = await accessToken();
  const data = await request<{
    ok: boolean;
    conductores: Array<
      DriverRow & { usuario: PerfilConductorRow | null; documentos: DriverDocumentRow[] | null }
    > | null;
  }>(`/admin/conductores?verificacion=${encodeURIComponent(verificacion)}`, { token });

  return (data.conductores ?? []).map((row) => ({
    ...mapConductorRevision(row),
    usuario: mapPerfil(row.usuario),
    documentos: (row.documentos ?? []).map(mapDocumento),
  }));
}

export async function getDriverReview(usuarioId: string): Promise<RevisionConductor> {
  const token = await accessToken();
  const data = await request<{
    ok: boolean;
    conductor: DriverRow;
    usuario: PerfilConductorRow | null;
    documentos: DriverDocumentRow[] | null;
    eventos: Array<{
      id: number;
      tipo: string;
      severidad: "info" | "alerta" | "critico";
      detalle: Record<string, unknown>;
      created_at: string;
    }> | null;
  }>(`/admin/conductores/${encodeURIComponent(usuarioId)}`, { token });

  return {
    conductor: mapConductorRevision(data.conductor),
    usuario: mapPerfil(data.usuario),
    documentos: (data.documentos ?? []).map((row) => ({
      ...mapDocumento(row),
      url: row.url ?? null,
      hashSha256: row.hash_sha256 ?? "",
      ocrTexto: row.ocr_texto ?? null,
      ocrDatos: row.ocr_datos ?? null,
    })),
    eventos: (data.eventos ?? []).map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      severidad: evento.severidad,
      detalle: evento.detalle ?? {},
      createdAt: evento.created_at,
    })),
  };
}

export async function verifyDriver(
  usuarioId: string,
  input: { aprobado: boolean; motivo?: string },
): Promise<{ ok: boolean; verificacion: EstadoVerificacion; motivoRechazo: string | null }> {
  const token = await accessToken();
  const data = await request<{
    ok: boolean;
    verificacion: EstadoVerificacion;
    motivo_rechazo?: string | null;
  }>(`/admin/conductores/${encodeURIComponent(usuarioId)}/verificar`, {
    method: "POST",
    token,
    body: { aprobado: input.aprobado, motivo: input.motivo?.trim() || undefined },
  });

  return {
    ok: Boolean(data.ok),
    verificacion: data.verificacion,
    motivoRechazo: data.motivo_rechazo ?? null,
  };
}

const VERIFICATION_ERROR_COPY: Array<[RegExp, string]> = [
  [/DOCUMENTO_DUPLICADO|23505/, "Ese documento ya está vinculado a otra cuenta. Revisa que sea tuyo y vuelve a intentarlo."],
  [/CONDUCTOR_YA_APROBADO/, "Tu cuenta ya está aprobada; los documentos no se pueden reemplazar."],
  [/CONDUCTOR_BLOQUEADO/, "Tu cuenta está bloqueada para verificación. Escríbenos por soporte."],
  [/DOCUMENTOS_INCOMPLETOS/, "Faltan documentos: sube la cédula por ambos lados, la licencia y el certificado médico."],
  [/conductor_no_registrado/, "Primero completa los datos de tu vehículo."],
  [/documento_muy_grande/, "El archivo supera los 5 MB. Comprime la imagen o usa un PDF más liviano."],
  [/formato_no_soportado/, "Sube una foto JPG, PNG, WebP o un PDF del documento."],
  [/mime_no_coincide/, "El archivo no coincide con su formato. Vuelve a exportarlo o toma otra foto."],
  [/documento_invalido|documento_vacio/, "No pudimos leer el archivo. Intenta con otra foto o PDF."],
  [/solo_admin/, "Esta sección es solo para el equipo de operaciones."],
  [/NO_AUTORIZADO|TOKEN|sesion_invalida/, "Tu sesión no permite esta operación. Vuelve a ingresar."],
];

export function verificationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "No pudimos completar la verificación. Intenta de nuevo.";
  if (error.status === 0 && error.code === "sin_conexion") return error.message;
  const copy = VERIFICATION_ERROR_COPY.find(([pattern]) => pattern.test(`${error.code} ${error.message}`));
  return copy ? copy[1] : error.message;
}
