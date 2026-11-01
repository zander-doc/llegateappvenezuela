\set ON_ERROR_STOP on

-- Pruebas de intenciones de pago (Pago Móvil manual y Binance Pay automático).
-- Se ejecutan después de 10, 20 y 30 sobre la misma base.

delete from public.pagos;
delete from public.transacciones_billetera;
delete from public.reservas_comision;
delete from public.viajes;

update public.usuarios set saldo_billetera = 0;
update public.conductores_detalles
   set estado = 'inactivo_sin_saldo', verificacion = 'aprobado', bienvenida_acreditada = true;

-- Clave de servidor de prueba. En producción se registra el hash de una clave
-- aleatoria y se configura la misma en PAGOS_CLAVE_SERVIDOR.
insert into public.configuracion_pagos (id, clave_servidor_hash)
values (true, encode(digest('clave-servidor-de-prueba-0123456789abcdef', 'sha256'), 'hex'))
on conflict (id) do update set clave_servidor_hash = excluded.clave_servidor_hash;

create temp table _ctx (nombre text primary key, valor text);
\echo 'OK limpieza y clave de servidor'

-- 1. Intención de Pago Móvil del piloto -------------------------------------
do $$
declare
  r jsonb;
  v_id uuid;
  v_codigo text;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  r := public.crear_intencion_pago(
    'pago_movil', 'manual', 10,
    '{"tipo":"pago_movil","banco":"Banesco","telefono":"04141234567"}'::jsonb,
    null, 1000, 100, now() + interval '30 minutes'
  );
  if not (r ->> 'ok')::boolean then raise exception 'crear intención: %', r; end if;
  if (r -> 'pago' ->> 'estado') <> 'pendiente' then raise exception 'estado: %', r; end if;
  if (r -> 'pago' ->> 'billetera') <> 'piloto' then raise exception 'billetera: %', r; end if;
  if (r -> 'pago' ->> 'monto_bs')::numeric <> 1000 then raise exception 'monto_bs: %', r; end if;
  v_codigo := r -> 'pago' ->> 'codigo';
  if v_codigo !~ '^LLG-[0-9A-F]{10}$' then raise exception 'código: %', v_codigo; end if;

  v_id := (r -> 'pago' ->> 'id')::uuid;
  insert into _ctx values ('pago_movil', v_id::text), ('codigo_movil', v_codigo);

  -- El piloto no puede recargar por debajo de 5 USD.
  begin
    perform public.crear_intencion_pago('pago_movil', 'manual', 3, '{}'::jsonb, null, 300, 100, null);
    raise exception 'aceptó una intención bajo el mínimo' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  -- Método y proveedor incompatibles.
  begin
    perform public.crear_intencion_pago('binance_pay', 'manual', 10, '{}'::jsonb, null, null, null, null);
    raise exception 'aceptó proveedor incompatible' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;
\echo 'OK intención de Pago Móvil y validaciones'

-- 2. Reporte de referencia y revisión manual --------------------------------
do $$
declare
  r jsonb;
  v_id uuid := (select valor from _ctx where nombre = 'pago_movil')::uuid;
  v_otro uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  r := public.reportar_pago(v_id, '123456', '11111111-1111-1111-1111-111111111111/comprobante.jpg');
  if (r ->> 'estado') <> 'en_revision' then raise exception 'reporte: %', r; end if;

  r := public.reportar_pago(v_id, '123456', null);
  if not (r ->> 'ya_reportado')::boolean then raise exception 'reporte repetido: %', r; end if;

  -- Otra intención no puede usar la misma referencia reportada.
  r := public.crear_intencion_pago('pago_movil', 'manual', 10, '{}'::jsonb, null, 1000, 100, now() + interval '30 minutes');
  v_otro := (r -> 'pago' ->> 'id')::uuid;
  insert into _ctx values ('pago_duplicado', v_otro::text);

  begin
    perform public.reportar_pago(v_otro, '123456', null);
    raise exception 'permitió una referencia duplicada' using errcode = 'ZZ999';
  exception when unique_violation then
    null;
  end;

  -- Otro usuario no puede reportar ni cancelar una intención ajena.
  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  begin
    perform public.reportar_pago(v_id, '654321', null);
    raise exception 'otro usuario reportó un pago ajeno' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.cancelar_pago(v_id);
    raise exception 'otro usuario canceló un pago ajeno' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;

  -- El dueño sí puede cancelar la intención que quedó pendiente.
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.cancelar_pago(v_otro);
  if not (r ->> 'ok')::boolean then raise exception 'cancelar: %', r; end if;
  begin
    perform public.reportar_pago(v_otro, '999999', null);
    raise exception 'reportó una intención cancelada' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;
\echo 'OK reporte, referencia duplicada, permisos y cancelación'

-- 3. El admin confirma y el saldo se acredita una sola vez -------------------
do $$
declare
  r jsonb;
  v_id uuid := (select valor from _ctx where nombre = 'pago_movil')::uuid;
  v_tx public.transacciones_billetera%rowtype;
  v_movs int;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

  r := public.confirmar_pago_admin(v_id);
  if not (r ->> 'ok')::boolean then raise exception 'confirmar admin: %', r; end if;
  if (r ->> 'estado') <> 'confirmado' then raise exception 'estado confirmado: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 10 then raise exception 'saldo: %', r; end if;

  select * into v_tx from public.transacciones_billetera
   where id = (r ->> 'transaccion_id')::uuid;
  if v_tx.estado <> 'aprobada' or v_tx.metodo <> 'pago_movil' then
    raise exception 'transacción: %', row_to_json(v_tx);
  end if;
  if v_tx.banco <> 'Banesco' or v_tx.referencia <> '123456' then
    raise exception 'datos bancarios: % / %', v_tx.banco, v_tx.referencia;
  end if;
  if v_tx.billetera <> 'piloto' or v_tx.monto_usd <> 10 then
    raise exception 'billetera o monto: % / %', v_tx.billetera, v_tx.monto_usd;
  end if;
  if v_tx.aprobada_por <> '33333333-3333-3333-3333-333333333333' then
    raise exception 'aprobada_por: %', v_tx.aprobada_por;
  end if;

  if (select estado from public.conductores_detalles
       where usuario_id = '11111111-1111-1111-1111-111111111111') <> 'activo' then
    raise exception 'el piloto no se reactivó al confirmar el pago';
  end if;

  r := public.confirmar_pago_admin(v_id);
  if not (r ->> 'ya_confirmado')::boolean then raise exception 'idempotencia: %', r; end if;

  select count(*) into v_movs from public.transacciones_billetera
   where usuario_id = '11111111-1111-1111-1111-111111111111' and tipo = 'recarga';
  if v_movs <> 1 then raise exception 'recargas duplicadas: %', v_movs; end if;
  if (select saldo_billetera from public.usuarios
       where id = '11111111-1111-1111-1111-111111111111') <> 10 then
    raise exception 'el saldo se acreditó dos veces';
  end if;

  -- El dueño ve su pago; la referencia reportada se conserva.
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  r := public.mis_pagos();
  if not exists (
    select 1 from jsonb_array_elements(r) e
     where e ->> 'estado' = 'confirmado'
       and e ->> 'referencia_reportada' = '123456'
  ) then
    raise exception 'mis_pagos: %', r;
  end if;
end $$;
\echo 'OK confirmación administrativa e idempotencia'

-- 4. Confirmación automática con la clave de servidor ------------------------
do $$
declare
  r jsonb;
  v_id uuid;
  v_codigo text;
  v_saldo numeric;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  r := public.crear_intencion_pago(
    'binance_pay', 'binance_pay', 20, '{"tipo":"binance_pay"}'::jsonb,
    null, null, null, now() + interval '30 minutes'
  );
  v_id := (r -> 'pago' ->> 'id')::uuid;
  v_codigo := r -> 'pago' ->> 'codigo';
  insert into _ctx values ('pago_binance', v_id::text), ('codigo_binance', v_codigo);

  -- Clave incorrecta: no confirma.
  begin
    perform public.confirmar_pago(v_codigo, 'clave-incorrecta-000000000000', 'PREPAY-1', '{}'::jsonb, 20);
    raise exception 'confirmó con clave incorrecta' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;

  -- La API llama como anon; solo la clave de servidor la autoriza.
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set role anon;
  r := public.confirmar_pago(
    v_codigo,
    'clave-servidor-de-prueba-0123456789abcdef',
    'PREPAY-1',
    '{"binance_biz_id":"BZ-1"}'::jsonb,
    20
  );
  reset role;
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  if not (r ->> 'ok')::boolean then raise exception 'confirmar binance: %', r; end if;
  if (r ->> 'saldo_billetera')::numeric <> 30 then raise exception 'saldo binance: %', r; end if;
  if not (r ->> 'ya_confirmado')::boolean is false then raise exception 'ya_confirmado: %', r; end if;

  if not exists (
    select 1 from public.transacciones_billetera
     where usuario_id = '11111111-1111-1111-1111-111111111111'
       and metodo = 'binance_pay' and banco = 'Binance'
       and referencia = 'PREPAY-1' and monto_usd = 20 and estado = 'aprobada'
  ) then
    raise exception 'no registró la recarga de Binance';
  end if;

  r := public.confirmar_pago(
    v_codigo,
    'clave-servidor-de-prueba-0123456789abcdef',
    'PREPAY-1',
    '{}'::jsonb,
    20
  );
  if not (r ->> 'ya_confirmado')::boolean then raise exception 'binance idempotente: %', r; end if;

  select saldo_billetera into v_saldo from public.usuarios
   where id = '11111111-1111-1111-1111-111111111111';
  if v_saldo <> 30 then raise exception 'saldo tras reintento: %', v_saldo; end if;

  -- Monto distinto al de la intención: no confirma y queda pendiente.
  r := public.crear_intencion_pago(
    'binance_pay', 'binance_pay', 5, '{}'::jsonb,
    null, null, null, now() + interval '30 minutes'
  );
  insert into _ctx values ('pago_monto', (r -> 'pago' ->> 'id')::text), ('codigo_monto', r -> 'pago' ->> 'codigo');
  begin
    perform public.confirmar_pago(
      r -> 'pago' ->> 'codigo',
      'clave-servidor-de-prueba-0123456789abcdef',
      'PREPAY-2',
      '{}'::jsonb,
      4.5
    );
    raise exception 'confirmó con monto distinto' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
  if (select estado from public.pagos where id = (r -> 'pago' ->> 'id')::uuid) <> 'pendiente' then
    raise exception 'el pago con monto distinto no quedó pendiente';
  end if;
end $$;
\echo 'OK confirmación automática, clave e idempotencia'

-- 5. Expiración y rechazo ---------------------------------------------------
do $$
declare
  r jsonb;
  v_id uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  -- Intención vencida: se marca expirada y no se puede reportar.
  r := public.crear_intencion_pago('pago_movil', 'manual', 5, '{}'::jsonb, null, 500, 100, now() + interval '3 minutes');
  v_id := (r -> 'pago' ->> 'id')::uuid;
  update public.pagos set expira_en = now() - interval '1 second' where id = v_id;
  r := public.reportar_pago(v_id, '777777', null);
  if (r ->> 'ok')::boolean or (r ->> 'motivo') <> 'pago_expirado' then
    raise exception 'reportó una intención vencida: %', r;
  end if;
  if (select estado from public.pagos where id = v_id) <> 'expirado' then
    raise exception 'la intención vencida no quedó expirada';
  end if;

  -- Rechazo administrativo con motivo obligatorio.
  r := public.crear_intencion_pago('pago_movil', 'manual', 5, '{}'::jsonb, null, 500, 100, now() + interval '30 minutes');
  v_id := (r -> 'pago' ->> 'id')::uuid;
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  begin
    perform public.rechazar_pago(v_id, 'no');
    raise exception 'rechazó sin motivo válido' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
  r := public.rechazar_pago(v_id, 'La referencia no aparece en el banco');
  if not (r ->> 'ok')::boolean or (r ->> 'estado') <> 'rechazado' then
    raise exception 'rechazo: %', r;
  end if;
  r := public.rechazar_pago(v_id, 'La referencia no aparece en el banco');
  if (r ->> 'ok')::boolean then raise exception 'rechazo repetido: %', r; end if;
end $$;
\echo 'OK expiración y rechazo'

-- 6. Pasajero, límites y RLS ------------------------------------------------
do $$
declare
  r jsonb;
  v_id uuid;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);

  -- El pasajero no tiene el mínimo de 5 USD del piloto.
  r := public.crear_intencion_pago('pago_movil', 'manual', 1, '{}'::jsonb, null, 100, 100, now() + interval '30 minutes');
  if not (r ->> 'ok')::boolean then raise exception 'intención del pasajero: %', r; end if;
  if (r -> 'pago' ->> 'billetera') <> 'pasajero' then raise exception 'billetera pasajero: %', r; end if;
  v_id := (r -> 'pago' ->> 'id')::uuid;
  r := public.cancelar_pago(v_id);
  if not (r ->> 'ok')::boolean then raise exception 'cancelar pasajero: %', r; end if;
end $$;

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);
set role authenticated;

do $$
declare
  n int;
begin
  select count(*) into n from public.pagos where usuario_id <> auth.uid();
  if n <> 0 then raise exception 'RLS pagos: el pasajero ve % ajenos', n; end if;

  select count(*) into n from public.pagos where usuario_id = auth.uid();
  if n <> 1 then raise exception 'RLS pagos: el pasajero debería ver su pago cancelado, ve %', n; end if;

  begin
    insert into public.pagos (usuario_id, metodo, monto_usd, codigo, expira_en)
    values (auth.uid(), 'pago_movil', 5, 'LLG-AAAAAAAAAA', now() + interval '30 minutes');
    raise exception 'el cliente insertó un pago directo' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;

do $$
declare
  total int;
begin
  select count(*) into total from public.pagos;
  if total < 4 then raise exception 'el admin ve % pagos', total; end if;
end $$;

reset role;
\echo 'OK pasajero, límites y RLS'

\echo 'TODAS LAS PRUEBAS DE PAGOS PASARON'
