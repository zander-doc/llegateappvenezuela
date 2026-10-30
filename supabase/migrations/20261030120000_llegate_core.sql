-- Llégate App · núcleo del modelo de datos (Supabase / PostgreSQL)
-- Aplica con: supabase db push   (o pega este archivo en el SQL Editor)
--
-- Decisiones clave:
--  * La identidad vive en auth.users; public.usuarios es el perfil 1:1.
--  * El saldo del conductor es prepago y nunca puede ser negativo.
--  * Los cambios de saldo, rol y verificación solo ocurren por RPCs controladas
--    (security definer) o por el service_role, nunca por el cliente.
--  * Los documentos de conductor se guardan en un bucket privado.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.rol_usuario as enum ('cliente', 'conductor', 'admin');
create type public.tipo_vehiculo as enum ('moto', 'carro');
create type public.estado_verificacion as enum ('pendiente', 'aprobado', 'rechazado');
create type public.estado_conductor as enum ('activo', 'inactivo_sin_saldo', 'bloqueado');
create type public.estado_viaje as enum ('solicitado', 'aceptado', 'en_curso', 'finalizado', 'cancelado');
create type public.tipo_transaccion as enum ('recarga', 'comision', 'ajuste', 'devolucion');
create type public.estado_transaccion as enum ('pendiente', 'aprobada', 'rechazada');
create type public.metodo_pago as enum ('pago_movil', 'binance_pay', 'efectivo', 'saldo');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles de usuario (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol_usuario not null default 'cliente',
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  telefono text,
  telefono_verificado boolean not null default false,
  email text,
  whatsapp text,
  saldo_billetera numeric(12, 2) not null default 0 check (saldo_billetera >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index usuarios_telefono_key on public.usuarios (telefono) where telefono is not null;
create index usuarios_rol_idx on public.usuarios (rol);

create function public.es_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = p_uid and rol = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Conductores
-- ---------------------------------------------------------------------------
create table public.conductores_detalles (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  cedula text not null unique check (cedula ~ '^[VE][0-9]{6,9}$'),
  tipo_vehiculo public.tipo_vehiculo not null,
  placa text not null unique check (placa ~ '^[A-Z0-9-]{5,10}$'),
  marca text,
  modelo text,
  anio smallint check (anio between 1950 and 2100),
  cedula_url text not null,
  licencia_url text not null,
  certificado_medico_url text not null,
  verificacion public.estado_verificacion not null default 'pendiente',
  estado public.estado_conductor not null default 'inactivo_sin_saldo',
  motivo_rechazo text,
  verificado_por uuid references public.usuarios (id) on delete set null,
  verificado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conductor_rechazo_con_motivo
    check (verificacion <> 'rechazado' or char_length(btrim(motivo_rechazo)) > 0)
);

create index conductores_estado_idx on public.conductores_detalles (estado);
create index conductores_verificacion_idx on public.conductores_detalles (verificacion);

-- ---------------------------------------------------------------------------
-- Viajes
-- ---------------------------------------------------------------------------
create table public.viajes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.usuarios (id),
  conductor_id uuid references public.usuarios (id),
  estado public.estado_viaje not null default 'solicitado',
  origen text not null check (char_length(btrim(origen)) > 0),
  destino text not null check (char_length(btrim(destino)) > 0),
  distancia_km numeric(7, 2) check (distancia_km > 0),
  precio_usd numeric(12, 2) not null check (precio_usd > 0),
  tasa_bcv numeric(12, 2) check (tasa_bcv > 0),
  metodo_pago public.metodo_pago not null default 'efectivo',
  comision_porcentaje numeric(5, 4) check (comision_porcentaje between 0 and 1),
  comision_usd numeric(12, 2) check (comision_usd between 0 and precio_usd),
  aceptado_en timestamptz,
  iniciado_en timestamptz,
  finalizado_en timestamptz,
  cancelado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viaje_conductor_distinto check (conductor_id is null or conductor_id <> cliente_id),
  constraint viaje_finalizado_con_fecha check (estado <> 'finalizado' or finalizado_en is not null)
);

create index viajes_cliente_idx on public.viajes (cliente_id, created_at desc);
create index viajes_conductor_idx on public.viajes (conductor_id, created_at desc);
create index viajes_estado_idx on public.viajes (estado, created_at desc);

-- ---------------------------------------------------------------------------
-- Billetera transaccional (libro mayor)
-- ---------------------------------------------------------------------------
create table public.transacciones_billetera (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  viaje_id uuid references public.viajes (id) on delete set null,
  tipo public.tipo_transaccion not null,
  estado public.estado_transaccion not null default 'pendiente',
  metodo public.metodo_pago,
  monto_usd numeric(12, 2) not null check (monto_usd <> 0),
  saldo_resultante numeric(12, 2) check (saldo_resultante >= 0),
  banco text,
  referencia text,
  comprobante_url text,
  nota text,
  motivo_rechazo text,
  created_by uuid references public.usuarios (id) on delete set null default auth.uid(),
  aprobada_por uuid references public.usuarios (id) on delete set null,
  aprobada_en timestamptz,
  created_at timestamptz not null default now(),
  constraint recarga_positiva check (tipo <> 'recarga' or monto_usd > 0),
  constraint comision_negativa check (tipo <> 'comision' or monto_usd < 0),
  constraint recarga_metodo_valido check (tipo <> 'recarga' or metodo in ('pago_movil', 'binance_pay')),
  constraint comision_metodo_valido check (tipo <> 'comision' or metodo = 'saldo'),
  constraint recarga_datos_completos
    check (tipo <> 'recarga' or (referencia is not null and banco is not null)),
  constraint transaccion_no_recarga_aprobada check (tipo = 'recarga' or estado = 'aprobada')
);

create unique index transacciones_comision_unica_por_viaje
  on public.transacciones_billetera (viaje_id)
  where tipo = 'comision';

create unique index transacciones_recarga_referencia_unica
  on public.transacciones_billetera (usuario_id, metodo, banco, referencia)
  where tipo = 'recarga' and estado <> 'rechazada';

create index transacciones_usuario_idx on public.transacciones_billetera (usuario_id, created_at desc);
create index transacciones_pendientes_idx on public.transacciones_billetera (estado, created_at)
  where estado = 'pendiente';

-- ---------------------------------------------------------------------------
-- Configuración de comisiones (fila única)
-- ---------------------------------------------------------------------------
create table public.configuracion_comisiones (
  id boolean primary key default true check (id),
  porcentaje numeric(5, 4) not null default 0.1000 check (porcentaje between 0 and 1),
  minimo_usd numeric(12, 2) not null default 0.10 check (minimo_usd > 0),
  updated_at timestamptz not null default now()
);

insert into public.configuracion_comisiones (id) values (true);

-- ---------------------------------------------------------------------------
-- Triggers de actualización
-- ---------------------------------------------------------------------------
create trigger usuarios_touch before update on public.usuarios
  for each row execute function public.touch_updated_at();
create trigger conductores_touch before update on public.conductores_detalles
  for each row execute function public.touch_updated_at();
create trigger viajes_touch before update on public.viajes
  for each row execute function public.touch_updated_at();
create trigger configuracion_touch before update on public.configuracion_comisiones
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Alta de perfil al registrarse en Supabase Auth
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_rol public.rol_usuario;
begin
  v_nombre := btrim(coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  if char_length(v_nombre) < 2 then
    v_nombre := 'Usuario';
  end if;

  -- El rol admin nunca se toma de metadata controlada por el cliente.
  v_rol := case
    when new.raw_user_meta_data ->> 'rol' = 'conductor' then 'conductor'::public.rol_usuario
    else 'cliente'::public.rol_usuario
  end;

  insert into public.usuarios (id, rol, nombre, telefono, telefono_verificado, email, whatsapp)
  values (
    new.id,
    v_rol,
    v_nombre,
    coalesce(new.phone, nullif(btrim(new.raw_user_meta_data ->> 'telefono'), '')),
    new.phone_confirmed_at is not null,
    coalesce(new.email, nullif(btrim(new.raw_user_meta_data ->> 'email'), '')),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'whatsapp'), ''), new.phone)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener el teléfono verificado en sincronía cuando Supabase confirma el OTP.
create function public.sync_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuarios
     set telefono = coalesce(new.phone, telefono),
         telefono_verificado = new.phone_confirmed_at is not null,
         email = coalesce(new.email, email)
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of phone, phone_confirmed_at, email on auth.users
  for each row execute function public.sync_usuario_auth();

-- ---------------------------------------------------------------------------
-- Protecciones
-- ---------------------------------------------------------------------------
-- Un cliente autenticado no puede tocar rol, saldo ni verificación aunque
-- en el futuro cambien los grants de columna.
create function public.proteger_campos_usuario()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.rol is distinct from old.rol
       or new.saldo_billetera is distinct from old.saldo_billetera
       or new.telefono_verificado is distinct from old.telefono_verificado then
      raise exception 'CAMPO_PROTEGIDO' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger usuarios_proteger_campos before update on public.usuarios
  for each row execute function public.proteger_campos_usuario();

-- Finalizar un viaje (y fijar la comisión) solo puede ocurrir dentro de la RPC
-- procesar_comision_viaje, que activa el flag transaccional llegate.finalizando.
create function public.proteger_finalizacion_viaje()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('llegate.finalizando', true), '') <> 'on' then
    if new.estado = 'finalizado' and old.estado is distinct from 'finalizado' then
      raise exception 'USA_PROCESAR_COMISION' using errcode = 'P0001';
    end if;
    if new.comision_usd is distinct from old.comision_usd
       or new.comision_porcentaje is distinct from old.comision_porcentaje then
      raise exception 'COMISION_SOLO_SERVIDOR' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger viajes_proteger_finalizacion before update on public.viajes
  for each row execute function public.proteger_finalizacion_viaje();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.usuarios enable row level security;
alter table public.conductores_detalles enable row level security;
alter table public.viajes enable row level security;
alter table public.transacciones_billetera enable row level security;
alter table public.configuracion_comisiones enable row level security;

create policy "usuarios_ver_propio_o_admin"
  on public.usuarios for select to authenticated
  using (id = auth.uid() or public.es_admin());

create policy "usuarios_actualizar_contacto"
  on public.usuarios for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "conductores_ver_propio_o_admin"
  on public.conductores_detalles for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

create policy "conductores_insertar_propio_pendiente"
  on public.conductores_detalles for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and verificacion = 'pendiente'
    and estado = 'inactivo_sin_saldo'
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'conductor' and u.telefono_verificado
    )
  );

create policy "conductores_reenviar_documentos_rechazados"
  on public.conductores_detalles for update to authenticated
  using (usuario_id = auth.uid() and verificacion = 'rechazado')
  with check (usuario_id = auth.uid() and verificacion = 'pendiente');

create policy "conductores_admin_actualiza"
  on public.conductores_detalles for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "viajes_ver_participante_o_admin"
  on public.viajes for select to authenticated
  using (cliente_id = auth.uid() or conductor_id = auth.uid() or public.es_admin());

create policy "viajes_crear_como_cliente"
  on public.viajes for insert to authenticated
  with check (
    cliente_id = auth.uid()
    and conductor_id is null
    and estado = 'solicitado'
    and exists (
      select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'cliente'
    )
  );

create policy "transacciones_ver_propias_o_admin"
  on public.transacciones_billetera for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

create policy "transacciones_reportar_recarga_propia"
  on public.transacciones_billetera for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and tipo = 'recarga'
    and estado = 'pendiente'
    and metodo in ('pago_movil', 'binance_pay')
    and monto_usd > 0
    and referencia is not null
    and banco is not null
    and viaje_id is null
    and saldo_resultante is null
    and aprobada_por is null
  );

create policy "configuracion_ver_admin"
  on public.configuracion_comisiones for select to authenticated
  using (public.es_admin());

create policy "configuracion_actualizar_admin"
  on public.configuracion_comisiones for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Grants (RLS + permisos por columna)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

revoke all on public.usuarios from anon, authenticated;
grant select on public.usuarios to authenticated;
grant update (nombre, whatsapp) on public.usuarios to authenticated;

revoke all on public.conductores_detalles from anon, authenticated;
grant select, insert on public.conductores_detalles to authenticated;
grant update (
  cedula, tipo_vehiculo, placa, marca, modelo, anio,
  cedula_url, licencia_url, certificado_medico_url,
  verificacion, estado, motivo_rechazo, verificado_por, verificado_en
) on public.conductores_detalles to authenticated;

revoke all on public.viajes from anon, authenticated;
grant select, insert on public.viajes to authenticated;

revoke all on public.transacciones_billetera from anon, authenticated;
grant select, insert on public.transacciones_billetera to authenticated;

revoke all on public.configuracion_comisiones from anon, authenticated;
grant select, update on public.configuracion_comisiones to authenticated;

-- service_role opera solo a través de las RPC de administración (security definer),
-- pero conserva acceso directo para tareas de mantenimiento.
grant select, insert, update, delete on
  public.usuarios,
  public.conductores_detalles,
  public.viajes,
  public.transacciones_billetera,
  public.configuracion_comisiones
to service_role;

-- ---------------------------------------------------------------------------
-- Storage privado para documentos de conductores
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-conductores',
  'documentos-conductores',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "documentos_conductor_sube"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos-conductores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documentos_conductor_lee"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos-conductores'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin())
  );
