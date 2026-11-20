-- Piloto "En línea": el piloto avisa que está disponible y el pasajero lo ve
-- en sus favoritos. Es independiente de `estado` (que depende del saldo).
-- Un "en línea" se considera vigente 12 horas si el piloto no lo renueva.

alter table public.conductores_detalles
  add column if not exists en_linea boolean not null default false,
  add column if not exists en_linea_actualizado_en timestamptz;

comment on column public.conductores_detalles.en_linea is
  'El piloto indicó que está disponible. Vigente solo si en_linea_actualizado_en tiene menos de 12 horas.';

create index if not exists conductores_en_linea_idx
  on public.conductores_detalles (en_linea)
  where en_linea;
