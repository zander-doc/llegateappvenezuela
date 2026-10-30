-- Llégate App · movimiento de bienvenida del piloto
--
-- Se separa de la migración de prepago por la misma razón que los tipos
-- 'pago' y 'abono': PostgreSQL 15 no permite usar un valor de enum nuevo en
-- la misma transacción que lo agrega. La migración siguiente ya puede
-- insertar movimientos tipo 'bienvenida'.

alter type public.tipo_transaccion add value if not exists 'bienvenida';
