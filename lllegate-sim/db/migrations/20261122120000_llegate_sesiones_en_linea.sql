-- Cada vez que un piloto se conecta o se desconecta queda una fila. Con esto se
-- miden las horas en línea para la evaluación de uso. Una sesión sin cerrar
-- cuenta como máximo 12 horas (es lo que dura el "En línea" sin renovarse).

create table if not exists public.sesiones_en_linea (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  desde timestamptz not null default now(),
  hasta timestamptz,
  constraint sesion_en_linea_orden check (hasta is null or hasta >= desde)
);

-- Un piloto no puede tener dos sesiones abiertas a la vez.
create unique index if not exists sesiones_en_linea_abierta_idx
  on public.sesiones_en_linea (usuario_id)
  where hasta is null;

create index if not exists sesiones_en_linea_usuario_idx
  on public.sesiones_en_linea (usuario_id, desde desc);

alter table public.sesiones_en_linea enable row level security;
revoke all on public.sesiones_en_linea from anon, authenticated;
