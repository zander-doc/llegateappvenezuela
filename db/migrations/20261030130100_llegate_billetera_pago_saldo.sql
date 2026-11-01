-- Llégate App · pago de viajes con saldo del cliente
--
-- Flujo: el cliente paga el precio del viaje desde su billetera; el conductor
-- recibe el abono bruto y se le debita la comisión configurada. Las tres
-- filas del libro mayor (pago, abono y comisión) suman exactamente el cambio
-- de saldo de cada usuario.
--
-- Reglas:
--  * Solo el cliente dueño del viaje (o service_role) puede pagarlo.
--  * Solo aplica a viajes con metodo_pago = 'saldo' y en curso.
--  * Es idempotente: repetir la llamada no vuelve a debitar.
--  * Sin saldo suficiente no se toca el viaje ni la billetera.
--  * Un viaje con saldo no puede finalizarse por la vía de efectivo
--    (procesar_comision_viaje): debe pagarse con esta función.

-- ---------------------------------------------------------------------------
-- Integridad del libro mayor
-- ---------------------------------------------------------------------------
alter table public.transacciones_billetera
  add constraint pago_negativo check (tipo <> 'pago' or monto_usd < 0),
  add constraint abono_positivo check (tipo <> 'abono' or monto_usd > 0),
  add constraint pago_metodo_valido check (tipo <> 'pago' or metodo = 'saldo'),
  add constraint abono_metodo_valido check (tipo <> 'abono' or metodo = 'saldo'),
  add constraint pago_con_viaje check (tipo <> 'pago' or viaje_id is not null),
  add constraint abono_con_viaje check (tipo <> 'abono' or viaje_id is not null);

create unique index transacciones_pago_unico_por_viaje
  on public.transacciones_billetera (viaje_id)
  where tipo = 'pago';

create unique index transacciones_abono_unico_por_viaje
  on public.transacciones_billetera (viaje_id)
  where tipo = 'abono';

-- ---------------------------------------------------------------------------
-- Cierre de un viaje con saldo solo con pago confirmado
-- ---------------------------------------------------------------------------
create function public.exigir_pago_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'finalizado'
     and old.estado is distinct from 'finalizado'
     and new.metodo_pago = 'saldo'
     and not exists (
       select 1
         from public.transacciones_billetera
        where viaje_id = new.id
          and tipo = 'pago'
     ) then
    raise exception 'PAGO_CON_SALDO_PENDIENTE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger viajes_exigir_pago_saldo
  before update on public.viajes
  for each row execute function public.exigir_pago_saldo();

-- ---------------------------------------------------------------------------
-- Pago del viaje con saldo del cliente
-- ---------------------------------------------------------------------------
create function public.pagar_viaje_con_saldo(p_viaje_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_servicio boolean := coalesce(auth.role(), '') = 'service_role';
  v_viaje public.viajes%rowtype;
  v_cfg public.configuracion_comisiones%rowtype;
  v_tx_pago public.transacciones_billetera%rowtype;
  v_tx_comision public.transacciones_billetera%rowtype;
  v_saldo_cliente numeric(12, 2);
  v_saldo_conductor numeric(12, 2);
  v_saldo_final_cliente numeric(12, 2);
  v_saldo_final_conductor numeric(12, 2);
  v_comision numeric(12, 2);
begin
  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if not v_es_servicio and v_uid is distinct from v_viaje.cliente_id then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  -- Idempotencia: un viaje ya pagado con saldo devuelve el mismo resultado.
  if v_viaje.estado = 'finalizado' then
    select * into v_tx_pago from public.transacciones_billetera
     where viaje_id = p_viaje_id and tipo = 'pago';
    if not found then
      raise exception 'VIAJE_NO_ES_SALDO' using errcode = 'P0001';
    end if;

    select * into v_tx_comision from public.transacciones_billetera
     where viaje_id = p_viaje_id and tipo = 'comision';

    return jsonb_build_object(
      'ok', true,
      'ya_procesado', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', 'finalizado',
      'precio_usd', v_viaje.precio_usd,
      'comision_usd', v_viaje.comision_usd,
      'neto_conductor', v_viaje.precio_usd - v_viaje.comision_usd,
      'saldo_cliente', coalesce(
        v_tx_pago.saldo_resultante,
        (select saldo_billetera from public.usuarios where id = v_viaje.cliente_id)
      ),
      'saldo_conductor', coalesce(
        v_tx_comision.saldo_resultante,
        (select saldo_billetera from public.usuarios where id = v_viaje.conductor_id)
      )
    );
  end if;

  if v_viaje.metodo_pago <> 'saldo' then
    raise exception 'VIAJE_NO_ES_SALDO' using errcode = 'P0001';
  end if;
  if v_viaje.conductor_id is null then
    raise exception 'VIAJE_SIN_CONDUCTOR' using errcode = 'P0001';
  end if;
  if v_viaje.estado <> 'en_curso' then
    raise exception 'ESTADO_INVALIDO: %', v_viaje.estado using errcode = 'P0001';
  end if;

  select * into v_cfg from public.configuracion_comisiones where id;

  -- Bloquea ambas billeteras en orden estable para evitar interbloqueos.
  if v_viaje.cliente_id < v_viaje.conductor_id then
    select saldo_billetera into v_saldo_cliente
      from public.usuarios where id = v_viaje.cliente_id for update;
    select saldo_billetera into v_saldo_conductor
      from public.usuarios where id = v_viaje.conductor_id for update;
  else
    select saldo_billetera into v_saldo_conductor
      from public.usuarios where id = v_viaje.conductor_id for update;
    select saldo_billetera into v_saldo_cliente
      from public.usuarios where id = v_viaje.cliente_id for update;
  end if;

  if v_saldo_cliente is null then
    raise exception 'CLIENTE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_saldo_conductor is null then
    raise exception 'CONDUCTOR_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if v_saldo_cliente < v_viaje.precio_usd then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'saldo_insuficiente',
      'requiere_recarga', true,
      'viaje_id', p_viaje_id,
      'precio_usd', v_viaje.precio_usd,
      'saldo_cliente', v_saldo_cliente
    );
  end if;

  v_comision := least(
    greatest(round(v_viaje.precio_usd * v_cfg.porcentaje, 2), v_cfg.minimo_usd),
    v_viaje.precio_usd
  );
  v_saldo_final_cliente := v_saldo_cliente - v_viaje.precio_usd;
  v_saldo_final_conductor := v_saldo_conductor + v_viaje.precio_usd - v_comision;

  update public.usuarios
     set saldo_billetera = v_saldo_final_cliente, updated_at = now()
   where id = v_viaje.cliente_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante, nota, created_by
  )
  values (
    v_viaje.cliente_id,
    p_viaje_id,
    'pago',
    'aprobada',
    'saldo',
    -v_viaje.precio_usd,
    v_saldo_final_cliente,
    format('Pago con saldo del viaje %s → %s', v_viaje.origen, v_viaje.destino),
    coalesce(v_uid, v_viaje.cliente_id)
  );

  update public.usuarios
     set saldo_billetera = v_saldo_conductor + v_viaje.precio_usd, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'abono',
    'aprobada',
    'saldo',
    v_viaje.precio_usd,
    v_saldo_conductor + v_viaje.precio_usd,
    format('Abono del viaje %s → %s', v_viaje.origen, v_viaje.destino),
    coalesce(v_uid, v_viaje.cliente_id)
  );

  update public.usuarios
     set saldo_billetera = v_saldo_final_conductor, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'comision',
    'aprobada',
    'saldo',
    -v_comision,
    v_saldo_final_conductor,
    format('Comisión %s%% del viaje pagado con saldo', round(v_cfg.porcentaje * 100, 2)),
    coalesce(v_uid, v_viaje.conductor_id)
  );

  perform set_config('llegate.finalizando', 'on', true);
  update public.viajes
     set estado = 'finalizado',
         comision_usd = v_comision,
         comision_porcentaje = v_cfg.porcentaje,
         finalizado_en = now(),
         updated_at = now()
   where id = p_viaje_id;
  perform set_config('llegate.finalizando', 'off', true);

  update public.conductores_detalles
     set estado = case
                    when v_saldo_final_conductor < v_cfg.minimo_usd then 'inactivo_sin_saldo'
                    else estado
                  end,
         updated_at = now()
   where usuario_id = v_viaje.conductor_id
     and estado = 'activo';

  return jsonb_build_object(
    'ok', true,
    'ya_procesado', false,
    'viaje_id', p_viaje_id,
    'estado_viaje', 'finalizado',
    'precio_usd', v_viaje.precio_usd,
    'comision_usd', v_comision,
    'neto_conductor', v_viaje.precio_usd - v_comision,
    'saldo_cliente', v_saldo_final_cliente,
    'saldo_conductor', v_saldo_final_conductor,
    'conductor_activo', v_saldo_final_conductor >= v_cfg.minimo_usd
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Evitar que un viaje con saldo se cierre por la vía de efectivo
-- ---------------------------------------------------------------------------
create or replace function public.procesar_comision_viaje(p_viaje_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_servicio boolean := coalesce(auth.role(), '') = 'service_role';
  v_viaje public.viajes%rowtype;
  v_cfg public.configuracion_comisiones%rowtype;
  v_tx public.transacciones_billetera%rowtype;
  v_comision numeric(12, 2);
  v_saldo numeric(12, 2);
  v_saldo_final numeric(12, 2);
begin
  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_viaje.conductor_id is null then
    raise exception 'VIAJE_SIN_CONDUCTOR' using errcode = 'P0001';
  end if;
  if not v_es_servicio and v_uid is distinct from v_viaje.conductor_id then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  -- Un viaje pagado con saldo solo cierra con pagar_viaje_con_saldo.
  if v_viaje.metodo_pago = 'saldo' and v_viaje.estado <> 'finalizado' then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'pago_con_saldo_pendiente',
      'requiere_pago_cliente', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', v_viaje.estado
    );
  end if;

  -- Idempotencia: si ya se cobró, devolver el mismo resultado sin volver a debitar.
  if v_viaje.estado = 'finalizado' then
    select * into v_tx from public.transacciones_billetera
    where viaje_id = p_viaje_id and tipo = 'comision';
    return jsonb_build_object(
      'ok', true,
      'ya_procesado', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', 'finalizado',
      'comision_usd', v_viaje.comision_usd,
      'saldo_billetera', coalesce(
        v_tx.saldo_resultante,
        (select saldo_billetera from public.usuarios where id = v_viaje.conductor_id)
      )
    );
  end if;

  if v_viaje.estado not in ('aceptado', 'en_curso') then
    raise exception 'ESTADO_INVALIDO: %', v_viaje.estado using errcode = 'P0001';
  end if;

  select * into v_cfg from public.configuracion_comisiones where id;

  v_comision := least(
    greatest(round(v_viaje.precio_usd * v_cfg.porcentaje, 2), v_cfg.minimo_usd),
    v_viaje.precio_usd
  );

  select saldo_billetera into v_saldo from public.usuarios
  where id = v_viaje.conductor_id
  for update;

  if not found then
    raise exception 'CONDUCTOR_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  -- Sin saldo suficiente no se permite dejar el saldo negativo. El viaje queda
  -- abierto y el conductor pasa a inactivo; puede recargar y reintentar.
  if v_saldo < v_comision then
    update public.conductores_detalles
       set estado = 'inactivo_sin_saldo', updated_at = now()
     where usuario_id = v_viaje.conductor_id and estado <> 'bloqueado';

    return jsonb_build_object(
      'ok', false,
      'motivo', 'saldo_insuficiente',
      'requiere_recarga', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', v_viaje.estado,
      'comision_usd', v_comision,
      'saldo_billetera', v_saldo
    );
  end if;

  v_saldo_final := v_saldo - v_comision;

  update public.usuarios
     set saldo_billetera = v_saldo_final, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'comision',
    'aprobada',
    'saldo',
    -v_comision,
    v_saldo_final,
    format('Comisión %s%% del viaje', round(v_cfg.porcentaje * 100, 2)),
    v_viaje.conductor_id
  );

  perform set_config('llegate.finalizando', 'on', true);
  update public.viajes
     set estado = 'finalizado',
         comision_usd = v_comision,
         comision_porcentaje = v_cfg.porcentaje,
         finalizado_en = now(),
         updated_at = now()
   where id = p_viaje_id;
  perform set_config('llegate.finalizando', 'off', true);

  update public.conductores_detalles
     set estado = case when v_saldo_final < v_cfg.minimo_usd then 'inactivo_sin_saldo' else estado end,
         updated_at = now()
   where usuario_id = v_viaje.conductor_id and estado = 'activo';

  return jsonb_build_object(
    'ok', true,
    'ya_procesado', false,
    'viaje_id', p_viaje_id,
    'estado_viaje', 'finalizado',
    'comision_usd', v_comision,
    'saldo_billetera', v_saldo_final,
    'conductor_activo', v_saldo_final >= v_cfg.minimo_usd
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Recargas: referencias con formato verificable
-- ---------------------------------------------------------------------------
create or replace function public.reportar_recarga(
  p_metodo public.metodo_pago,
  p_monto_usd numeric,
  p_banco text,
  p_referencia text,
  p_comprobante_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_banco text := btrim(coalesce(p_banco, ''));
  v_referencia text := btrim(coalesce(p_referencia, ''));
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_metodo not in ('pago_movil', 'binance_pay') then
    raise exception 'METODO_NO_PERMITIDO' using errcode = 'P0001';
  end if;
  if p_monto_usd is null or p_monto_usd <= 0 or p_monto_usd > 10000 then
    raise exception 'MONTO_INVALIDO' using errcode = 'P0001';
  end if;
  if char_length(v_banco) < 3 or char_length(v_banco) > 60 then
    raise exception 'DATOS_PAGO_INCOMPLETOS' using errcode = 'P0001';
  end if;
  if p_metodo = 'pago_movil' and v_referencia !~ '^[0-9]{6,12}$' then
    raise exception 'REFERENCIA_INVALIDA' using errcode = 'P0001';
  end if;
  if p_metodo = 'binance_pay' and v_referencia !~ '^[A-Za-z0-9-]{6,64}$' then
    raise exception 'REFERENCIA_INVALIDA' using errcode = 'P0001';
  end if;

  begin
    insert into public.transacciones_billetera (
      usuario_id, tipo, estado, metodo, monto_usd, banco, referencia, comprobante_url, nota, created_by
    )
    values (
      v_uid, 'recarga', 'pendiente', p_metodo, p_monto_usd, v_banco, v_referencia,
      nullif(btrim(coalesce(p_comprobante_url, '')), ''),
      'Recarga reportada por el usuario, pendiente de aprobación', v_uid
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'REFERENCIA_DUPLICADA' using errcode = '23505';
  end;

  return jsonb_build_object(
    'ok', true,
    'transaccion_id', v_id,
    'estado', 'pendiente',
    'metodo', p_metodo,
    'monto_usd', p_monto_usd
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on function public.pagar_viaje_con_saldo(uuid) from public, anon;
grant execute on function public.pagar_viaje_con_saldo(uuid) to authenticated, service_role;

revoke all on function public.exigir_pago_saldo() from public, anon, authenticated, service_role;
