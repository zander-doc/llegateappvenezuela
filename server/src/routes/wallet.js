import { Router } from "express";
import { asyncHandler, parse, unwrap } from "../http.js";
import { requireUser } from "../middleware.js";
import { binanceSchema, pagoMovilSchema } from "../schemas.js";

export const walletRouter = Router();

const TRANSACTION_COLUMNS =
  "id, tipo, estado, metodo, monto_usd, saldo_resultante, billetera, viaje_id, banco, referencia, comprobante_url, motivo_rechazo, nota, created_at, aprobada_en";

walletRouter.use(requireUser);

walletRouter.get(
  "/billetera",
  asyncHandler(async (req, res) => {
    const resultado = unwrap(await req.supabase.rpc("mi_billetera"));

    res.json({ ok: true, ...resultado });
  }),
);

walletRouter.get(
  "/saldo",
  asyncHandler(async (req, res) => {
    const resultado = unwrap(await req.supabase.rpc("mi_billetera"));

    res.json({ ok: true, ...resultado });
  }),
);

walletRouter.get(
  "/movimientos",
  asyncHandler(async (req, res) => {
    const movimientos = unwrap(
      await req.supabase
        .from("transacciones_billetera")
        .select(TRANSACTION_COLUMNS)
        .eq("usuario_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    );

    res.json({ ok: true, movimientos });
  }),
);

walletRouter.get(
  "/recargas",
  asyncHandler(async (req, res) => {
    const recargas = unwrap(
      await req.supabase
        .from("transacciones_billetera")
        .select(TRANSACTION_COLUMNS)
        .eq("usuario_id", req.user.id)
        .eq("tipo", "recarga")
        .order("created_at", { ascending: false })
        .limit(50),
    );

    res.json({ ok: true, recargas });
  }),
);

walletRouter.post(
  "/recargas/pago-movil",
  asyncHandler(async (req, res) => {
    const body = parse(pagoMovilSchema, req.body);

    const resultado = unwrap(
      await req.supabase.rpc("reportar_recarga", {
        p_metodo: "pago_movil",
        p_monto_usd: body.monto_usd,
        p_banco: body.banco,
        p_referencia: body.referencia,
        p_comprobante_url: body.comprobante_url ?? null,
      }),
    );

    res.status(201).json(resultado);
  }),
);

walletRouter.post(
  "/recargas/binance",
  asyncHandler(async (req, res) => {
    const body = parse(binanceSchema, req.body);

    const resultado = unwrap(
      await req.supabase.rpc("reportar_recarga", {
        p_metodo: "binance_pay",
        p_monto_usd: body.monto_usd,
        p_banco: "Binance",
        p_referencia: body.referencia,
        p_comprobante_url: body.comprobante_url ?? null,
      }),
    );

    res.status(201).json(resultado);
  }),
);
