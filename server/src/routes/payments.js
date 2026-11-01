import { Router } from "express";
import { config } from "../config.js";
import { asyncHandler, HttpError, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { binanceDisponible, crearOrdenBinance } from "../payments/binance.js";
import { crearIntencionPagoMovil, pagoMovilDisponible } from "../payments/pagoMovil.js";
import { paymentIntentSchema, paymentReportSchema, uuidSchema } from "../schemas.js";

export const paymentsRouter = Router();

function expiraEn(minutos) {
  const limpio = Math.min(Math.max(Number(minutos) || 30, 5), 120);
  return new Date(Date.now() + limpio * 60_000).toISOString();
}

paymentsRouter.use(requireUser);

paymentsRouter.get(
  "/metodos",
  asyncHandler(async (_req, res) => {
    const binance = binanceDisponible();

    res.json({
      ok: true,
      metodos: [
        {
          id: "pago_movil",
          disponible: pagoMovilDisponible(),
          revision: "manual",
        },
        {
          id: "binance_pay",
          disponible: binance,
          revision: "automatica",
        },
      ],
    });
  }),
);

paymentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const pagos = unwrap(await req.supabase.rpc("mis_pagos", { p_limite: 20 }));

    res.json({ ok: true, pagos });
  }),
);

paymentsRouter.post(
  "/intents",
  asyncHandler(async (req, res) => {
    const body = parse(paymentIntentSchema, req.body);

    if (body.metodo === "pago_movil") {
      const intencion = crearIntencionPagoMovil(body.monto_usd);
      const resultado = unwrap(
        await req.supabase.rpc("crear_intencion_pago", {
          p_metodo: "pago_movil",
          p_proveedor: "manual",
          p_monto_usd: body.monto_usd,
          p_instrucciones: intencion.instrucciones,
          p_checkout_url: null,
          p_monto_bs: intencion.montoBs,
          p_tasa_bs: intencion.tasaBs,
          p_expira_en: expiraEn(intencion.expiraMinutos),
        }),
      );

      res.status(201).json(resultado);
      return;
    }

    if (!binanceDisponible()) {
      throw new HttpError(
        503,
        "binance_no_configurado",
        "Binance Pay no está disponible en este momento. Prueba con Pago Móvil.",
      );
    }

    const resultado = unwrap(
      await req.supabase.rpc("crear_intencion_pago", {
        p_metodo: "binance_pay",
        p_proveedor: "binance_pay",
        p_monto_usd: body.monto_usd,
        p_instrucciones: { tipo: "binance_pay" },
        p_checkout_url: null,
        p_monto_bs: null,
        p_tasa_bs: null,
        p_expira_en: expiraEn(config.payments.binance.expiraMinutos),
      }),
    );

    try {
      const orden = await crearOrdenBinance({
        montoUsd: body.monto_usd,
        codigo: resultado.pago.codigo,
      });

      unwrap(
        await req.supabase.rpc("actualizar_intencion_pago", {
          p_pago_id: resultado.pago.id,
          p_checkout_url: orden.checkoutUrl,
          p_referencia_externa: orden.prepayId,
          p_metadata: orden.metadata,
        }),
      );

      res.status(201).json({
        ok: true,
        pago: {
          ...resultado.pago,
          checkout_url: orden.checkoutUrl,
        },
      });
    } catch (error) {
      // Si Binance no responde, la intención no debe quedar viva sin checkout.
      await req.supabase.rpc("cancelar_pago", { p_pago_id: resultado.pago.id });
      throw error;
    }
  }),
);

paymentsRouter.post(
  "/:id/report",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const body = parse(paymentReportSchema, req.body);

    const resultado = unwrap(
      await req.supabase.rpc("reportar_pago", {
        p_pago_id: id,
        p_referencia: body.referencia,
        p_comprobante_url: body.comprobante_url ?? null,
      }),
    );

    res.json(resultado);
  }),
);

paymentsRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = parse(uuidSchema, req.params.id, "id");
    const resultado = unwrap(await req.supabase.rpc("cancelar_pago", { p_pago_id: id }));

    res.json(resultado);
  }),
);
