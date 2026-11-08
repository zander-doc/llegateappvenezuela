-- Solicitudes de viaje con fecha futura. Se mantienen separadas de `viajes`,
-- que representa solicitudes que ya pueden asignarse a un conductor.
create type public.estado_viaje_programado as enum ('programado', 'cancelado');

create table public.viajes_programados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.usuarios (id) on delete cascade,
  estado public.estado_viaje_programado not null default 'programado',
  origen text not null check (char_length(btrim(origen)) between 3 and 200),
  destino text not null check (char_length(btrim(destino)) between 3 and 200),
  origen_lat double precision,
  origen_lng double precision,
  destino_lat double precision,
  destino_lng double precision,
  servicio text not null check (servicio in ('mototaxi', 'taxi-pana', 'delivery')),
  programado_para timestamptz not null,
  distancia_km numeric(7, 2) check (distancia_km > 0),
  precio_usd numeric(12, 2) not null check (precio_usd > 0),
  metodo_pago public.metodo_pago not null default 'efectivo',
  cancelado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viaje_programado_coordenadas_origen check (
    (origen_lat is null) = (origen_lng is null)
    and (origen_lat is null or origen_lat between -90 and 90)
    and (origen_lng is null or origen_lng between -180 and 180)
  ),
  constraint viaje_programado_coordenadas_destino check (
    (destino_lat is null) = (destino_lng is null)
    and (destino_lat is null or destino_lat between -90 and 90)
    and (destino_lng is null or destino_lng between -180 and 180)
  ),
  constraint viaje_programado_cancelacion check (
    (estado = 'programado' and cancelado_en is null)
    or (estado = 'cancelado' and cancelado_en is not null)
  )
);

create index viajes_programados_cliente_idx
  on public.viajes_programados (cliente_id, programado_para desc);
create index viajes_programados_fecha_idx
  on public.viajes_programados (programado_para)
  where estado = 'programado';

create trigger viajes_programados_touch before update on public.viajes_programados
  for each row execute function public.touch_updated_at();

alter table public.viajes_programados enable row level security;

create policy "viajes_programados_ver_propios"
  on public.viajes_programados for select to authenticated
  using (cliente_id = auth.uid());

create policy "viajes_programados_crear_propio"
  on public.viajes_programados for insert to authenticated
  with check (cliente_id = auth.uid() and estado = 'programado' and cancelado_en is null);

create policy "viajes_programados_cancelar_propio"
  on public.viajes_programados for update to authenticated
  using (cliente_id = auth.uid() and estado = 'programado')
  with check (cliente_id = auth.uid());

revoke all on public.viajes_programados from anon, authenticated;
grant select, insert on public.viajes_programados to authenticated;
grant update (estado, cancelado_en) on public.viajes_programados to authenticated;
grant trigger on public.viajes_programados to authenticated;
grant select, insert, update, delete on public.viajes_programados to service_role;
