-- Llégate App · tipos de la bandeja de solicitudes
--
-- Va aparte de `...120100_llegate_solicitudes.sql` a propósito: PostgreSQL no
-- permite usar un valor de enum en la misma transacción que crea el tipo, y el
-- aplicador (`server/scripts/migrate.mjs`) envuelve cada archivo en una.

create type public.tipo_solicitud as enum (
  'contacto',
  'empresa',
  'aliado',
  'lanzamiento',
  'conductor',
  'cobertura',
  'plan'
);

create type public.estado_solicitud as enum ('nueva', 'en_curso', 'respondida', 'archivada');
