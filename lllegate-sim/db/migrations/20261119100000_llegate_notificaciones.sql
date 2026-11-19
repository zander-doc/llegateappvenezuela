-- Avisos dentro de la web y la app (por ahora: aprobación o rechazo del piloto).
-- Aditivo: solo crea una tabla nueva. Solo el API (propietario) escribe y lee.

create table if not exists public.notificaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo text not null check (char_length(tipo) between 2 and 60),
  titulo text not null check (char_length(titulo) between 1 and 120),
  cuerpo text not null default '' check (char_length(cuerpo) <= 600),
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists notificaciones_usuario_idx
  on public.notificaciones (usuario_id, creado_en desc);
create index if not exists notificaciones_sin_leer_idx
  on public.notificaciones (usuario_id) where leida_en is null;

alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from anon, authenticated;
