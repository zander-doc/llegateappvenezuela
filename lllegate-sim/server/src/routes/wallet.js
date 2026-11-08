import { Router } from "express";
import { filas, rpc, pool } from "../db.js";
import { asyncHandler, parse, HttpError } from "../http.js";
import { requireUser, requireAdmin } from "../middleware.js";
import { binanceSchema, pagoMovilSchema } from "../schemas.js";
import { z } from "zod";

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

// ---------------------------------------------------------------------------
// Puente Físico-Digital: recarga de billetera desde tablet de mostrador (AppBoutique)
// Permite a un operador autenticado (rol admin) recargar la billetera de cualquier
// usuario ingresando su ID, monto, método de pago y referencia.
// Transacción atómica: actualiza saldo y registra la transacción en un solo paso.
// ---------------------------------------------------------------------------
const recargaFisicaSchema = z.object({
  usuario_id: z.string().uuid("ID de usuario inválido"),
  monto: z.coerce
    .number()
    .positive("El monto debe ser mayor a cero")
    .max(10000, "El monto máximo por recarga es 10000 USD"),
  metodo_pago: z
    .enum(["efectivo", "pago_movil", "binance_pay"])
    .default("efectivo"),
  referencia: z.string().trim().max(200).optional(),
  banco: z.string().trim().max(100).optional(),
});

walletRouter.post(
  "/recargar",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = parse(recargaFisicaSchema, req.body);
    const { usuario_id, monto, metodo_pago, referencia, banco } = body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Bloquear la fila del usuario para evitar condiciones de carrera
      const userRes = await client.query(
        "SELECT saldo_billetera FROM public.usuarios WHERE id = $1 FOR UPDATE",
        [usuario_id],
      );

      if (userRes.rows.length === 0) {
        await client.query("ROLLBACK");
        throw new HttpError(404, "usuario_no_encontrado", "Usuario no encontrado");
      }

      const saldoActual = Number(userRes.rows[0].saldo_billetera) || 0;
      const montoUsd = Math.round(monto * 100) / 100;
      const nuevoSaldo = Math.round((saldoActual + montoUsd) * 100) / 100;

      // Actualizar saldo del usuario
      await client.query(
        "UPDATE public.usuarios SET saldo_billetera = $1, updated_at = now() WHERE id = $2",
        [nuevoSaldo, usuario_id],
      );

      // Registrar transacción en el libro mayor (tipo 'ajuste' respeta los
      // constraints de la tabla, que limitan 'recarga' a pago_movil/binance_pay)
      await client.query(
        `INSERT INTO public.transacciones_billetera
         (usuario_id, tipo, estado, metodo, monto_usd, saldo_resultante, banco,
          referencia, nota, created_by, aprobada_por, aprobada_en)
         VALUES ($1, 'ajuste', 'aprobada', $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          usuario_id,
          metodo_pago,
          montoUsd,
          nuevoSaldo,
          banco ?? "AppBoutique",
          referencia ?? null,
          "Recarga física en mostrador (AppBoutique)",
          req.user.id,
          req.user.id,
        ],
      );

      await client.query("COMMIT");

      res.status(200).json({
        ok: true,
        mensaje: "Recarga exitosa",
        nuevo_saldo: nuevoSaldo,
        transaccion: {
          monto: montoUsd,
          metodo_pago,
          referencia: referencia ?? null,
          banco: banco ?? null,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }),
);
