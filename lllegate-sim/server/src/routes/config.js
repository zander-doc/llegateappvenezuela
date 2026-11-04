import { Router } from "express";
import { APP_CONFIG } from "../appConfig.js";

export const configRouter = Router();

// Fuente única para la app: servicios, tarifas y reglas de billetera.
// Es estática y no toca la base, así que responde aunque Neon esté caído.
configRouter.get("/app", (_req, res) => {
  res.json({ ok: true, ...APP_CONFIG });
});
