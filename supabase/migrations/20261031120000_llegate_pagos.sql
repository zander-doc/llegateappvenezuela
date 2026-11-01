-- Llégate App · intenciones de pago de recargas
--
-- El piloto recarga su billetera prepago con Pago Móvil o Binance Pay. Antes
-- esta operación era solo un reporte manual: la persona pagaba, escribía la
-- referencia y un admin aprobaba. Esta migración agrega una intención de pago
-- con instrucciones, vencimiento y confirmación idempotente.
--
-- Flujo:
--   pendiente → en_revision → confirmado
--          ↘ cancelado / expirado / rechazado
--
-- Seguridad con anon key:
--   La API solo tiene la anon key (nunca service_role), así que la confirmación
--   automática no puede apoyarse en el rol service_role. En su lugar, la fila
--   única de `configuracion_pagos` guarda el hash SHA-256 de una clave de
--   servidor. `confirmar_pago` exige esa clave y está pensada para el webhook;
--   un usuario con el anon key público no puede confirmar pagos sin ella.
--   El admin también puede confirmar con su JWT mediante
--   `confirmar_pago_admin`, sin conocer la clave.
--
--   La clave no vive en la base en texto plano: se registra una sola vez con
--   su hash (ver supabase/README.md) y se configura igual en la API.

create type public.estado_pago as enum (
  'pendiente',
  'en_revision',
  'confirmado',
  'rechazado',
  'expirado',
  'cancelado'
);

-- ---------------------------------------------------------------------------
-- Configuración de pagos (fila única, sin acceso directo de los clientes)
-- ---------------------------------------------------------------------------
create table public.configuracion_pagos (
  id boolean primary key default true check (id),
  clave_servidor_hash text,
  updated_at timestamptz not null default now()
);

insert into public.configuracion_pagos (id) values (true);

comment on column public.configuracion_pagos.clave_servidor_hash is
  'SHA-256 hex de PAGOS_CLAVE_SERVIDOR. Se registra con SQL y nunca se expone al cliente.';

-- ---------------------------------------------------------------------------
-- Intenciones de pago
-- ---------------------------------------------------------------------------
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  metodo public.metodo_pago not null,
  proveedor text not null default 'manual',
  estado public.estado_pago not null default 'pendiente',
  monto_usd numeric(12, 2) not null check (monto_usd > 0),
  monto_bs numeric(16, 2) check (monto_bs > 0),
  tasa_bs numeric(16, 4) check (tasa_bs > 0),
  codigo text not null unique,
  checkout_url text,
  instrucciones jsonb not null default '{}'::jsonb,
  referencia_externa text,
  referencia_reportada text,
  comprobante_url text,
  transaccion_billetera_id uuid unique
    references public.transacciones_billetera (id) on delete set null,
  expira_en timestamptz not null default now() + interval '30 minutes',
  confirmado_en timestamptz,
  motivo_rechazo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pago_metodo_valido check (metodo in ('pago_movil', 'binance_pay')),
  constraint pago_proveedor_valido check (proveedor in ('manual', 'binance_pay')),
  constraint pago_proveedor_metodo check (
    (metodo = 'pago_movil' and proveedor = 'manual')
    or (metodo = 'binance_pay' and proveedor = 'binance_pay')
  ),
  constraint pago_bolivares_coherentes check ((monto_bs is null) = (tasa_bs is null)),
  constraint pago_confirmado_con_fecha check (
    estado <> 'confirmado' or (confirmado_en is not null and transaccion_billetera_id is not null)
  ),
  constraint pago_rechazado_con_motivo check (
    estado <> 'rechazado' or char_length(btrim(coalesce(motivo_rechazo, ''))) >= 3
  ),
  constraint pago_instrucciones_objeto check (jsonb_typeof(instrucciones) = 'object'),
  constraint pago_metadata_objeto check (jsonb_typeof(metadata) = 'object')
);

create unique index pagos_referencia_externa_unica
  on public.pagos (proveedor, referencia_externa)
  where referencia_externa is not null;

create index pagos_usuario_idx on public.pagos (usuario_id, created_at desc);
create index pagos_pendientes_idx on public.pagos (estado, expira_en)
  where estado in ('pendiente', 'en_revision');

create trigger pagos_touch before update on public.pagos
  for each row execute function public.touch_updated_at();

alter table public.pagos enable row level security;
alter table public.configuracion_pagos enable row level security;

create policy "pagos_ver_propios_o_admin"
  on public.pagos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

revoke all on public.pagos from anon, authenticated;
grant select on public.pagos to authenticated;
grant select, insert, update, delete on public.pagos to service_role;

revoke all on public.configuracion_pagos from anon, authenticated;
grant select, insert, update, delete on public.configuracion_pagos to service_role;

-- ---------------------------------------------------------------------------
-- Crédito de una recarga pendiente (sin control de permisos)
--
-- Lo usan tanto la aprobación manual (`aprobar_recarga`) como la confirmación
-- automática de una pasarela. Al centralizarlo, el saldo, el libro mayor y la
-- reactivación del piloto se comportan igual en ambos caminos.
-- ---------------------------------------------------------------------------
create function public.acreditar_recarga_interna(p_transaccion_id uuid)
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
  select * into v_tx from public.transacciones_billetera
   where id = p_transaccion_id
   for update;
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
         aprobada_por = case
                          when coalesce(auth.role(), '') = 'service_role' then null
                          else v_uid
                        end,
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

revoke all on function public.acreditar_recarga_interna(uuid)
  from public, anon, authenticated, service_role;

-- La aprobación manual conserva su contrato y su control de permisos.
create or replace function public.aprobar_recarga(p_transaccion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  return public.acreditar_recarga_interna(p_transaccion_id);
end;
$$;

revoke all on function public.aprobar_recarga(uuid) from public, anon;
grant execute on function public.aprobar_recarga(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Crear la intención: código público, instrucciones del proveedor y vencimiento
-- ---------------------------------------------------------------------------
create function public.crear_intencion_pago(
  p_metodo public.metodo_pago,
  p_proveedor text,
  p_monto_usd numeric,
  p_instrucciones jsonb default '{}'::jsonb,
  p_checkout_url text default null,
  p_monto_bs numeric default null,
  p_tasa_bs numeric default null,
  p_expira_en timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_codigo text;
  v_cfg public.configuracion_comisiones%rowtype;
  v_expira timestamptz := coalesce(p_expira_en, now() + interval '30 minutes');
  v_es_piloto boolean;
  v_billetera text;
  v_intentos int := 0;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_metodo not in ('pago_movil', 'binance_pay') then
    raise exception 'METODO_NO_PERMITIDO' using errcode = 'P0001';
  end if;
  if p_proveedor not in ('manual', 'binance_pay') then
    raise exception 'PROVEEDOR_NO_PERMITIDO' using errcode = 'P0001';
  end if;
  if (p_metodo = 'pago_movil' and p_proveedor <> 'manual')
     or (p_metodo = 'binance_pay' and p_proveedor <> 'binance_pay') then
    raise exception 'PROVEEDOR_INCOMPATIBLE' using errcode = 'P0001';
  end if;
  if p_monto_usd is null or p_monto_usd <= 0 or p_monto_usd > 10000 then
    raise exception 'MONTO_INVALIDO' using errcode = 'P0001';
  end if;
  if (p_monto_bs is null) <> (p_tasa_bs is null) then
    raise exception 'TASA_INCOMPLETA' using errcode = 'P0001';
  end if;
  if p_monto_bs is not null and (p_monto_bs <= 0 or p_tasa_bs <= 0) then
    raise exception 'TASA_INVALIDA' using errcode = 'P0001';
  end if;
  if p_instrucciones is null or jsonb_typeof(p_instrucciones) <> 'object' then
    raise exception 'INSTRUCCIONES_INVALIDAS' using errcode = 'P0001';
  end if;
  if p_checkout_url is not null
     and (char_length(btrim(p_checkout_url)) < 8 or p_checkout_url !~ '^https?://') then
    raise exception 'CHECKOUT_INVALIDO' using errcode = 'P0001';
  end if;
  if v_expira <= now() + interval '2 minutes'
     or v_expira > now() + interval '2 hours' then
    raise exception 'VENCIMIENTO_INVALIDO' using errcode = 'P0001';
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

  -- Código legible para el checkout y para la referencia del banco. Se
  -- reintenta si choca con otro pago activo.
  loop
    v_intentos := v_intentos + 1;
    v_codigo := 'LLG-' || upper(encode(gen_random_bytes(5), 'hex'));
    begin
      insert into public.pagos (
        usuario_id, metodo, proveedor, monto_usd, monto_bs, tasa_bs, codigo,
        instrucciones, checkout_url, expira_en
      )
      values (
        v_uid, p_metodo, p_proveedor, p_monto_usd, p_monto_bs, p_tasa_bs, v_codigo,
        p_instrucciones, nullif(btrim(coalesce(p_checkout_url, '')), ''), v_expira
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_intentos >= 5 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'pago', jsonb_build_object(
      'id', v_id,
      'codigo', v_codigo,
      'metodo', p_metodo,
      'proveedor', p_proveedor,
      'estado', 'pendiente',
      'monto_usd', p_monto_usd,
      'monto_bs', p_monto_bs,
      'tasa_bs', p_tasa_bs,
      'checkout_url', nullif(btrim(coalesce(p_checkout_url, '')), ''),
      'instrucciones', p_instrucciones,
      'expira_en', v_expira,
      'billetera', v_billetera
    )
  );
end;
$$;

revoke all on function public.crear_intencion_pago(
  public.metodo_pago, text, numeric, jsonb, text, numeric, numeric, timestamptz
) from public, anon;
grant execute on function public.crear_intencion_pago(
  public.metodo_pago, text, numeric, jsonb, text, numeric, numeric, timestamptz
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vincular la orden del proveedor después de crearla (checkout de Binance)
-- ---------------------------------------------------------------------------
create function public.actualizar_intencion_pago(
  p_pago_id uuid,
  p_checkout_url text,
  p_referencia_externa text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pago public.pagos%rowtype;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'METADATA_INVALIDA' using errcode = 'P0001';
  end if;
  if p_checkout_url is not null
     and (char_length(btrim(p_checkout_url)) < 8 or p_checkout_url !~ '^https?://') then
    raise exception 'CHECKOUT_INVALIDO' using errcode = 'P0001';
  end if;

  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_pago.usuario_id <> v_uid then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if v_pago.estado <> 'pendiente' then
    raise exception 'PAGO_NO_EDITABLE' using errcode = 'P0001';
  end if;

  begin
    update public.pagos
       set checkout_url = coalesce(
             nullif(btrim(coalesce(p_checkout_url, '')), ''),
             checkout_url
           ),
           referencia_externa = coalesce(
             nullif(btrim(coalesce(p_referencia_externa, '')), ''),
             referencia_externa
           ),
           metadata = metadata || p_metadata
     where id = p_pago_id;
  exception when unique_violation then
    raise exception 'REFERENCIA_DUPLICADA' using errcode = '23505';
  end;

  return jsonb_build_object('ok', true, 'pago_id', p_pago_id);
end;
$$;

revoke all on function public.actualizar_intencion_pago(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.actualizar_intencion_pago(uuid, text, text, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Consultar las intenciones propias (y expirar las vencidas)
-- ---------------------------------------------------------------------------
create function public.mis_pagos(p_limite integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limite int := least(greatest(coalesce(p_limite, 20), 1), 50);
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  update public.pagos
     set estado = 'expirado'
   where usuario_id = v_uid
     and estado in ('pendiente', 'en_revision')
     and expira_en < now();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id,
             'codigo', p.codigo,
             'metodo', p.metodo,
             'proveedor', p.proveedor,
             'estado', p.estado,
             'monto_usd', p.monto_usd,
             'monto_bs', p.monto_bs,
             'tasa_bs', p.tasa_bs,
             'checkout_url', p.checkout_url,
             'instrucciones', p.instrucciones,
             'referencia_reportada', p.referencia_reportada,
             'comprobante_url', p.comprobante_url,
             'expira_en', p.expira_en,
             'confirmado_en', p.confirmado_en,
             'motivo_rechazo', p.motivo_rechazo,
             'created_at', p.created_at
           ) order by p.created_at desc)
      from (
        select * from public.pagos
         where usuario_id = v_uid
         order by created_at desc
         limit v_limite
      ) p
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.mis_pagos(integer) from public, anon;
grant execute on function public.mis_pagos(integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reportar el pago hecho por el usuario (Pago Móvil semiautomático)
-- ---------------------------------------------------------------------------
create function public.reportar_pago(
  p_pago_id uuid,
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
  v_pago public.pagos%rowtype;
  v_referencia text := btrim(coalesce(p_referencia, ''));
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_pago.usuario_id <> v_uid then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if v_pago.estado = 'expirado' or (v_pago.estado = 'pendiente' and v_pago.expira_en < now()) then
    update public.pagos set estado = 'expirado' where id = p_pago_id;
    return jsonb_build_object(
      'ok', false,
      'motivo', 'pago_expirado',
      'estado', 'expirado',
      'pago_id', p_pago_id
    );
  end if;
  if v_pago.estado = 'en_revision' then
    return jsonb_build_object(
      'ok', true,
      'ya_reportado', true,
      'pago_id', v_pago.id,
      'estado', v_pago.estado
    );
  end if;
  if v_pago.estado <> 'pendiente' then
    raise exception 'PAGO_NO_REPORTABLE: %', v_pago.estado using errcode = 'P0001';
  end if;
  if v_pago.metodo <> 'pago_movil' then
    raise exception 'METODO_AUTOMATICO' using errcode = 'P0001';
  end if;
  if v_referencia !~ '^[0-9]{6,12}$' then
    raise exception 'REFERENCIA_INVALIDA' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.pagos
     where usuario_id = v_uid
       and metodo = 'pago_movil'
       and referencia_reportada = v_referencia
       and id <> p_pago_id
       and estado in ('en_revision', 'confirmado')
  ) or exists (
    select 1 from public.transacciones_billetera
     where usuario_id = v_uid
       and metodo = 'pago_movil'
       and referencia = v_referencia
       and tipo = 'recarga'
       and estado <> 'rechazada'
  ) then
    raise exception 'REFERENCIA_DUPLICADA' using errcode = '23505';
  end if;

  update public.pagos
     set estado = 'en_revision',
         referencia_reportada = v_referencia,
         comprobante_url = nullif(btrim(coalesce(p_comprobante_url, '')), '')
   where id = p_pago_id;

  return jsonb_build_object(
    'ok', true,
    'ya_reportado', false,
    'pago_id', p_pago_id,
    'estado', 'en_revision',
    'referencia', v_referencia
  );
end;
$$;

revoke all on function public.reportar_pago(uuid, text, text) from public, anon;
grant execute on function public.reportar_pago(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Cancelar una intención propia que aún no se pagó
-- ---------------------------------------------------------------------------
create function public.cancelar_pago(p_pago_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pago public.pagos%rowtype;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_pago.usuario_id <> v_uid then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  if v_pago.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'ya_cancelado', true, 'pago_id', p_pago_id);
  end if;
  if v_pago.estado = 'en_revision' then
    raise exception 'PAGO_EN_REVISION' using errcode = 'P0001';
  end if;
  if v_pago.estado <> 'pendiente' then
    raise exception 'PAGO_NO_CANCELABLE: %', v_pago.estado using errcode = 'P0001';
  end if;

  update public.pagos set estado = 'cancelado' where id = p_pago_id;

  return jsonb_build_object('ok', true, 'ya_cancelado', false, 'pago_id', p_pago_id, 'estado', 'cancelado');
end;
$$;

revoke all on function public.cancelar_pago(uuid) from public, anon;
grant execute on function public.cancelar_pago(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Confirmación idempotente de una intención
-- ---------------------------------------------------------------------------
create function public.confirmar_pago_interno(
  p_pago_id uuid,
  p_referencia_externa text,
  p_metadata jsonb,
  p_monto_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago public.pagos%rowtype;
  v_tx_id uuid;
  v_tx public.transacciones_billetera%rowtype;
  v_acreditacion jsonb;
  v_banco text;
  v_referencia text;
  v_billetera text;
  v_es_piloto boolean;
  v_nota text;
begin
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'METADATA_INVALIDA' using errcode = 'P0001';
  end if;

  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  if v_pago.estado = 'confirmado' then
    return jsonb_build_object(
      'ok', true,
      'ya_confirmado', true,
      'pago_id', v_pago.id,
      'estado', v_pago.estado,
      'transaccion_id', v_pago.transaccion_billetera_id,
      'monto_usd', v_pago.monto_usd
    );
  end if;

  if v_pago.estado = 'expirado'
     or (v_pago.estado in ('pendiente', 'en_revision') and v_pago.expira_en < now()) then
    update public.pagos set estado = 'expirado' where id = v_pago.id;
    return jsonb_build_object(
      'ok', false,
      'motivo', 'pago_expirado',
      'estado', 'expirado',
      'pago_id', v_pago.id
    );
  end if;

  if v_pago.estado not in ('pendiente', 'en_revision') then
    raise exception 'PAGO_NO_CONFIRMABLE: %', v_pago.estado using errcode = 'P0001';
  end if;

  if p_monto_usd is not null and abs(p_monto_usd - v_pago.monto_usd) > 0.01 then
    raise exception 'MONTO_NO_COINCIDE: esperado % y recibido %',
      v_pago.monto_usd, p_monto_usd
      using errcode = 'P0001';
  end if;

  v_banco := case
               when v_pago.metodo = 'pago_movil'
                 then coalesce(nullif(btrim(v_pago.instrucciones ->> 'banco'), ''), 'Pago Móvil')
               else 'Binance'
             end;
  v_referencia := coalesce(
                    nullif(btrim(coalesce(p_referencia_externa, '')), ''),
                    nullif(btrim(coalesce(v_pago.referencia_reportada, '')), ''),
                    v_pago.codigo
                  );
  v_nota := case
              when v_pago.metodo = 'pago_movil' then 'Recarga confirmada con Pago Móvil'
              else 'Recarga confirmada con Binance Pay'
            end;

  select exists (
    select 1 from public.conductores_detalles where usuario_id = v_pago.usuario_id
  ) into v_es_piloto;
  v_billetera := case when v_es_piloto then 'piloto' else 'pasajero' end;

  begin
    insert into public.transacciones_billetera (
      usuario_id, tipo, estado, metodo, monto_usd, banco, referencia,
      comprobante_url, billetera, nota, created_by
    )
    values (
      v_pago.usuario_id, 'recarga', 'pendiente', v_pago.metodo, v_pago.monto_usd,
      v_banco, v_referencia, v_pago.comprobante_url, v_billetera, v_nota,
      case when coalesce(auth.role(), '') = 'service_role' then null else auth.uid() end
    )
    returning id into v_tx_id;
  exception when unique_violation then
    raise exception 'REFERENCIA_DUPLICADA' using errcode = '23505';
  end;

  v_acreditacion := public.acreditar_recarga_interna(v_tx_id);

  begin
    update public.pagos
       set estado = 'confirmado',
           confirmado_en = now(),
           transaccion_billetera_id = v_tx_id,
           referencia_externa = coalesce(
             nullif(btrim(coalesce(p_referencia_externa, '')), ''),
             referencia_externa
           ),
           metadata = metadata || p_metadata
     where id = v_pago.id;
  exception when unique_violation then
    raise exception 'REFERENCIA_DUPLICADA' using errcode = '23505';
  end;

  select * into v_tx from public.transacciones_billetera where id = v_tx_id;

  return jsonb_build_object(
    'ok', true,
    'ya_confirmado', false,
    'pago_id', v_pago.id,
    'estado', 'confirmado',
    'transaccion_id', v_tx_id,
    'monto_usd', v_pago.monto_usd,
    'saldo_billetera', v_tx.saldo_resultante,
    'aprobacion', v_acreditacion
  );
end;
$$;

revoke all on function public.confirmar_pago_interno(uuid, text, jsonb, numeric)
  from public, anon, authenticated, service_role;

-- Confirmación del proveedor/webhook: exige la clave de servidor.
create function public.confirmar_pago(
  p_codigo text,
  p_clave_servidor text,
  p_referencia_externa text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_monto_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_pago_id uuid;
  v_codigo text := btrim(coalesce(p_codigo, ''));
begin
  select clave_servidor_hash into v_hash from public.configuracion_pagos where id;
  if v_hash is null then
    raise exception 'CLAVE_SERVIDOR_NO_CONFIGURADA' using errcode = 'P0001';
  end if;
  if p_clave_servidor is null
     or char_length(p_clave_servidor) < 16
     or encode(digest(p_clave_servidor, 'sha256'), 'hex') <> v_hash then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if v_codigo = '' then
    raise exception 'CODIGO_REQUERIDO' using errcode = 'P0001';
  end if;

  select id into v_pago_id from public.pagos where codigo = v_codigo;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;

  return public.confirmar_pago_interno(
    v_pago_id,
    p_referencia_externa,
    p_metadata,
    p_monto_usd
  );
end;
$$;

revoke all on function public.confirmar_pago(text, text, text, jsonb, numeric)
  from public, authenticated;
grant execute on function public.confirmar_pago(text, text, text, jsonb, numeric)
  to anon, service_role;

-- Confirmación desde el panel de administración: sin clave de servidor.
create function public.confirmar_pago_admin(
  p_pago_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  return public.confirmar_pago_interno(p_pago_id, null, p_metadata, null);
end;
$$;

revoke all on function public.confirmar_pago_admin(uuid, jsonb) from public, anon;
grant execute on function public.confirmar_pago_admin(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rechazo y expiración (admin / operación)
-- ---------------------------------------------------------------------------
create function public.rechazar_pago(p_pago_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pago public.pagos%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if char_length(v_motivo) < 3 then
    raise exception 'MOTIVO_REQUERIDO' using errcode = 'P0001';
  end if;

  select * into v_pago from public.pagos where id = p_pago_id for update;
  if not found then
    raise exception 'PAGO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_pago.estado = 'confirmado' then
    raise exception 'PAGO_YA_CONFIRMADO' using errcode = 'P0001';
  end if;
  if v_pago.estado = 'rechazado' then
    return jsonb_build_object('ok', false, 'motivo', 'ya_procesada', 'estado', v_pago.estado);
  end if;

  update public.pagos
     set estado = 'rechazado',
         motivo_rechazo = v_motivo
   where id = p_pago_id;

  return jsonb_build_object(
    'ok', true,
    'pago_id', p_pago_id,
    'estado', 'rechazado',
    'motivo', v_motivo
  );
end;
$$;

revoke all on function public.rechazar_pago(uuid, text) from public, anon;
grant execute on function public.rechazar_pago(uuid, text) to authenticated, service_role;

create function public.expirar_pagos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total int;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.es_admin(v_uid) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  update public.pagos
     set estado = 'expirado'
   where estado in ('pendiente', 'en_revision')
     and expira_en < now();
  get diagnostics v_total = row_count;

  return jsonb_build_object('ok', true, 'expirados', v_total);
end;
$$;

revoke all on function public.expirar_pagos() from public, anon;
grant execute on function public.expirar_pagos() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Permisos de lectura del libro mayor para la confirmación automática
--
-- `acreditar_recarga_interna` y `confirmar_pago_interno` corren como definer,
-- así que no necesitan grants del rol que invoca. La tabla pagos solo se lee
-- por RLS para el dueño o un admin.
-- ---------------------------------------------------------------------------
comment on table public.pagos is
  'Intenciones de recarga con Pago Móvil (revisión manual) o Binance Pay (checkout y webhook).';
comment on column public.pagos.codigo is
  'Código público LLG-XXXXXXXXXX. También se usa como merchantTradeNo en Binance.';
comment on column public.pagos.referencia_reportada is
  'Referencia bancaria que escribe el usuario tras pagar con Pago Móvil.';
comment on column public.pagos.referencia_externa is
  'Identificador de la orden en el proveedor (prepayId de Binance).';
comment on column public.pagos.transaccion_billetera_id is
  'Recarga aprobada que generó la confirmación; única para evitar doble crédito.';
