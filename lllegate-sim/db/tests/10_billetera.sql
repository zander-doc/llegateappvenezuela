\set ON_ERROR_STOP on

-- Datos base -----------------------------------------------------------------
-- D = conductor, C = cliente principal, A = admin, O = otro cliente.
insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', '+584141111111', now(),
   '{"nombre":"Carlos Conductor","rol":"conductor","email":"carlos@example.com","whatsapp":"+584141111111"}'),
  ('22222222-2222-2222-2222-222222222222', '+584142222222', now(),
   '{"nombre":"Ana Cliente","rol":"cliente","email":"ana@example.com"}'),
  ('33333333-3333-3333-3333-333333333333', '+584143333333', now(),
   '{"nombre":"Admin Uno","rol":"admin"}'),
  ('44444444-4444-4444-4444-444444444444', '+584144444444', now(),
   '{"nombre":"Otro Cliente","rol":"cliente","email":"otro@example.com"}');

update public.usuarios set rol = 'admin' where id = '33333333-3333-3333-3333-333333333333';

insert into public.conductores_detalles (
  usuario_id, cedula, tipo_vehiculo, placa, marca, modelo, anio,
  cedula_url, licencia_url, certificado_medico_url, verificacion, estado
) values (
  '11111111-1111-1111-1111-111111111111', 'V12345678', 'carro', 'AB123CD', 'Toyota', 'Corolla', 2018,
  '11111111-1111-1111-1111-111111111111/cedula.jpg',
  '11111111-1111-1111-1111-111111111111/licencia.jpg',
  '11111111-1111-1111-1111-111111111111/medico.jpg',
  'aprobado', 'activo'
);

-- Saldos iniciales: el conductor tiene 10 USD y el cliente 20 USD.
update public.usuarios set saldo_billetera = 10
 where id = '11111111-1111-1111-1111-111111111111';
update public.usuarios set saldo_billetera = 20
 where id = '22222222-2222-2222-2222-222222222222';

insert into public.viajes (id, cliente_id, metodo_pago, precio_usd, distancia_km, origen, destino) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'saldo', 10.00, 2.5, 'Altamira', 'Chacao'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'saldo', 50.00, 12.0, 'Chacao', 'La Guaira'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'saldo', 5.00, 1.5, 'Altamira', 'Los Palos Grandes'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'efectivo', 5.00, 1.2, 'Chacao', 'Sabana Grande'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'saldo', 0.10, 0.4, 'Altamira', 'Los Palos Grandes'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'saldo', 5.00, 1.0, 'Chacao', 'Bellas Artes');

\echo 'OK datos base'

-- 1. Viaje con saldo: no se puede pagar antes de iniciar ni cerrar como efectivo
do $$
declare
  r jsonb;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  r := public.aceptar_viaje('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar viaje 1: %', r; end if;

  -- El cliente todavía no inició el viaje: cubrir es una regla de negocio.
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  begin
    perform public.pagar_viaje_con_saldo('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'permitió pagar un viaje no iniciado' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  -- El conductor tampoco puede cerrarlo por la vía de efectivo.
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.iniciar_viaje('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar viaje 1: %', r; end if;
  r := public.procesar_comision_viaje('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if (r ->> 'ok')::boolean then raise exception 'cerró un viaje con saldo sin pago: %', r; end if;
  if (r ->> 'motivo') <> 'pago_con_saldo_pendiente' then raise exception 'motivo inesperado: %', r; end if;
  if (select saldo_billetera from public.usuarios where id = '11111111-1111-1111-1111-111111111111') <> 10 then
    raise exception 'el intento de cierre debitó al conductor';
  end if;
end $$;
\echo 'OK pago bloqueado antes de iniciar y cierre distinto de saldo'

-- 2. Pago feliz, libro mayor y idempotencia
do $$
declare
  r jsonb;
  v_pago public.transacciones_billetera%rowtype;
  v_abono public.transacciones_billetera%rowtype;
  v_comision public.transacciones_billetera%rowtype;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

  r := public.pagar_viaje_con_saldo('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if not (r ->> 'ok')::boolean then raise exception 'pago con saldo falló: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 1.00 then raise exception 'comisión incorrecta: %', r; end if;
  if (r ->> 'saldo_cliente')::numeric <> 10.00 then raise exception 'saldo cliente: %', r; end if;
  if (r ->> 'saldo_conductor')::numeric <> 19.00 then raise exception 'saldo conductor: %', r; end if;

  if (select estado from public.viajes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 'finalizado' then
    raise exception 'el viaje no quedó finalizado';
  end if;
  if (select comision_usd from public.viajes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 1.00 then
    raise exception 'la comisión no quedó registrada en el viaje';
  end if;

  select * into v_pago from public.transacciones_billetera
   where viaje_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and tipo = 'pago';
  select * into v_abono from public.transacciones_billetera
   where viaje_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and tipo = 'abono';
  select * into v_comision from public.transacciones_billetera
   where viaje_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and tipo = 'comision';

  if v_pago.usuario_id <> '22222222-2222-2222-2222-222222222222'
     or v_pago.monto_usd <> -10.00 or v_pago.saldo_resultante <> 10.00 then
    raise exception 'fila pago incorrecta: %', row_to_json(v_pago);
  end if;
  if v_abono.usuario_id <> '11111111-1111-1111-1111-111111111111'
     or v_abono.monto_usd <> 10.00 or v_abono.saldo_resultante <> 20.00 then
    raise exception 'fila abono incorrecta: %', row_to_json(v_abono);
  end if;
  if v_comision.usuario_id <> '11111111-1111-1111-1111-111111111111'
     or v_comision.monto_usd <> -1.00 or v_comision.saldo_resultante <> 19.00 then
    raise exception 'fila comisión incorrecta: %', row_to_json(v_comision);
  end if;

  -- Repetir el pago no vuelve a debitar.
  r := public.pagar_viaje_con_saldo('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if not (r ->> 'ya_procesado')::boolean then raise exception 'no fue idempotente: %', r; end if;
  if (r ->> 'saldo_cliente')::numeric <> 10.00 or (r ->> 'saldo_conductor')::numeric <> 19.00 then
    raise exception 'la idempotencia cambió los saldos: %', r;
  end if;
  if (select count(*) from public.transacciones_billetera
       where viaje_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 3 then
    raise exception 'el reintento duplicó filas del libro mayor';
  end if;

  -- La comisión sigue siendo idempotente por la vía de efectivo.
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.procesar_comision_viaje('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  if not (r ->> 'ya_procesado')::boolean then raise exception 'comisión no idempotente: %', r; end if;
end $$;
\echo 'OK pago con saldo, libro mayor e idempotencia'

-- 3. Saldo insuficiente, recarga y reintento
do $$
declare
  r jsonb;
  v_tx uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.aceptar_viaje('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar viaje 2: %', r; end if;
  r := public.iniciar_viaje('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar viaje 2: %', r; end if;

  -- El cliente tiene 10 USD y el viaje cuesta 50.
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.pagar_viaje_con_saldo('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if (r ->> 'ok')::boolean then raise exception 'pagó sin saldo: %', r; end if;
  if (r ->> 'motivo') <> 'saldo_insuficiente' then raise exception 'motivo inesperado: %', r; end if;
  if (select saldo_billetera from public.usuarios where id = '22222222-2222-2222-2222-222222222222') <> 10 then
    raise exception 'el saldo cambió en el intento fallido';
  end if;
  if (select estado from public.viajes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') <> 'en_curso' then
    raise exception 'el viaje no quedó abierto para reintentar';
  end if;
  if exists (select 1 from public.transacciones_billetera
              where viaje_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') then
    raise exception 'el intento fallido escribió en el libro mayor';
  end if;

  -- Recarga semi-automática: se reporta y un admin la aprueba.
  r := public.reportar_recarga('pago_movil', 40, 'Banesco', '2222222222', null);
  if not (r ->> 'ok')::boolean then raise exception 'reporte de recarga: %', r; end if;
  v_tx := (r ->> 'transaccion_id')::uuid;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.aprobar_recarga(v_tx);
  if not (r ->> 'ok')::boolean then raise exception 'aprobación de recarga: %', r; end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.pagar_viaje_con_saldo('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  if not (r ->> 'ok')::boolean then raise exception 'reintento tras recargar: %', r; end if;
  if (r ->> 'saldo_cliente')::numeric <> 0 then raise exception 'saldo cliente tras pagar: %', r; end if;
  if (r ->> 'saldo_conductor')::numeric <> 64.00 then raise exception 'saldo conductor tras viaje 2: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 5.00 then raise exception 'comisión tras viaje 2: %', r; end if;
end $$;
\echo 'OK saldo insuficiente, recarga y reintento'

-- 4. Autorización: solo el cliente dueño puede pagar
do $$
declare
  r jsonb;
  v_tx uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.aceptar_viaje('cccccccc-cccc-cccc-cccc-cccccccccccc');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar viaje 3: %', r; end if;
  r := public.iniciar_viaje('cccccccc-cccc-cccc-cccc-cccccccccccc');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar viaje 3: %', r; end if;

  -- El conductor no puede disponer del saldo del cliente.
  begin
    perform public.pagar_viaje_con_saldo('cccccccc-cccc-cccc-cccc-cccccccccccc');
    raise exception 'el conductor pudo pagar con saldo ajeno' using errcode = 'ZZ999';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  begin
    perform public.pagar_viaje_con_saldo('cccccccc-cccc-cccc-cccc-cccccccccccc');
    raise exception 'un tercero pudo pagar el viaje' using errcode = 'ZZ999';
  exception when sqlstate '42501' then
    null;
  end;

  -- El cliente dueño sí puede.
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.reportar_recarga('pago_movil', 20, 'Mercantil', '3333333333', null);
  if not (r ->> 'ok')::boolean then raise exception 'recarga del cliente: %', r; end if;
  v_tx := (r ->> 'transaccion_id')::uuid;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.aprobar_recarga(v_tx);
  if not (r ->> 'ok')::boolean then raise exception 'aprobación de la recarga del cliente: %', r; end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.pagar_viaje_con_saldo('cccccccc-cccc-cccc-cccc-cccccccccccc');
  if not (r ->> 'ok')::boolean then raise exception 'pago del dueño falló: %', r; end if;
  if (r ->> 'saldo_conductor')::numeric <> 68.50 then raise exception 'saldo conductor tras viaje 3: %', r; end if;
end $$;
\echo 'OK autorización del pago con saldo'

-- 5. Un viaje en efectivo no se paga con saldo; su comisión sigue funcionando
do $$
declare
  r jsonb;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.aceptar_viaje('dddddddd-dddd-dddd-dddd-dddddddddddd');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar viaje 4: %', r; end if;
  r := public.iniciar_viaje('dddddddd-dddd-dddd-dddd-dddddddddddd');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar viaje 4: %', r; end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  begin
    perform public.pagar_viaje_con_saldo('dddddddd-dddd-dddd-dddd-dddddddddddd');
    raise exception 'pagó un viaje en efectivo con saldo' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.procesar_comision_viaje('dddddddd-dddd-dddd-dddd-dddddddddddd');
  if not (r ->> 'ok')::boolean then raise exception 'comisión de efectivo: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 68.00 then raise exception 'saldo tras efectivo: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 0.50 then raise exception 'comisión de efectivo: %', r; end if;
end $$;
\echo 'OK viaje en efectivo rechaza el pago con saldo'

-- 6. Comisión mínima: 10 % de 0.10 es 0.01, se cobra el mínimo de 0.10 (tope: precio)
do $$
declare
  r jsonb;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.aceptar_viaje('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar viaje mínimo: %', r; end if;
  r := public.iniciar_viaje('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar viaje mínimo: %', r; end if;

  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.pagar_viaje_con_saldo('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  if not (r ->> 'ok')::boolean then raise exception 'pago mínimo: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 0.10 then raise exception 'comisión mínima topada: %', r; end if;
  if (r ->> 'neto_conductor')::numeric <> 0 then raise exception 'neto del conductor: %', r; end if;
  if (r ->> 'saldo_conductor')::numeric <> 68.00 then raise exception 'saldo con comisión = precio: %', r; end if;
  if (r ->> 'saldo_cliente')::numeric <> 14.90 then raise exception 'saldo cliente con viaje mínimo: %', r; end if;
  if (select estado from public.conductores_detalles
       where usuario_id = '11111111-1111-1111-1111-111111111111') <> 'activo' then
    raise exception 'el conductor quedó inactivo con saldo suficiente';
  end if;
end $$;
\echo 'OK comisión topada al precio del viaje'

-- 7. La finalización directa de un viaje con saldo está bloqueada
do $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  perform public.aceptar_viaje('ffffffff-ffff-ffff-ffff-ffffffffffff');
  perform public.iniciar_viaje('ffffffff-ffff-ffff-ffff-ffffffffffff');

  -- Aun con el flag interno de finalización activo, exige la fila de pago.
  perform set_config('llegate.finalizando', 'on', true);
  begin
    update public.viajes
       set estado = 'finalizado', finalizado_en = now()
     where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    raise exception 'cerró un viaje con saldo sin pago' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  if (select estado from public.viajes where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff') <> 'en_curso' then
    raise exception 'el viaje cambió de estado en el intento bloqueado';
  end if;
end $$;
\echo 'OK finalización directa bloqueada'

-- 8. Integridad del libro mayor
do $$
begin
  -- El pago debe ser negativo.
  begin
    insert into public.transacciones_billetera
      (usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante)
    values ('22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            'pago', 'aprobada', 'saldo', 5.00, 14.90);
    raise exception 'aceptó un pago positivo' using errcode = 'ZZ999';
  exception when check_violation then
    null;
  end;

  -- El abono debe ser positivo.
  begin
    insert into public.transacciones_billetera
      (usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante)
    values ('11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            'abono', 'aprobada', 'saldo', -1.00, 67.00);
    raise exception 'aceptó un abono negativo' using errcode = 'ZZ999';
  exception when check_violation then
    null;
  end;

  -- No puede haber dos pagos para el mismo viaje.
  begin
    insert into public.transacciones_billetera
      (usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'pago', 'aprobada', 'saldo', -1.00, 9.00);
    raise exception 'duplicó el pago de un viaje' using errcode = 'ZZ999';
  exception when unique_violation then
    null;
  end;

  if exists (select 1 from public.usuarios where saldo_billetera < 0) then
    raise exception 'existe un saldo negativo';
  end if;
end $$;
\echo 'OK integridad del libro mayor'

-- 9. Conciliación: la suma del libro mayor explica el saldo final
do $$
declare
  v_cliente numeric;
  v_conductor numeric;
  v_sum_cliente numeric;
  v_sum_conductor numeric;
begin
  select saldo_billetera into v_cliente from public.usuarios
   where id = '22222222-2222-2222-2222-222222222222';
  select saldo_billetera into v_conductor from public.usuarios
   where id = '11111111-1111-1111-1111-111111111111';

  select coalesce(sum(monto_usd), 0) into v_sum_cliente from public.transacciones_billetera
   where usuario_id = '22222222-2222-2222-2222-222222222222';
  select coalesce(sum(monto_usd), 0) into v_sum_conductor from public.transacciones_billetera
   where usuario_id = '11111111-1111-1111-1111-111111111111';

  -- Saldos iniciales: cliente 20, conductor 10.
  if v_cliente <> 20 + v_sum_cliente then
    raise exception 'libro mayor del cliente no concilia: saldo %, movimientos %', v_cliente, v_sum_cliente;
  end if;
  if v_conductor <> 10 + v_sum_conductor then
    raise exception 'libro mayor del conductor no concilia: saldo %, movimientos %', v_conductor, v_sum_conductor;
  end if;
end $$;
\echo 'OK conciliación del libro mayor'

-- 10. Recargas: referencias verificables, duplicados y rechazo
do $$
declare
  r jsonb;
  v_tx uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);

  begin
    perform public.reportar_recarga('pago_movil', 3, 'Banesco', 'REF-001', null);
    raise exception 'aceptó una referencia de Pago Móvil inválida' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  r := public.reportar_recarga('pago_movil', 3, 'Banesco', '9876543210', null);
  if not (r ->> 'ok')::boolean then raise exception 'recarga válida: %', r; end if;
  v_tx := (r ->> 'transaccion_id')::uuid;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.aprobar_recarga(v_tx);
  if not (r ->> 'ok')::boolean then raise exception 'aprobar recarga ajena: %', r; end if;

  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  if (select saldo_billetera from public.usuarios where id = '44444444-4444-4444-4444-444444444444') <> 3 then
    raise exception 'la recarga no acreditó el saldo';
  end if;

  begin
    perform public.reportar_recarga('pago_movil', 3, 'Banesco', '9876543210', null);
    raise exception 'permitió referencia duplicada' using errcode = 'ZZ999';
  exception when sqlstate '23505' then
    null;
  end;

  -- Referencia de Binance: se rechaza y se puede reenviar.
  r := public.reportar_recarga('binance_pay', 2, 'Binance', 'TX-REJECT-1', null);
  if not (r ->> 'ok')::boolean then raise exception 'reporte Binance: %', r; end if;
  v_tx := (r ->> 'transaccion_id')::uuid;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.rechazar_recarga(v_tx, 'Comprobante ilegible');
  if not (r ->> 'ok')::boolean then raise exception 'rechazo Binance: %', r; end if;

  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  r := public.reportar_recarga('binance_pay', 2, 'Binance', 'TX-REJECT-1', null);
  if not (r ->> 'ok')::boolean then raise exception 'reenvío tras rechazo: %', r; end if;
end $$;
\echo 'OK referencias de recarga, duplicados y rechazo'

-- 11. RLS: cada cliente solo ve lo suyo y no puede escribir movimientos de pago
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;

do $$
declare
  n int;
  ajenas int;
begin
  select count(*) into n from public.usuarios;
  if n <> 1 then raise exception 'RLS usuarios: el cliente ve % perfiles', n; end if;

  select count(*) into n from public.viajes;
  if n <> 6 then raise exception 'RLS viajes: el cliente ve % viajes', n; end if;

  select count(*) into ajenas from public.transacciones_billetera
   where usuario_id <> auth.uid();
  if ajenas <> 0 then raise exception 'RLS transacciones: ve % movimientos ajenos', ajenas; end if;

  begin
    insert into public.transacciones_billetera
      (usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante)
    values (auth.uid(), 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            'pago', 'aprobada', 'saldo', -5.00, 9.90);
    raise exception 'el cliente pudo insertar un pago directo' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.usuarios set saldo_billetera = 999 where id = auth.uid();
    raise exception 'el cliente pudo cambiar su saldo' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
\echo 'OK RLS del cliente'

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
set role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.viajes;
  if n <> 0 then raise exception 'RLS: otro cliente ve % viajes ajenos', n; end if;
  select count(*) into n from public.transacciones_billetera
   where usuario_id = '22222222-2222-2222-2222-222222222222';
  if n <> 0 then raise exception 'RLS: otro cliente ve % movimientos ajenos', n; end if;
end $$;

reset role;
\echo 'OK RLS de un tercero'

\echo 'TODAS LAS PRUEBAS DE BILLETERA PASARON'
