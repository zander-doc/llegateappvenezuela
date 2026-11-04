import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { pool } from "./db.js";
import { errorHandler } from "./http.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { configRouter } from "./routes/config.js";
import { driverDocumentsRouter, driversRouter } from "./routes/drivers.js";
import { filesRouter } from "./routes/files.js";
import { paymentsRouter } from "./routes/payments.js";
import { tripsRouter } from "./routes/trips.js";
import { walletRouter } from "./routes/wallet.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { canalOtp, smsDisponible } from "./security/otp-delivery.js";
import { whatsappDisponible } from "./security/whatsapp.js";

export const app = express();

app.disable("x-powered-by");
// Render y otros proxys añaden X-Forwarded-For; sin esto los límites por IP
// contarían a todos los clientes como uno solo.
app.set("trust proxy", 1);
app.use(cors({ origin: config.corsOrigins }));

// Los webhooks verifican la firma sobre el cuerpo crudo, antes del parser JSON.
app.use("/webhooks", webhooksRouter);

// Los documentos llegan en base64 y necesitan más espacio que el resto de la API.
app.use("/drivers/me/documentos", express.json({ limit: "8mb" }), driverDocumentsRouter);
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, servicio: "llegate-api" });
});

// Diagnóstico de la base: devuelve el error real del driver (sin credenciales)
// para poder corregir DATABASE_URL en producción sin abrir los logs.
function destinoBase() {
  const url = new URL(config.databaseUrl);
  return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
}

app.get("/health/db", async (_req, res) => {
  const inicio = Date.now();
  try {
    await pool.query({ text: "select 1", query_timeout: 5_000 });
    res.json({ ok: true, base: destinoBase(), latencia_ms: Date.now() - inicio });
  } catch (error) {
    // node-postgres agrupa los fallos de conexión en un AggregateError cuyo
    // mensaje viene vacío; el detalle útil está en `errors`.
    const detalles = [error.message, ...(error.errors ?? []).map((item) => item.message)];
    res.status(503).json({
      ok: false,
      base: destinoBase(),
      latencia_ms: Date.now() - inicio,
      codigo: error.code ?? error.errors?.[0]?.code ?? null,
      mensaje: detalles
        .filter(Boolean)
        .join(" | ")
        .replace(/postgres(?:ql)?:\/\/\S+/gi, "[url oculta]"),
    });
  }
});

// Diagnóstico del OTP: qué canal usará el próximo envío, sin exponer credenciales.
app.get("/health/otp", (_req, res) => {
  res.json({
    ok: true,
    canal: canalOtp(),
    whatsapp: {
      configurado: whatsappDisponible(),
      plantilla: config.otp.whatsapp.template,
      idioma: config.otp.whatsapp.language,
    },
    sms: { configurado: smsDisponible() },
    log: { activo: config.otp.registrarEnLog },
  });
});

app.use("/auth", authRouter);
app.use("/config", configRouter);
app.use("/drivers", driversRouter);
app.use("/wallet", walletRouter);
app.use("/payments", paymentsRouter);
app.use("/trips", tripsRouter);
app.use("/admin", adminRouter);
// Enlaces firmados de descarga de documentos (sin sesión, con vencimiento).
app.use("/files", filesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "ruta_no_encontrada", mensaje: "Ruta no encontrada" });
});

app.use(errorHandler);
