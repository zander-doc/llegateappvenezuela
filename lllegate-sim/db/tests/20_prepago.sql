\set ON_ERROR_STOP on

-- Pruebas del prepago del piloto. Se ejecuta después de 10_billetera.sql sobre
-- la misma base, así que primero se limpia el estado operativo.

delete from public.reservas_comision;
delete from public.transacciones_billetera;
delete from public.viajes;
update public.usuarios set saldo_billetera = 0;
update public.conductores_detalles
   set estado = 'activo', verificacion = 'aprobado', bienvenida_acreditada = false;

\echo 'OK limpieza inicial'

-- 1. Configuración y estado de la billetera ----------------------------------
do $$
declare
  r jsonb;
  c public.configuracion_comisiones%rowtype;
begin
  select * into c from public.configuracion_comisiones where id;
  if c.saldo_minimo_usd <> 1.00 then raise exception 'saldo mínimo: %', c.saldo_minimo_usd; end if;
  if c.alerta_saldo_bajo_usd <> 2.00 then raise exception 'alerta saldo bajo: %', c.alerta_saldo_bajo_usd; end if;
  if c.recarga_minima_usd <> 5.00 or c.recarga_maxima_usd <> 50.00 then
    raise exception 'rango de recarga: % - %', c.recarga_minima_usd, c.recarga_maxima_usd;
  end if;
  if c.sla_aprobacion_minutos <> 15 then raise exception 'SLA: %', c.sla_aprobacion_minutos; end if;
  if c.bienvenida_usd <> 2.00 then raise exception 'bienvenida: %', c.bienvenida_usd; end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.mi_billetera();
  if (r ->> 'billetera') <> 'piloto' then raise exception 'billetera: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 0 then raise exception 'saldo: %', r; end if;
  if (r ->> 'estado_billetera') <> 'sin_saldo' then raise exception 'estado: %', r; end if;
  if (r -> 'limites' ->> 'saldo_minimo_usd')::numeric <> 1.00 then raise exception 'límites: %', r; end if;
end $$;
\echo 'OK configuración y estado de billetera'

-- 2. Bienvenida única al verificar al piloto -------------------------------
do $$
declare
  r jsonb;
  v_movs int;
begin
  insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data) values (
    '55555555-5555-5555-5555-555555555555', '+584145555555', now(),
    '{"nombre":"Nuevo Piloto","rol":"conductor","email":"nuevo@example.com"}'
  );

  insert into public.conductores_detalles (
    usuario_id, cedula, tipo_vehiculo, placa, cedula_url, licencia_url,
    certificado_medico_url, verificacion, estado
  ) values (
    '55555555-5555-5555-5555-555555555555', 'V87654321', 'moto', 'AB456CD',
    '55555555-5555-5555-5555-555555555555/cedula.jpg',
    '55555555-5555-5555-5555-555555555555/licencia.jpg',
    '55555555-5555-5555-5555-555555555555/medico.jpg',
    'pendiente', 'inactivo_sin_saldo'
  );

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.verificar_conductor('55555555-5555-5555-5555-555555555555', true, null);
  if not (r ->> 'ok')::boolean then raise exception 'verificación: %', r; end if;
  if (r ->> 'bienvenida_usd')::numeric <> 2.00 then raise exception 'bienvenida: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 2.00 then raise exception 'saldo tras bienvenida: %', r; end if;
  if (r ->> 'estado') <> 'activo' then raise exception 'estado tras bienvenida: %', r; end if;

  select count(*) into v_movs from public.transacciones_billetera
   where usuario_id = '55555555-5555-5555-5555-555555555555' and tipo = 'bienvenida';
  if v_movs <> 1 then raise exception 'movimientos de bienvenida: %', v_movs; end if;
  if not (select bienvenida_acreditada from public.conductores_detalles
           where usuario_id = '55555555-5555-5555-5555-555555555555') then
    raise exception 'la bandera de bienvenida no quedó marcada';
  end if;

  r := public.verificar_conductor('55555555-5555-5555-5555-555555555555', true, null);
  if not (r ->> 'ya_verificado')::boolean then raise exception 'segunda verificación: %', r; end if;
  if (select saldo_billetera from public.usuarios
       where id = '55555555-5555-5555-5555-555555555555') <> 2.00 then
    raise exception 'la bienvenida se acreditó dos veces';
  end if;
end $$;
\echo 'OK bienvenida única'

-- 3. Reserva al aceptar, liberación al cancelar y captura al completar ------
do $$
declare
  r jsonb;
  v_reserva public.reservas_comision%rowtype;
begin
  update public.usuarios set saldo_billetera = 1.50
   where id = '11111111-1111-1111-1111-111111111111';

  insert into public.viajes (id, cliente_id, metodo_pago, precio_usd, distancia_km, origen, destino) values
    ('11110000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'efectivo', 30.00, 8.0, 'Chacao', 'La Guaira'),
    ('11110000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'efectivo', 10.00, 3.0, 'Altamira', 'Chacao'),
    ('11110000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'efectivo', 5.00, 1.5, 'Chacao', 'Sabana Grande'),
    ('11110000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'efectivo', 10.00, 3.0, 'Altamira', 'Chacao');

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  -- Comisión de 3 USD sobre 1.50 disponibles: no alcanza.
  r := public.aceptar_viaje('11110000-0000-0000-0000-000000000001');
  if (r ->> 'ok')::boolean then raise exception 'aceptó sin disponible: %', r; end if;
  if (r ->> 'motivo') <> 'saldo_insuficiente' then raise exception 'motivo: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 3.00 then raise exception 'comisión: %', r; end if;
  if (r ->> 'disponible_usd')::numeric <> 1.50 then raise exception 'disponible: %', r; end if;
  if exists (select 1 from public.reservas_comision
              where viaje_id = '11110000-0000-0000-0000-000000000001') then
    raise exception 'creó reserva con saldo insuficiente';
  end if;

  -- Comisión de 1 USD: acepta y reserva.
  r := public.aceptar_viaje('11110000-0000-0000-0000-000000000002');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar: %', r; end if;
  if (r ->> 'reservado_usd')::numeric <> 1.00 then raise exception 'reservado: %', r; end if;
  if (r ->> 'disponible_usd')::numeric <> 0.50 then raise exception 'disponible: %', r; end if;
  if (r ->> 'billetera') <> 'piloto' then raise exception 'billetera: %', r; end if;

  select * into v_reserva from public.reservas_comision
   where viaje_id = '11110000-0000-0000-0000-000000000002';
  if v_reserva.estado <> 'reservada' or v_reserva.monto_usd <> 1.00 then
    raise exception 'reserva incorrecta: %', row_to_json(v_reserva);
  end if;

  -- Un viaje activo impide aceptar otro.
  r := public.aceptar_viaje('11110000-0000-0000-0000-000000000003');
  if (r ->> 'motivo') <> 'viaje_activo' then raise exception 'viaje activo: %', r; end if;

  -- Cancelar libera la reserva y reactiva al piloto.
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  r := public.cancelar_viaje('11110000-0000-0000-0000-000000000002', 'El pasajero no salió');
  if not (r ->> 'ok')::boolean then raise exception 'cancelar: %', r; end if;
  if not (r ->> 'reserva_liberada')::boolean then raise exception 'reserva no liberada: %', r; end if;

  select * into v_reserva from public.reservas_comision
   where viaje_id = '11110000-0000-0000-0000-000000000002';
  if v_reserva.estado <> 'liberada' or v_reserva.liberada_en is null then
    raise exception 'liberación incorrecta: %', row_to_json(v_reserva);
  end if;
  if (select estado from public.conductores_detalles
       where usuario_id = '11111111-1111-1111-1111-111111111111') <> 'activo' then
    raise exception 'el piloto no se reactivó al liberar';
  end if;

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.mi_billetera();
  if (r ->> 'reservado_usd')::numeric <> 0 or (r ->> 'disponible_usd')::numeric <> 1.50 then
    raise exception 'billetera tras liberar: %', r;
  end if;

  -- Nuevo viaje: aceptar, iniciar y completar en efectivo.
  r := public.aceptar_viaje('11110000-0000-0000-0000-000000000004');
  if not (r ->> 'ok')::boolean then raise exception 'aceptar de nuevo: %', r; end if;
  r := public.iniciar_viaje('11110000-0000-0000-0000-000000000004');
  if not (r ->> 'ok')::boolean then raise exception 'iniciar: %', r; end if;
  r := public.procesar_comision_viaje('11110000-0000-0000-0000-000000000004');
  if not (r ->> 'ok')::boolean then raise exception 'finalizar: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 1.00 then raise exception 'comisión cobrada: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 0.50 then raise exception 'saldo tras cobrar: %', r; end if;
  if (r -> 'recibo' ->> 'neto_usd')::numeric <> 9.00 then raise exception 'recibo: %', r; end if;
  if (r ->> 'conductor_activo')::boolean then raise exception 'sigue activo con 0.50: %', r; end if;

  select * into v_reserva from public.reservas_comision
   where viaje_id = '11110000-0000-0000-0000-000000000004';
  if v_reserva.estado <> 'capturada' or v_reserva.capturada_en is null then
    raise exception 'captura incorrecta: %', row_to_json(v_reserva);
  end if;
  if not exists (
    select 1 from public.transacciones_billetera
     where viaje_id = '11110000-0000-0000-0000-000000000004'
       and tipo = 'comision' and billetera = 'piloto' and monto_usd = -1.00
  ) then
    raise exception 'no registró la comisión en la billetera piloto';
  end if;
end $$;
\echo 'OK reserva, liberación y captura'

-- 4. Sin saldo no se deja negativo y se puede terminar tras recargar --------
do $$
declare
  r jsonb;
  v_tx uuid;
begin
  -- Viaje en curso sin reserva (simula un viaje aceptado antes de la migración).
  insert into public.viajes (
    id, cliente_id, conductor_id, estado, metodo_pago, precio_usd,
    distancia_km, origen, destino, aceptado_en, iniciado_en
  ) values (
    '11110000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111', 'en_curso', 'efectivo', 10.00,
    1.5, 'Chacao', 'Bellas Artes', now(), now()
  );

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  r := public.procesar_comision_viaje('11110000-0000-0000-0000-000000000005');
  if (r ->> 'ok')::boolean then raise exception 'cobró sin saldo: %', r; end if;
  if (r ->> 'motivo') <> 'saldo_insuficiente' then raise exception 'motivo: %', r; end if;
  if (select saldo_billetera from public.usuarios
       where id = '11111111-1111-1111-1111-111111111111') <> 0.50 then
    raise exception 'el saldo cambió en el intento fallido';
  end if;
  if exists (select 1 from public.transacciones_billetera
              where viaje_id = '11110000-0000-0000-0000-000000000005') then
    raise exception 'el intento fallido escribió en el libro mayor';
  end if;

  -- Recarga del piloto: mínimo 5 USD.
  begin
    perform public.reportar_recarga('pago_movil', 3, 'Banesco', '5550001111', null);
    raise exception 'aceptó una recarga por debajo del mínimo' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  r := public.reportar_recarga('pago_movil', 5, 'Banesco', '5550001111', null);
  if not (r ->> 'ok')::boolean then raise exception 'recarga válida: %', r; end if;
  if (r ->> 'billetera') <> 'piloto' then raise exception 'billetera de recarga: %', r; end if;
  if (r ->> 'sla_aprobacion_minutos')::int <> 15 then raise exception 'SLA: %', r; end if;
  v_tx := (r ->> 'transaccion_id')::uuid;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  r := public.aprobar_recarga(v_tx);
  if not (r ->> 'ok')::boolean then raise exception 'aprobar recarga: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 5.50 then raise exception 'saldo tras recarga: %', r; end if;

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.procesar_comision_viaje('11110000-0000-0000-0000-000000000005');
  if not (r ->> 'ok')::boolean then raise exception 'terminar tras recargar: %', r; end if;
  if (r ->> 'comision_usd')::numeric <> 1.00 then raise exception 'comisión final: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 4.50 then raise exception 'saldo final: %', r; end if;
  if (select estado from public.conductores_detalles
       where usuario_id = '11111111-1111-1111-1111-111111111111') <> 'activo' then
    raise exception 'el piloto no volvió a activo tras recargar';
  end if;
end $$;
\echo 'OK sin negativo y viaje en curso tras recargar'

-- 5. RLS de las reservas ----------------------------------------------------
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;

do $$
declare
  ajenas int;
begin
  select count(*) into ajenas from public.reservas_comision
   where conductor_id <> auth.uid();
  if ajenas <> 0 then raise exception 'RLS reservas: ve % ajenas', ajenas; end if;

  begin
    update public.reservas_comision set estado = 'capturada'
     where conductor_id = auth.uid();
    raise exception 'el piloto pudo editar una reserva' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
\echo 'OK RLS de reservas'

\echo 'TODAS LAS PRUEBAS DE PREPAGO PASARON'
