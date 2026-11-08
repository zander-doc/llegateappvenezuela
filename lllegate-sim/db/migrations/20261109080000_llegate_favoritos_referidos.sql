-- Direcciones guardadas, pilotos preferidos y bonificación por referido.

alter table public.usuarios
  add column codigo_referido text;

update public.usuarios
   set codigo_referido = 'LLEGATE-' || upper(replace(id::text, '-', ''))
 where codigo_referido is null;

alter table public.usuarios
  alter column codigo_referido set not null;

create unique index usuarios_codigo_referido_idx
  on public.usuarios (codigo_referido);

create function public.asignar_codigo_referido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo_referido is null then
    new.codigo_referido := 'LLEGATE-' || upper(replace(new.id::text, '-', ''));
  end if;
  return new;
end;
$$;

create trigger usuarios_codigo_referido
  before insert on public.usuarios
  for each row execute function public.asignar_codigo_referido();

create table public.direcciones_favoritas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  etiqueta text not null check (char_length(btrim(etiqueta)) between 1 and 40),
  direccion_texto text not null check (char_length(btrim(direccion_texto)) between 3 and 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index direcciones_favoritas_usuario_etiqueta_idx
  on public.direcciones_favoritas (usuario_id, lower(etiqueta));
create index direcciones_favoritas_usuario_idx
  on public.direcciones_favoritas (usuario_id, created_at);

create trigger direcciones_favoritas_touch before update on public.direcciones_favoritas
  for each row execute function public.touch_updated_at();

create table public.conductores_favoritos (
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  conductor_id uuid not null references public.usuarios (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, conductor_id),
  constraint conductor_favorito_no_autorreferencia check (usuario_id <> conductor_id)
);

create index conductores_favoritos_usuario_idx
  on public.conductores_favoritos (usuario_id, created_at desc);

create function public.es_conductor_registrado(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.usuarios u
      join public.conductores_detalles d on d.usuario_id = u.id
     where u.id = p_uid and u.rol = 'conductor'
  );
$$;

create table public.referidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete restrict,
  codigo_referido text not null references public.usuarios (codigo_referido) on update cascade,
  invitado_id uuid not null unique references public.usuarios (id) on delete restrict,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'bonificado')),
  aplicado_en timestamptz not null default now(),
  bonificado_en timestamptz,
  constraint referido_no_autorreferido check (usuario_id <> invitado_id),
  constraint referido_estado_fecha check (
    (estado = 'pendiente' and bonificado_en is null)
    or (estado = 'bonificado' and bonificado_en is not null)
  )
);

create index referidos_usuario_idx on public.referidos (usuario_id, aplicado_en desc);

alter table public.transacciones_billetera
  add column referido_id uuid references public.referidos (id) on delete restrict;

create unique index transacciones_bono_referido_unica
  on public.transacciones_billetera (referido_id, usuario_id)
  where referido_id is not null;

alter table public.usuarios enable row level security;
alter table public.direcciones_favoritas enable row level security;
alter table public.conductores_favoritos enable row level security;
alter table public.referidos enable row level security;

create policy "direcciones_favoritas_propias"
  on public.direcciones_favoritas for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "conductores_favoritos_propios"
  on public.conductores_favoritos for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid() and public.es_conductor_registrado(conductor_id));

create policy "referidos_ver_participantes"
  on public.referidos for select to authenticated
  using (usuario_id = auth.uid() or invitado_id = auth.uid());

revoke all on public.direcciones_favoritas, public.conductores_favoritos, public.referidos
  from anon, authenticated;
grant select, insert, update, delete on public.direcciones_favoritas to authenticated;
grant trigger on public.direcciones_favoritas to authenticated;
grant select, insert, delete on public.conductores_favoritos to authenticated;
grant select on public.referidos to authenticated;
grant select, insert, update, delete on
  public.direcciones_favoritas,
  public.conductores_favoritos,
  public.referidos
to service_role;
grant select, update (codigo_referido) on public.usuarios to service_role;
revoke all on function public.es_conductor_registrado(uuid) from public, anon;
grant execute on function public.es_conductor_registrado(uuid) to authenticated, service_role;

create function public.aplicar_codigo_referido(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_invitador public.usuarios%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  perform 1 from public.usuarios where id = v_uid for update;
  if not found then
    raise exception 'USUARIO_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if (select rol from public.usuarios where id = v_uid) <> 'cliente' then
    raise exception 'SOLO_CLIENTES_PUEDEN_APLICAR_REFERIDOS' using errcode = 'P0001';
  end if;

  select * into v_invitador
    from public.usuarios
   where codigo_referido = v_codigo;
  if not found then
    raise exception 'CODIGO_REFERIDO_INVALIDO' using errcode = 'P0001';
  end if;
  if v_invitador.id = v_uid then
    raise exception 'CODIGO_REFERIDO_PROPIO' using errcode = 'P0001';
  end if;
  if v_invitador.rol <> 'cliente' then
    raise exception 'CODIGO_REFERIDO_NO_DISPONIBLE' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.referidos where invitado_id = v_uid) then
    raise exception 'CODIGO_REFERIDO_YA_APLICADO' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.viajes
     where cliente_id = v_uid and estado = 'finalizado'
  ) then
    raise exception 'REFERIDO_POSTERIOR_A_PRIMER_VIAJE' using errcode = 'P0001';
  end if;

  insert into public.referidos (usuario_id, codigo_referido, invitado_id)
  values (v_invitador.id, v_invitador.codigo_referido, v_uid)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'referido_id', v_id,
    'estado', 'pendiente'
  );
end;
$$;

revoke all on function public.aplicar_codigo_referido(text) from public, anon;
grant execute on function public.aplicar_codigo_referido(text) to authenticated, service_role;

create function public.bonificar_referido_primera_carrera()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referido public.referidos%rowtype;
  v_saldo_anfitrion numeric(12, 2);
  v_saldo_invitado numeric(12, 2);
begin
  if new.estado <> 'finalizado' or old.estado = 'finalizado' or new.conductor_id is null then
    return new;
  end if;

  select * into v_referido
    from public.referidos
   where invitado_id = new.cliente_id
     and estado = 'pendiente'
   for update;

  if not found then
    return new;
  end if;

  perform 1 from public.usuarios
   where id in (v_referido.usuario_id, v_referido.invitado_id)
   order by id
   for update;

  update public.referidos
     set estado = 'bonificado', bonificado_en = now()
   where id = v_referido.id and estado = 'pendiente';
  if not found then
    return new;
  end if;

  update public.usuarios
     set saldo_billetera = saldo_billetera + 5.00, updated_at = now()
   where id = v_referido.usuario_id
   returning saldo_billetera into v_saldo_anfitrion;

  update public.usuarios
     set saldo_billetera = saldo_billetera + 5.00, updated_at = now()
   where id = v_referido.invitado_id
   returning saldo_billetera into v_saldo_invitado;

  insert into public.transacciones_billetera (
    usuario_id, tipo, estado, monto_usd, saldo_resultante, billetera, nota, referido_id, created_by
  )
  values
    (
      v_referido.usuario_id, 'ajuste', 'aprobada', 5.00, v_saldo_anfitrion,
      'pasajero', 'Bono de $5 por la primera carrera válida de un pana invitado',
      v_referido.id, null
    ),
    (
      v_referido.invitado_id, 'ajuste', 'aprobada', 5.00, v_saldo_invitado,
      'pasajero', 'Bono de $5 por completar tu primera carrera válida con Llégate',
      v_referido.id, null
    );

  return new;
end;
$$;

create trigger viajes_bonificar_referido
  after update of estado on public.viajes
  for each row execute function public.bonificar_referido_primera_carrera();

create function public.mi_resumen_referidos()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'codigo_referido', u.codigo_referido,
    'invitados', count(r.id),
    'invitados_bonificados', count(r.id) filter (where r.estado = 'bonificado'),
    'bono_acumulado_usd', coalesce(
      sum(case when r.estado = 'bonificado' then 5.00 else 0 end), 0
    ),
    'saldo_billetera', u.saldo_billetera
  )
    from public.usuarios u
    left join public.referidos r on r.usuario_id = u.id
   where u.id = auth.uid()
   group by u.id
$$;

revoke all on function public.mi_resumen_referidos() from public, anon;
grant execute on function public.mi_resumen_referidos() to authenticated, service_role;
