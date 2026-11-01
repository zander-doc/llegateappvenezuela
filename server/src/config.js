import "dotenv/config";

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

function originList(value) {
  return (value ?? "http://localhost:5173")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  corsOrigins: originList(process.env.CORS_ORIGIN),
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
};
