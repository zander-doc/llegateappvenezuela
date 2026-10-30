import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler } from "./http.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { driversRouter } from "./routes/drivers.js";
import { tripsRouter } from "./routes/trips.js";
import { walletRouter } from "./routes/wallet.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, servicio: "llegate-api" });
});

app.use("/auth", authRouter);
app.use("/drivers", driversRouter);
app.use("/wallet", walletRouter);
app.use("/trips", tripsRouter);
app.use("/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "ruta_no_encontrada", mensaje: "Ruta no encontrada" });
});

app.use(errorHandler);
