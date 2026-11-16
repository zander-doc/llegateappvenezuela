-- Fase 1: identidad con Google, foto de perfil, preferencias y base de
-- seguimiento de eventos. Todo es aditivo: no cambia ni borra nada existente.

alter table public.usuarios
  add column if not exists foto_url text
    check (foto_url is null or char_length(foto_url) <= 500),
  add column if not exists google_sub text,
  add column if not exists preferencias jsonb not null default '{}'::jsonb,
  add column if not exists acepta_promociones boolean not null default false,
  add column if not exists origen_registro text not null default 'telefono'
    check (origen_registro in ('telefono', 'google', 'admin')),
  add column if not exists ultimo_acceso_en timestamptz;

-- Una cuenta de Google solo puede estar ligada a un usuario.
create unique index if not exists usuarios_google_sub_key
  on public.usuarios (google_sub)
  where google_sub is not null;

-- Registro de eventos (registro, ingreso, recarga, viaje...). Es la base para
-- seguimiento de comportamiento y premios; solo el API (propietario) escribe.
create table if not exists public.eventos_usuario (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null check (char_length(tipo) between 2 and 60),
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists eventos_usuario_usuario_idx
  on public.eventos_usuario (usuario_id, creado_en desc);
create index if not exists eventos_usuario_tipo_idx
  on public.eventos_usuario (tipo, creado_en desc);

alter table public.eventos_usuario enable row level security;
revoke all on public.eventos_usuario from anon, authenticated;

-- La vista del perfil suma las columnas nuevas al final (así no cambia el
-- orden de las existentes).
create or replace view public.perfil_usuario
with (security_invoker = true)
as
select
  u.id,
  u.rol,
  u.nombre,
  u.telefono,
  u.telefono_verificado,
  u.email,
  u.whatsapp,
  u.saldo_billetera,
  u.created_at,
  u.updated_at,
  (d.usuario_id is not null) as es_conductor,
  d.tipo_vehiculo,
  d.placa,
  d.verificacion,
  d.estado as estado_conductor,
  d.motivo_rechazo,
  d.verificado_en,
  (u.rol = 'cliente') as puede_pedir_viajes,
  (d.verificacion = 'aprobado' and d.estado = 'activo') as puede_conducir,
  u.estado,
  u.ciudad,
  u.foto_url,
  u.acepta_promociones,
  u.origen_registro,
  (u.google_sub is not null) as tiene_google
from public.usuarios u
left join public.conductores_detalles d on d.usuario_id = u.id;
