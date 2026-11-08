-- Llégate App · estado de revisión de un negocio del Mercado Motor
--
-- Va aparte de `...160100_llegate_mercado_negocios.sql` porque PostgreSQL no
-- deja usar un valor de enum en la misma transacción que crea el tipo, y el
-- aplicador (`server/scripts/migrate.mjs`) envuelve cada archivo en una.

create type public.estado_negocio as enum ('pendiente', 'publicado', 'rechazado', 'archivado');
