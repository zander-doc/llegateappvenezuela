import { Router } from "express";
import { filas, rpc } from "../db.js";
import { asyncHandler, parse } from "../http.js";
import { requireUser } from "../middleware.js";
import { binanceSchema, pagoMovilSchema } from "../schemas.js";

export const walletRouter = Router();

const TRANSACTION_COLUMNS =
  "id, tipo, estado, metodo, monto_usd, saldo_resultante, billetera, viaje_id, banco, referencia, comprobante_url, motivo_rechazo, nota, created_at, aprobada_en";

walletRouter.use(requireUser);

walletRouter.get(
  "/billetera",
  asyncHandler(async (req, res) => {
    const resultado = await rpc("mi_billetera", {}, { usuarioId: req.user.id });

    res.json({ ok: true, ...resultado });
  }),
);

walletRouter.get(
  "/saldo",
  asyncHandler(async (req, res) => {
    const resultado = await rpc("mi_billetera", {}, { usuarioId: req.user.id });

    res.json({ ok: true, ...resultado });
  }),
);

walletRouter.get(
  "/movimientos",
  asyncHandler(async (req, res) => {
    const movimientos = await filas(
      `select ${TRANSACTION_COLUMNS}
         from public.transacciones_billetera
        where usuario_id = $1
        order by created_at desc
        limit 50`,
      [req.user.id],
    );

    res.json({ ok: true, movimientos });
  }),
);

walletRouter.get(
  "/recargas",
  asyncHandler(async (req, res) => {
    const recargas = await filas(
      `select ${TRANSACTION_COLUMNS}
         from public.transacciones_billetera
        where usuario_id = $1 and tipo = 'recarga'
        order by created_at desc
        limit 50`,
      [req.user.id],
    );

    res.json({ ok: true, recargas });
  }),
);

walletRouter.post(
  "/recargas/pago-movil",
  asyncHandler(async (req, res) => {
    const body = parse(pagoMovilSchema, req.body);

    const resultado = await rpc(
      "reportar_recarga",
      {
        p_metodo: "pago_movil",
        p_monto_usd: body.monto_usd,
        p_banco: body.banco,
        p_referencia: body.referencia,
        p_comprobante_url: body.comprobante_url ?? null,
      },
      { usuarioId: req.user.id },
    );

    res.status(201).json(resultado);
  }),
);

walletRouter.post(
  "/recargas/binance",
  asyncHandler(async (req, res) => {
    const body = parse(binanceSchema, req.body);

    const resultado = await rpc(
      "reportar_recarga",
      {
        p_metodo: "binance_pay",
        p_monto_usd: body.monto_usd,
        p_banco: "Binance",
        p_referencia: body.referencia,
        p_comprobante_url: body.comprobante_url ?? null,
      },
      { usuarioId: req.user.id },
    );

    res.status(201).json(resultado);
  }),
);
