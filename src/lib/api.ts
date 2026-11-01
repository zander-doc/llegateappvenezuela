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
