-- Llégate App · movimientos del pago de un viaje con saldo
--
-- Se aplica en un archivo aparte porque PostgreSQL 15 no permite usar un valor
-- de enum nuevo dentro de la misma transacción que lo agrega. La migración
-- siguiente ya puede referenciar 'pago' y 'abono' en constraints e índices.
--
--   pago  → débito a la billetera del cliente por el precio del viaje.
--   abono → crédito bruto a la billetera del conductor; la comisión se
--           registra después como un débito separado para que el libro mayor
--           concilie exactamente con el cambio de saldo.

alter type public.tipo_transaccion add value if not exists 'pago';
alter type public.tipo_transaccion add value if not exists 'abono';
