-- Llégate App · billetera prepago del piloto
--
-- El piloto (mototaxi, taxi pana y delivery) no paga mensualidad: recarga saldo
-- y la comisión se descuenta por viaje completado. Reglas del piloto:
--
--  * Billetera separada: el piloto usa su saldo prepago; el pasajero usa el
--    saldo de su billetera. Los roles son exclusivos (un conductor no crea
--    viajes como cliente), así que nunca se mezclan. La columna `billetera`
--    del libro mayor deja explícito a qué billetera pertenece cada movimiento.
--  * Sin mensualidad, sin bonos promocionales, sin vencimiento y sin saldo
--    negativo. El saldo de bienvenida ($2) se acredita una sola vez al aprobar
--    la verificación.
--  * Al aceptar un viaje se reserva la comisión; el saldo disponible es
--    saldo − reservas. Al completar se captura (se debita) y al cancelar se
--    libera. Un viaje ya aceptado siempre se puede completar.
--  * Recargas del piloto entre $5 y $50, con aprobación manual y un SLA
--    objetivo de 15 minutos.

-- ---------------------------------------------------------------------------
-- Configuración del prepago
-- ---------------------------------------------------------------------------
alter table public.configuracion_comisiones
  add column saldo_minimo_usd numeric(12, 2) not null default 1.00
    check (saldo_minimo_usd > 0),
  add column alerta_saldo_bajo_usd numeric(12, 2) not null default 2.00
    check (alerta_saldo_bajo_usd >= saldo_minimo_usd),
  add column recarga_minima_usd numeric(12, 2) not null default 5.00
    check (recarga_minima_usd > 0),
  add column recarga_maxima_usd numeric(12, 2) not null default 50.00
    check (recarga_maxima_usd >= recarga_minima_usd),
  add column sla_aprobacion_minutos integer not null default 15
    check (sla_aprobacion_minutos between 1 and 1440),
  add column bienvenida_usd numeric(12, 2) not null default 2.00
    check (bienvenida_usd between 0 and 10);

comment on column public.configuracion_comisiones.saldo_minimo_usd is
  'Saldo disponible mínimo para recibir viajes (USD).';
comment on column public.configuracion_comisiones.alerta_saldo_bajo_usd is
  'Umbral de aviso de saldo bajo (USD). No bloquea viajes en curso.';
comment on column public.configuracion_comisiones.recarga_minima_usd is
  'Recarga mínima del piloto (USD).';
comment on column public.configuracion_comisiones.recarga_maxima_usd is
  'Recarga máxima del piloto (USD).';
comment on column public.configuracion_comisiones.sla_aprobacion_minutos is
  'Tiempo objetivo para aprobar una recarga manual.';
comment on column public.configuracion_comisiones.bienvenida_usd is
  'Saldo de bienvenida acreditado una sola vez al verificar al piloto.';

-- ---------------------------------------------------------------------------
-- Billetera explícita en el libro mayor
-- ---------------------------------------------------------------------------
alter table public.transacciones_billetera
  add column billetera text not null default 'pasajero'
    check (billetera in ('pasajero', 'piloto'));

update public.transacciones_billetera t
   set billetera = 'piloto'
 where exists (
   select 1 from public.conductores_detalles d where d.usuario_id = t.usuario_id
 );

comment on column public.transacciones_billetera.billetera is
  'pasajero = saldo para pagar viajes; piloto = saldo prepago de comisiones.';

-- ---------------------------------------------------------------------------
-- Bienvenida acreditada una sola vez
-- ---------------------------------------------------------------------------
alter table public.conductores_detalles
  add column bienvenida_acreditada boolean not null default false;

-- ---------------------------------------------------------------------------
-- Reservas de comisión
-- ---------------------------------------------------------------------------
create table public.reservas_comision (
  id uuid primary key default gen_random_uuid(),
  viaje_id uuid not null unique references public.viajes (id) on delete cascade,
  conductor_id uuid not null references public.usuarios (id) on delete cascade,
  monto_usd numeric(12, 2) not null check (monto_usd > 0),
  estado text not null default 'reservada'
    check (estado in ('reservada', 'capturada', 'liberada')),
  motivo text,
  creada_en timestamptz not null default now(),
  capturada_en timestamptz,
  liberada_en timestamptz,
  constraint reserva_capturada_con_fecha check (estado <> 'capturada' or capturada_en is not null),
  constraint reserva_liberada_con_fecha check (estado <> 'liberada' or liberada_en is not null)
);

create index reservas_conductor_activas_idx
  on public.reservas_comision (conductor_id)
  where estado = 'reservada';

alter table public.reservas_comision enable row level security;

create policy "reservas_ver_propia_o_admin"
  on public.reservas_comision for select to authenticated
  using (conductor_id = auth.uid() or public.es_admin());

revoke all on public.reservas_comision from anon, authenticated;
grant select on public.reservas_comision to authenticated;
grant select, insert, update, delete on public.reservas_comision to service_role;

-- ---------------------------------------------------------------------------
-- Comisión estándar calculada desde configuración
-- ---------------------------------------------------------------------------
create function public.comision_para(p_precio numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(
           greatest(round(p_precio * c.porcentaje, 2), c.minimo_usd),
           p_precio
         )
    from public.configuracion_comisiones c
   where c.id;
$$;

revoke all on function public.comision_para(numeric) from public, anon;
grant execute on function public.comision_para(numeric) to service_role;

-- ---------------------------------------------------------------------------
-- Estado de la billetera del usuario autenticado
-- ---------------------------------------------------------------------------
create function public.mi_billetera()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.configuracion_comisiones%rowtype;
  v_saldo numeric(12, 2);
  v_reservado numeric(12, 2);
  v_disponible numeric(12, 2);
  v_es_piloto boolean;
  v_estado_conductor public.estado_conductor;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select saldo_billetera into v_saldo from public.usuarios where id = v_uid;
  if not found then
    raise exception 'USUARIO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  select coalesce(sum(monto_usd), 0) into v_reservado
    from public.reservas_comision
   where conductor_id = v_uid and estado = 'reservada';

  select d.estado into v_estado_conductor
    from public.conductores_detalles d
   where d.usuario_id = v_uid;
  v_es_piloto := found;

  select * into v_cfg from public.configuracion_comisiones where id;
  v_disponible := greatest(v_saldo - v_reservado, 0);

  return jsonb_build_object(
    'billetera', case when v_es_piloto then 'piloto' else 'pasajero' end,
    'saldo_billetera', v_saldo,
    'reservado_usd', v_reservado,
    'disponible_usd', v_disponible,
    'estado_billetera', case
      when v_disponible <= 0 then 'sin_saldo'
      when v_disponible < v_cfg.alerta_saldo_bajo_usd then 'saldo_bajo'
      else 'activo'
    end,
    'conductor_estado', v_estado_conductor,
    'limites', jsonb_build_object(
      'comision_porcentaje', v_cfg.porcentaje,
      'comision_minima_usd', v_cfg.minimo_usd,
      'saldo_minimo_usd', v_cfg.saldo_minimo_usd,
      'alerta_saldo_bajo_usd', v_cfg.alerta_saldo_bajo_usd,
      'recarga_minima_usd', v_cfg.recarga_minima_usd,
      'recarga_maxima_usd', v_cfg.recarga_maxima_usd,
      'sla_aprobacion_minutos', v_cfg.sla_aprobacion_minutos,
      'bienvenida_usd', v_cfg.bienvenida_usd
    )
  );
end;
$$;

revoke all on function public.mi_billetera() from public, anon;
grant execute on function public.mi_billetera() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Aceptar un viaje: valida saldo disponible y reserva la comisión
-- ---------------------------------------------------------------------------
create or replace function public.aceptar_viaje(p_viaje_id uuid)
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
  v_reservado numeric(12, 2);
  v_disponible numeric(12, 2);
  v_comision numeric(12, 2);
  v_requerido numeric(12, 2);
  v_reserva_id uuid;
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

  -- Serializa la validación de saldo y reserva por piloto.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select * into v_cfg from public.configuracion_comisiones where id;
  select saldo_billetera into v_saldo from public.usuarios where id = v_uid for update;

  select coalesce(sum(monto_usd), 0) into v_reservado
    from public.reservas_comision
   where conductor_id = v_uid and estado = 'reservada';

  v_disponible := coalesce(v_saldo, 0) - v_reservado;
  v_comision := public.comision_para(v_viaje.precio_usd);
  v_requerido := greatest(v_cfg.saldo_minimo_usd, v_comision);

  if v_disponible < v_requerido then
    update public.conductores_detalles
       set estado = 'inactivo_sin_saldo', updated_at = now()
     where usuario_id = v_uid and estado = 'activo';

    return jsonb_build_object(
      'ok', false,
      'motivo', 'saldo_insuficiente',
      'requiere_recarga', true,
      'saldo_billetera', coalesce(v_saldo, 0),
      'reservado_usd', v_reservado,
      'disponible_usd', greatest(v_disponible, 0),
      'minimo_usd', v_cfg.saldo_minimo_usd,
      'comision_usd', v_comision,
      'faltante_usd', greatest(v_requerido - v_disponible, 0),
      'recarga_minima_usd', v_cfg.recarga_minima_usd
    );
  end if;

  insert into public.reservas_comision (viaje_id, conductor_id, monto_usd)
  values (p_viaje_id, v_uid, v_comision)
  returning id into v_reserva_id;

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

  return jsonb_build_object(
    'ok', true,
    'viaje_id', p_viaje_id,
    'estado', 'aceptado',
    'saldo_billetera', v_saldo,
    'reservado_usd', v_reservado + v_comision,
    'disponible_usd', greatest(v_disponible - v_comision, 0),
    'comision_usd', v_comision,
    'reserva_id', v_reserva_id,
    'billetera', 'piloto'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar un viaje: libera la reserva
-- ---------------------------------------------------------------------------
create function public.cancelar_viaje(p_viaje_id uuid, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_servicio boolean := coalesce(auth.role(), '') = 'service_role';
  v_viaje public.viajes%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if not v_es_servicio
     and v_uid is distinct from v_viaje.cliente_id
     and v_uid is distinct from v_viaje.conductor_id then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  if v_viaje.estado in ('finalizado', 'cancelado') then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'estado_invalido',
      'viaje_id', p_viaje_id,
      'estado', v_viaje.estado
    );
  end if;

  update public.viajes
     set estado = 'cancelado',
         cancelado_en = now(),
         updated_at = now()
   where id = p_viaje_id;

  return jsonb_build_object(
    'ok', true,
    'viaje_id', p_viaje_id,
    'estado', 'cancelado',
    'reserva_liberada', exists (
      select 1 from public.reservas_comision
       where viaje_id = p_viaje_id and estado = 'liberada'
    ),
    'motivo', nullif(v_motivo, '')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Liberar la reserva cuando el viaje se cancela
-- ---------------------------------------------------------------------------
create function public.liberar_reserva_viaje()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva public.reservas_comision%rowtype;
  v_saldo numeric(12, 2);
  v_reservado numeric(12, 2);
  v_minimo numeric(12, 2);
begin
  if new.estado = 'cancelado' and old.estado is distinct from 'cancelado' then
    update public.reservas_comision
       set estado = 'liberada',
           liberada_en = now(),
           motivo = coalesce(motivo, 'Viaje cancelado')
     where viaje_id = new.id and estado = 'reservada'
     returning * into v_reserva;

    if found and new.conductor_id is not null then
      select saldo_billetera into v_saldo from public.usuarios where id = new.conductor_id;
      select coalesce(sum(monto_usd), 0) into v_reservado
        from public.reservas_comision
       where conductor_id = new.conductor_id and estado = 'reservada';
      select saldo_minimo_usd into v_minimo from public.configuracion_comisiones where id;

      update public.conductores_detalles
         set estado = 'activo', updated_at = now()
       where usuario_id = new.conductor_id
         and estado = 'inactivo_sin_saldo'
         and verificacion = 'aprobado'
         and coalesce(v_saldo, 0) - v_reservado >= v_minimo;
    end if;
  end if;
  return new;
end;
$$;

create trigger viajes_liberar_reserva
  after update of estado on public.viajes
  for each row execute function public.liberar_reserva_viaje();

-- ---------------------------------------------------------------------------
-- Comisión del viaje en efectivo: captura la reserva hecha al aceptar
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
  v_reserva public.reservas_comision%rowtype;
  v_tx public.transacciones_billetera%rowtype;
  v_comision numeric(12, 2);
  v_saldo numeric(12, 2);
  v_saldo_final numeric(12, 2);
  v_reservado numeric(12, 2);
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

  if v_viaje.metodo_pago = 'saldo' and v_viaje.estado <> 'finalizado' then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'pago_con_saldo_pendiente',
      'requiere_pago_cliente', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', v_viaje.estado
    );
  end if;

  if v_viaje.estado = 'finalizado' then
    select * into v_tx from public.transacciones_billetera
     where viaje_id = p_viaje_id and tipo = 'comision';
    select coalesce(sum(monto_usd), 0) into v_reservado
      from public.reservas_comision
     where conductor_id = v_viaje.conductor_id and estado = 'reservada';
    return jsonb_build_object(
      'ok', true,
      'ya_procesado', true,
      'viaje_id', p_viaje_id,
      'estado_viaje', 'finalizado',
      'comision_usd', v_viaje.comision_usd,
      'saldo_billetera', coalesce(
        v_tx.saldo_resultante,
        (select saldo_billetera from public.usuarios where id = v_viaje.conductor_id)
      ),
      'reservado_usd', v_reservado,
      'billetera', 'piloto'
    );
  end if;

  if v_viaje.estado not in ('aceptado', 'en_curso') then
    raise exception 'ESTADO_INVALIDO: %', v_viaje.estado using errcode = 'P0001';
  end if;

  select * into v_cfg from public.configuracion_comisiones where id;

  select * into v_reserva from public.reservas_comision
   where viaje_id = p_viaje_id and estado = 'reservada'
   for update;

  -- Viajes aceptados antes de la migración no tienen reserva: se calcula.
  v_comision := coalesce(v_reserva.monto_usd, public.comision_para(v_viaje.precio_usd));

  select saldo_billetera into v_saldo from public.usuarios
  where id = v_viaje.conductor_id
  for update;

  if not found then
    raise exception 'CONDUCTOR_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  -- Nunca se deja el saldo negativo: el viaje queda abierto para terminar tras
  -- recargar, y el piloto pasa a inactivo para el siguiente viaje.
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
      'saldo_billetera', v_saldo,
      'faltante_usd', v_comision - v_saldo,
      'recarga_minima_usd', v_cfg.recarga_minima_usd
    );
  end if;

  v_saldo_final := v_saldo - v_comision;

  update public.usuarios
     set saldo_billetera = v_saldo_final, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante,
    billetera, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'comision',
    'aprobada',
    'saldo',
    -v_comision,
    v_saldo_final,
    'piloto',
    format('Comisión %s%% del viaje %s → %s',
           round(v_cfg.porcentaje * 100, 2), v_viaje.origen, v_viaje.destino),
    v_viaje.conductor_id
  );

  if v_reserva.id is not null then
    update public.reservas_comision
       set estado = 'capturada', capturada_en = now()
     where id = v_reserva.id;
  end if;

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
     set estado = case when v_saldo_final < v_cfg.saldo_minimo_usd then 'inactivo_sin_saldo' else estado end,
         updated_at = now()
   where usuario_id = v_viaje.conductor_id and estado = 'activo';

  select coalesce(sum(monto_usd), 0) into v_reservado
    from public.reservas_comision
   where conductor_id = v_viaje.conductor_id and estado = 'reservada';

  return jsonb_build_object(
    'ok', true,
    'ya_procesado', false,
    'viaje_id', p_viaje_id,
    'estado_viaje', 'finalizado',
    'comision_usd', v_comision,
    'saldo_billetera', v_saldo_final,
    'reservado_usd', v_reservado,
    'disponible_usd', greatest(v_saldo_final - v_reservado, 0),
    'neto_conductor', v_viaje.precio_usd - v_comision,
    'conductor_activo', v_saldo_final - v_reservado >= v_cfg.saldo_minimo_usd,
    'billetera', 'piloto',
    'recibo', jsonb_build_object(
      'viaje_id', p_viaje_id,
      'origen', v_viaje.origen,
      'destino', v_viaje.destino,
      'tarifa_usd', v_viaje.precio_usd,
      'comision_usd', v_comision,
      'neto_usd', v_viaje.precio_usd - v_comision,
      'saldo_despues_usd', v_saldo_final
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Pago con saldo del pasajero: captura la reserva del piloto
-- ---------------------------------------------------------------------------
create or replace function public.pagar_viaje_con_saldo(p_viaje_id uuid)
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
  v_reserva public.reservas_comision%rowtype;
  v_tx_pago public.transacciones_billetera%rowtype;
  v_tx_comision public.transacciones_billetera%rowtype;
  v_saldo_cliente numeric(12, 2);
  v_saldo_conductor numeric(12, 2);
  v_saldo_final_cliente numeric(12, 2);
  v_saldo_final_conductor numeric(12, 2);
  v_reservado numeric(12, 2);
  v_comision numeric(12, 2);
begin
  select * into v_viaje from public.viajes where id = p_viaje_id for update;
  if not found then
    raise exception 'VIAJE_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if not v_es_servicio and v_uid is distinct from v_viaje.cliente_id then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  if v_viaje.estado = 'finalizado' then
    select * into v_tx_pago from public.transacciones_billetera
     where viaje_id = p_viaje_id and tipo = 'pago';
    if not found then
      raise exception 'VIAJE_NO_ES_SALDO' using errcode = 'P0001';
    end if;

    select * into v_tx_comision from public.transacciones_billetera
     where viaje_id = p_viaje_id and tipo = 'comision';

    select coalesce(sum(monto_usd), 0) into v_reservado
      from public.reservas_comision
     where conductor_id = v_viaje.conductor_id and estado = 'reservada';

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
      ),
      'reservado_usd', v_reservado,
      'billetera', 'piloto'
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

  select * into v_reserva from public.reservas_comision
   where viaje_id = p_viaje_id and estado = 'reservada'
   for update;
  v_comision := coalesce(v_reserva.monto_usd, public.comision_para(v_viaje.precio_usd));

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

  v_saldo_final_cliente := v_saldo_cliente - v_viaje.precio_usd;
  v_saldo_final_conductor := v_saldo_conductor + v_viaje.precio_usd - v_comision;

  update public.usuarios
     set saldo_billetera = v_saldo_final_cliente, updated_at = now()
   where id = v_viaje.cliente_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante,
    billetera, nota, created_by
  )
  values (
    v_viaje.cliente_id,
    p_viaje_id,
    'pago',
    'aprobada',
    'saldo',
    -v_viaje.precio_usd,
    v_saldo_final_cliente,
    'pasajero',
    format('Pago con saldo del viaje %s → %s', v_viaje.origen, v_viaje.destino),
    coalesce(v_uid, v_viaje.cliente_id)
  );

  update public.usuarios
     set saldo_billetera = v_saldo_conductor + v_viaje.precio_usd, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante,
    billetera, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'abono',
    'aprobada',
    'saldo',
    v_viaje.precio_usd,
    v_saldo_conductor + v_viaje.precio_usd,
    'piloto',
    format('Abono del viaje %s → %s', v_viaje.origen, v_viaje.destino),
    coalesce(v_uid, v_viaje.cliente_id)
  );

  update public.usuarios
     set saldo_billetera = v_saldo_final_conductor, updated_at = now()
   where id = v_viaje.conductor_id;

  insert into public.transacciones_billetera (
    usuario_id, viaje_id, tipo, estado, metodo, monto_usd, saldo_resultante,
    billetera, nota, created_by
  )
  values (
    v_viaje.conductor_id,
    p_viaje_id,
    'comision',
    'aprobada',
    'saldo',
    -v_comision,
    v_saldo_final_conductor,
    'piloto',
    format('Comisión %s%% del viaje pagado con saldo', round(v_cfg.porcentaje * 100, 2)),
    coalesce(v_uid, v_viaje.conductor_id)
  );

  if v_reserva.id is not null then
    update public.reservas_comision
       set estado = 'capturada', capturada_en = now()
     where id = v_reserva.id;
  end if;

  perform set_config('llegate.finalizando', 'on', true);
  update public.viajes
     set estado = 'finalizado',
         comision_usd = v_comision,
         comision_porcentaje = v_cfg.porcentaje,
         finalizado_en = now(),
         updated_at = now()
   where id = p_viaje_id;
  perform set_config('llegate.finalizando', 'off', true);

  select coalesce(sum(monto_usd), 0) into v_reservado
    from public.reservas_comision
   where conductor_id = v_viaje.conductor_id and estado = 'reservada';

  update public.conductores_detalles
     set estado = case
                    when v_saldo_final_conductor - v_reservado < v_cfg.saldo_minimo_usd then 'inactivo_sin_saldo'
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
    'reservado_usd', v_reservado,
    'conductor_activo', v_saldo_final_conductor - v_reservado >= v_cfg.saldo_minimo_usd,
    'billetera', 'piloto',
    'recibo', jsonb_build_object(
      'viaje_id', p_viaje_id,
      'origen', v_viaje.origen,
      'destino', v_viaje.destino,
      'tarifa_usd', v_viaje.precio_usd,
      'comision_usd', v_comision,
      'neto_usd', v_viaje.precio_usd - v_comision,
      'saldo_despues_usd', v_saldo_final_conductor
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Verificación del piloto: acredita el saldo de bienvenida una sola vez
-- ---------------------------------------------------------------------------
create or replace function public.verificar_conductor(
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
  v_bienvenida numeric(12, 2) := 0;
  v_nuevo_saldo numeric(12, 2);
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

    select * into v_cfg from public.configuracion_comisiones where id;
    select saldo_billetera into v_saldo from public.usuarios where id = p_usuario_id for update;

    -- Bienvenida única: no es un bono promocional, es la mitigación de
    -- "pagar antes de ganar". No vence y no se repite.
    if not v_detalle.bienvenida_acreditada and v_cfg.bienvenida_usd > 0 then
      v_bienvenida := v_cfg.bienvenida_usd;
      v_nuevo_saldo := coalesce(v_saldo, 0) + v_bienvenida;

      update public.usuarios
         set saldo_billetera = v_nuevo_saldo, updated_at = now()
       where id = p_usuario_id;

      insert into public.transacciones_billetera (
        usuario_id, tipo, estado, metodo, monto_usd, saldo_resultante,
        billetera, nota, created_by
      )
      values (
        p_usuario_id,
        'bienvenida',
        'aprobada',
        'saldo',
        v_bienvenida,
        v_nuevo_saldo,
        'piloto',
        'Saldo de bienvenida del piloto',
        coalesce(v_uid, p_usuario_id)
      );
    else
      v_nuevo_saldo := coalesce(v_saldo, 0);
    end if;

    v_estado := case
                  when v_nuevo_saldo >= v_cfg.saldo_minimo_usd then 'activo'
                  else 'inactivo_sin_saldo'
                end;

    update public.conductores_detalles
       set verificacion = 'aprobado',
           motivo_rechazo = null,
           estado = v_estado,
           bienvenida_acreditada = v_detalle.bienvenida_acreditada or v_bienvenida > 0,
           verificado_por = v_uid,
           verificado_en = now(),
           updated_at = now()
     where usuario_id = p_usuario_id;

    return jsonb_build_object(
      'ok', true,
      'usuario_id', p_usuario_id,
      'verificacion', 'aprobado',
      'estado', v_estado,
      'bienvenida_usd', v_bienvenida,
      'saldo_billetera', v_nuevo_saldo
    );
  end if;

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

  return jsonb_build_object(
    'ok', true,
    'usuario_id', p_usuario_id,
    'verificacion', 'rechazado',
    'estado', v_estado
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Aprobación de recarga: reactiva según el saldo disponible
-- ---------------------------------------------------------------------------
create or replace function public.aprobar_recarga(p_transaccion_id uuid)
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
  v_reservado numeric(12, 2);
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

  select coalesce(sum(monto_usd), 0) into v_reservado
    from public.reservas_comision
   where conductor_id = v_tx.usuario_id and estado = 'reservada';

  update public.conductores_detalles
     set estado = 'activo', updated_at = now()
   where usuario_id = v_tx.usuario_id
     and verificacion = 'aprobado'
     and estado = 'inactivo_sin_saldo'
     and v_nuevo_saldo - v_reservado >= v_cfg.saldo_minimo_usd;

  return jsonb_build_object(
    'ok', true,
    'transaccion_id', v_tx.id,
    'usuario_id', v_tx.usuario_id,
    'monto_usd', v_tx.monto_usd,
    'saldo_billetera', v_nuevo_saldo,
    'reservado_usd', v_reservado,
    'disponible_usd', greatest(v_nuevo_saldo - v_reservado, 0),
    'sla_aprobacion_minutos', v_cfg.sla_aprobacion_minutos
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporte de recarga: límites del piloto y SLA de aprobación
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
  v_cfg public.configuracion_comisiones%rowtype;
  v_banco text := btrim(coalesce(p_banco, ''));
  v_referencia text := btrim(coalesce(p_referencia, ''));
  v_es_piloto boolean;
  v_billetera text;
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

  select * into v_cfg from public.configuracion_comisiones where id;
  select exists (
    select 1 from public.conductores_detalles where usuario_id = v_uid
  ) into v_es_piloto;

  if v_es_piloto
     and (p_monto_usd < v_cfg.recarga_minima_usd or p_monto_usd > v_cfg.recarga_maxima_usd) then
    raise exception 'MONTO_FUERA_DE_RANGO: la recarga del piloto va de % a % USD',
      v_cfg.recarga_minima_usd, v_cfg.recarga_maxima_usd
      using errcode = 'P0001';
  end if;

  v_billetera := case when v_es_piloto then 'piloto' else 'pasajero' end;

  begin
    insert into public.transacciones_billetera (
      usuario_id, tipo, estado, metodo, monto_usd, banco, referencia,
      comprobante_url, billetera, nota, created_by
    )
    values (
      v_uid, 'recarga', 'pendiente', p_metodo, p_monto_usd, v_banco, v_referencia,
      nullif(btrim(coalesce(p_comprobante_url, '')), ''),
      v_billetera,
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
    'monto_usd', p_monto_usd,
    'billetera', v_billetera,
    'sla_aprobacion_minutos', v_cfg.sla_aprobacion_minutos
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke all on function public.aceptar_viaje(uuid) from public, anon;
grant execute on function public.aceptar_viaje(uuid) to authenticated, service_role;

revoke all on function public.cancelar_viaje(uuid, text) from public, anon;
grant execute on function public.cancelar_viaje(uuid, text) to authenticated, service_role;

revoke all on function public.verificar_conductor(uuid, boolean, text) from public, anon;
grant execute on function public.verificar_conductor(uuid, boolean, text) to authenticated, service_role;

revoke all on function public.aprobar_recarga(uuid) from public, anon;
grant execute on function public.aprobar_recarga(uuid) to authenticated, service_role;

revoke all on function public.reportar_recarga(public.metodo_pago, numeric, text, text, text) from public, anon;
grant execute on function public.reportar_recarga(public.metodo_pago, numeric, text, text, text) to authenticated, service_role;

revoke all on function public.procesar_comision_viaje(uuid) from public, anon;
grant execute on function public.procesar_comision_viaje(uuid) to authenticated, service_role;

revoke all on function public.pagar_viaje_con_saldo(uuid) from public, anon;
grant execute on function public.pagar_viaje_con_saldo(uuid) to authenticated, service_role;

revoke all on function public.liberar_reserva_viaje() from public, anon, authenticated, service_role;
