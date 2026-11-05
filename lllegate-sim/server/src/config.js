import "dotenv/config";
import { resolve } from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Copia .env.example a .env.`);
  }
  return value;
}

function text(name) {
  return process.env[name]?.trim() ?? "";
}

function number(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function flag(name, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "si", "sí", "yes"].includes(value);
}

function originList(value) {
  return (value ?? "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Un valor pegado con su etiqueta, entre comillas o incompleto deja arrancar el
// servicio y falla en cada consulta; conviene detenerse aquí con un mensaje
// claro, sin imprimir nunca el contenido ni la contraseña.
export function validarDatabaseUrl(valor) {
  const largo = valor.length;

  if (!/^postgres(ql)?:\/\//i.test(valor)) {
    const pista = valor.includes("://")
      ? "El texto tiene un esquema de conexión, pero no al inicio: se pegó algo delante."
      : "No se encontró el esquema postgresql://.";
    throw new Error(
      `DATABASE_URL debe empezar por postgresql:// (el valor guardado tiene ${largo} caracteres). ${pista}`,
    );
  }

  let url;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(
      `DATABASE_URL no es una URL válida (${largo} caracteres). Copia la cadena completa desde Neon.`,
    );
  }

  if (!url.hostname) {
    throw new Error("DATABASE_URL no incluye el servidor de la base (falta el host).");
  }

  return valor;
}

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = validarDatabaseUrl(required("DATABASE_URL"));
const jwtSecret = required("AUTH_JWT_SECRET");

export const config = {
  port,
  databaseUrl,
  // Neon y la mayoría de proveedores administrados exigen TLS.
  databaseSsl: flag(
    "DATABASE_SSL",
    /sslmode=require|neon\.tech|render\.com|railway/.test(databaseUrl),
  ),
  databasePoolSize: number("DATABASE_POOL_SIZE", 5),
  publicBaseUrl: text("PUBLIC_API_URL") || `http://localhost:${port}`,
  corsOrigins: originList(process.env.CORS_ORIGIN),
  auth: {
    jwtSecret,
    accessTtlSegundos: number("AUTH_ACCESS_TTL_SEGUNDOS", 3600),
    refreshTtlDias: number("AUTH_REFRESH_TTL_DIAS", 30),
  },
  otp: {
    // Pepper propio del código OTP; si no se define usa el secreto de sesión.
    secret: text("OTP_SECRET") || jwtSecret,
    ttlMinutos: number("OTP_TTL_MINUTOS", 10),
    maxIntentos: number("OTP_MAX_INTENTOS", 5),
    // Sin proveedor configurado el código se escribe en el log solo fuera de
    // producción; en producción se responde 503 en vez de fingir un envío.
    registrarEnLog: flag("OTP_LOG_EN_DESARROLLO", process.env.NODE_ENV !== "production"),
    sms: {
      accountSid: text("TWILIO_ACCOUNT_SID"),
      authToken: text("TWILIO_AUTH_TOKEN"),
      from: text("TWILIO_FROM"),
    },
    whatsapp: {
      token: text("WHATSAPP_TOKEN"),
      phoneId: text("WHATSAPP_PHONE_ID"),
      wabaId: text("WHATSAPP_WABA_ID"),
      template: text("WHATSAPP_OTP_TEMPLATE") || "llegate_otp",
      language: text("WHATSAPP_OTP_LANGUAGE") || "es",
      apiVersion: text("WHATSAPP_API_VERSION") || "v21.0",
    },
    limits: {
      porTelefono: number("OTP_MAX_POR_TELEFONO", 3),
      porIp: number("OTP_MAX_POR_IP", 8),
      porVerificacion: number("OTP_MAX_VERIFICACIONES", 6),
      ventanaMinutos: number("OTP_VENTANA_MINUTOS", 10),
    },
  },
  storage: {
    // "local" guarda en disco (desarrollo y pruebas); "r2" usa Cloudflare R2.
    driver: (text("STORAGE_DRIVER") || "local").toLowerCase(),
    bucket: text("STORAGE_BUCKET") || "documentos-conductores",
    localDir: resolve(process.cwd(), text("STORAGE_LOCAL_DIR") || ".storage"),
    // Las URLs de descarga las firma esta API, no el proveedor: así el mismo
    // enlace funciona con R2 o con disco y caduca igual.
    urlSegundos: number("ARCHIVOS_URL_SEGUNDOS", 900),
    secret: text("ARCHIVOS_SECRET") || jwtSecret,
    r2: {
      accountId: text("R2_ACCOUNT_ID"),
      accessKeyId: text("R2_ACCESS_KEY_ID"),
      secretAccessKey: text("R2_SECRET_ACCESS_KEY"),
      endpoint: text("R2_ENDPOINT"),
    },
  },
  payments: {
    // Clave compartida con `configuracion_pagos.clave_servidor_hash`. Solo la
    // usan los webhooks para confirmar un pago; nunca se envía a la web.
    serverKey: text("PAGOS_CLAVE_SERVIDOR"),
    pagoMovil: {
      banco: text("PAGO_MOVIL_BANCO"),
      telefono: text("PAGO_MOVIL_TELEFONO"),
      cedula: text("PAGO_MOVIL_CEDULA"),
      titular: text("PAGO_MOVIL_TITULAR"),
      tasaBs: number("PAGO_MOVIL_TASA_BS", 0),
      expiraMinutos: number("PAGO_MOVIL_EXPIRA_MINUTOS", 30),
    },
    binance: {
      certSn: text("BINANCE_PAY_CERT_SN"),
      secretKey: text("BINANCE_PAY_SECRET_KEY"),
      webhookPublicKey: text("BINANCE_PAY_WEBHOOK_PUBLIC_KEY"),
      baseUrl: text("BINANCE_PAY_BASE_URL") || "https://bpay.binanceapi.com",
      expiraMinutos: number("BINANCE_PAY_EXPIRA_MINUTOS", 30),
    },
  },
  verification: {
    maxBytes: number("VERIFICACION_MAX_BYTES", 5 * 1024 * 1024),
    ocr: {
      provider: (text("OCR_PROVIDER") || "none").toLowerCase(),
      apiKey: text("OCR_API_KEY"),
      endpoint: text("OCR_ENDPOINT"),
      timeoutMs: number("OCR_TIMEOUT_MS", 12000),
    },
  },
};
