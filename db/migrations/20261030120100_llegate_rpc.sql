-- Llégate App · RPCs transaccionales
-- Toda operación que mueve dinero o cambia el estado operativo del conductor
-- pasa por estas funciones security definer. El cliente nunca envía el monto
-- de la comisión: se calcula aquí desde configuración_comisiones.

-- ---------------------------------------------------------------------------
-- Reporte de recarga (Pago Móvil / Binance Pay) → queda pendiente de aprobación
-- ---------------------------------------------------------------------------
create function public.reportar_recarga(
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
  if char_length(v_banco) < 3 or char_length(v_referencia) < 4 then
    raise exception 'DATOS_PAGO_INCOMPLETOS' using errcode = 'P0001';
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
-- Aprobación / rechazo de recargas (solo admin o service_role)
-- ---------------------------------------------------------------------------
create function public.aprobar_recarga(p_transaccion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx public.transacciones_billetera%rowtype;
  v_cfg public.configuracion_comisiones%rowtype;
  v_saldo numeric(12, 2);
  v_nuevo_saldo numeric(12, 2);
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_tx from public.transacciones_billetera where id = p_transaccion_id for update;
  if not found then
    raise exception 'TRANSACCION_NO_ENCONTRADA' using errcode = 'P0002';
  end if;
  if v_tx.tipo <> 'recarga' then
    raise exception 'TRANSACCION_NO_ES_RECARGA' using errcode = 'P0001';
  end if;
  if v_tx.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', 'ya_procesada', 'estado', v_tx.estado);
  end if;

  select saldo_billetera into v_saldo from public.usuarios where id = v_tx.usuario_id for update;
  if not found then
    raise exception 'USUARIO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  v_nuevo_saldo := v_saldo + v_tx.monto_usd;

  update public.usuarios
     set saldo_billetera = v_nuevo_saldo, updated_at = now()
   where id = v_tx.usuario_id;

  update public.transacciones_billetera
     set estado = 'aprobada',
         saldo_resultante = v_nuevo_saldo,
         aprobada_por = case when coalesce(auth.role(), '') = 'service_role' then null else v_uid end,
         aprobada_en = now()
   where id = v_tx.id;

  select * into v_cfg from public.configuracion_comisiones where id;

  update public.conductores_detalles
     set estado = 'activo', updated_at = now()
   where usuario_id = v_tx.usuario_id
     and verificacion = 'aprobado'
     and estado = 'inactivo_sin_saldo'
     and v_nuevo_saldo >= v_cfg.minimo_usd;

  return jsonb_build_object(
    'ok', true,
    'transaccion_id', v_tx.id,
    'usuario_id', v_tx.usuario_id,
    'monto_usd', v_tx.monto_usd,
    'saldo_billetera', v_nuevo_saldo
  );
end;
$$;

create function public.rechazar_recarga(p_transaccion_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx public.transacciones_billetera%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if char_length(v_motivo) < 3 then
    raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
  end if;

  select * into v_tx from public.transacciones_billetera where id = p_transaccion_id for update;
  if not found then
    raise exception 'TRANSACCION_NO_ENCONTRADA' using errcode = 'P0002';
  end if;
  if v_tx.tipo <> 'recarga' or v_tx.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', 'no_pendiente', 'estado', v_tx.estado);
  end if;

  update public.transacciones_billetera
     set estado = 'rechazada',
         motivo_rechazo = v_motivo,
         aprobada_por = case when coalesce(auth.role(), '') = 'service_role' then null else v_uid end,
         aprobada_en = now()
   where id = v_tx.id;

  return jsonb_build_object('ok', true, 'transaccion_id', v_tx.id, 'estado', 'rechazada');
end;
$$;

-- ---------------------------------------------------------------------------
-- Verificación de conductores (solo admin o service_role)
-- ---------------------------------------------------------------------------
create function public.verificar_conductor(
  p_usuario_id uuid,
  p_aprobado boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_detalle public.conductores_detalles%rowtype;
  v_cfg public.configuracion_comisiones%rowtype;
  v_saldo numeric(12, 2);
  v_estado public.estado_conductor;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_detalle from public.conductores_detalles where usuario_id = p_usuario_id for update;
  if not found then
    raise exception 'CONDUCTOR_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if p_aprobado then
    if v_detalle.verificacion = 'aprobado' then
      return jsonb_build_object('ok', true, 'ya_verificado', true, 'estado', v_detalle.estado);
    end if;

    select saldo_billetera into v_saldo from public.usuarios where id = p_usuario_id;
    select * into v_cfg from public.configuracion_comisiones where id;
    v_estado := case when coalesce(v_saldo, 0) >= v_cfg.minimo_usd then 'activo' else 'inactivo_sin_saldo' end;

    update public.conductores_detalles
       set verificacion = 'aprobado',
           motivo_rechazo = null,
           estado = v_estado,
           verificado_por = v_uid,
           verificado_en = now(),
           updated_at = now()
     where usuario_id = p_usuario_id;
  else
    if char_length(v_motivo) < 3 then
      raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
    end if;

    v_estado := 'inactivo_sin_saldo';
    update public.conductores_detalles
       set verificacion = 'rechazado',
           motivo_rechazo = v_motivo,
           estado = v_estado,
           verificado_por = v_uid,
           verificado_en = now(),
           updated_at = now()
     where usuario_id = p_usuario_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'usuario_id', p_usuario_id,
    'verificacion', case when p_aprobado then 'aprobado' else 'rechazado' end,
    'estado', v_estado
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Flujo del viaje: aceptar → iniciar → procesar comisión
-- ---------------------------------------------------------------------------
create function public.aceptar_viaje(p_viaje_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_viaje public.viajes%rowtype;
  v_detalle public.conductores_detalles%rowtype;
  v_cfg public.configuracion_comisiones%rowtype;
  v_saldo numeric(12, 2);
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_viaje.estado <> 'solicitado' then
    return jsonb_build_object('ok', false, 'motivo', 'viaje_no_disponible', 'estado', v_viaje.estado);
  end if;

  select * into v_detalle from public.conductores_detalles where usuario_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'conductor_no_registrado');
  end if;
  if v_detalle.verificacion <> 'aprobado' then
    return jsonb_build_object('ok', false, 'motivo', 'conductor_no_verificado', 'verificacion', v_detalle.verificacion);
  end if;
  if v_detalle.estado = 'bloqueado' then
    return jsonb_build_object('ok', false, 'motivo', 'conductor_bloqueado');
  end if;
  if exists (
    select 1 from public.viajes
    where conductor_id = v_uid and estado in ('aceptado', 'en_curso')
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'viaje_activo');
  end if;

  select * into v_cfg from public.configuracion_comisiones where id;
  select saldo_billetera into v_saldo from public.usuarios where id = v_uid for update;

  if coalesce(v_saldo, 0) < v_cfg.minimo_usd then
    update public.conductores_detalles
       set estado = 'inactivo_sin_saldo', updated_at = now()
     where usuario_id = v_uid and estado = 'activo';
    return jsonb_build_object(
      'ok', false,
      'motivo', 'saldo_insuficiente',
      'requiere_recarga', true,
      'saldo_billetera', coalesce(v_saldo, 0),
      'minimo_usd', v_cfg.minimo_usd
    );
  end if;

  if v_detalle.estado = 'inactivo_sin_saldo' then
    update public.conductores_detalles
       set estado = 'activo', updated_at = now()
     where usuario_id = v_uid;
  end if;

  update public.viajes
     set conductor_id = v_uid,
         estado = 'aceptado',
         aceptado_en = now(),
         updated_at = now()
   where id = p_viaje_id;

  return jsonb_build_object('ok', true, 'viaje_id', p_viaje_id, 'estado', 'aceptado', 'saldo_billetera', v_saldo);
end;
$$;

create function public.iniciar_viaje(p_viaje_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_viaje public.viajes%rowtype;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_viaje.conductor_id is distinct from v_uid then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if v_viaje.estado <> 'aceptado' then
    return jsonb_build_object('ok', false, 'motivo', 'estado_invalido', 'estado', v_viaje.estado);
  end if;

  update public.viajes
     set estado = 'en_curso', iniciado_en = now(), updated_at = now()
   where id = p_viaje_id;

  return jsonb_build_object('ok', true, 'viaje_id', p_viaje_id, 'estado', 'en_curso');
end;
$$;

-- ---------------------------------------------------------------------------
-- Comisión del viaje (operación atómica e idempotente)
-- Regla: comisión = mayor entre (porcentaje × precio) y el mínimo configurado,
-- nunca superior al precio del viaje.
-- ---------------------------------------------------------------------------
create function public.procesar_comision_viaje(p_viaje_id uuid)
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
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on function public.es_admin(uuid) from public, anon;
grant execute on function public.es_admin(uuid) to authenticated, service_role;

revoke all on function public.reportar_recarga(public.metodo_pago, numeric, text, text, text) from public, anon;
grant execute on function public.reportar_recarga(public.metodo_pago, numeric, text, text, text) to authenticated, service_role;

revoke all on function public.aprobar_recarga(uuid) from public, anon;
grant execute on function public.aprobar_recarga(uuid) to authenticated, service_role;

revoke all on function public.rechazar_recarga(uuid, text) from public, anon;
grant execute on function public.rechazar_recarga(uuid, text) to authenticated, service_role;

revoke all on function public.verificar_conductor(uuid, boolean, text) from public, anon;
grant execute on function public.verificar_conductor(uuid, boolean, text) to authenticated, service_role;

revoke all on function public.aceptar_viaje(uuid) from public, anon;
grant execute on function public.aceptar_viaje(uuid) to authenticated, service_role;

revoke all on function public.iniciar_viaje(uuid) from public, anon;
grant execute on function public.iniciar_viaje(uuid) to authenticated, service_role;

revoke all on function public.procesar_comision_viaje(uuid) from public, anon;
grant execute on function public.procesar_comision_viaje(uuid) to authenticated, service_role;
