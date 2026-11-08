import { Router } from "express";
import { rpc } from "../db.js";
import { asyncHandler, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { applyReferralSchema } from "../schemas.js";

export const referralsRouter = Router();

referralsRouter.use(requireUser);

referralsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const resumen = await rpc("mi_resumen_referidos", {}, { usuarioId: req.user.id });
    if (!resumen) {
      res.json({
        ok: true,
        resumen: { codigo_referido: null, invitados: 0, invitados_bonificados: 0, bono_acumulado_usd: 0 },
      });
      return;
    }
    res.json({ ok: true, resumen });
  }),
);

referralsRouter.post(
  "/aplicar",
  asyncHandler(async (req, res) => {
    const body = parse(applyReferralSchema, req.body);
    const resultado = await rpc(
      "aplicar_codigo_referido",
      { p_codigo: body.codigo_referido },
      { usuarioId: req.user.id },
    );
    res.status(resultado.ok ? 201 : 409).json(resultado);
  }),
);
