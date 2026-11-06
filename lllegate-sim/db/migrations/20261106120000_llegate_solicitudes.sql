-- Llégate App · solicitudes de contacto, conductores y listas de espera
--
-- Mientras no hubo base de datos, estos formularios guardaban en el navegador
-- del visitante (localStorage) y avisaban que era una demo. La bandeja real
-- vive aquí: el sitio publica una fila por envío y el equipo de operaciones la
-- clasifica desde el panel.
--
-- Flujo de una solicitud:
--   nueva → en_curso → respondida
--                    ↘ archivada
--
-- El formulario es público, así que la tabla solo acepta `insert` desde `anon`
-- con estado `nueva`: quien envía no puede leer ni editar lo que otros
-- enviaron. Ver y clasificar es solo del rol admin.

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

-- ---------------------------------------------------------------------------
-- Bandeja de solicitudes
-- ---------------------------------------------------------------------------
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_solicitud not null,
  estado public.estado_solicitud not null default 'nueva',
  nombre text,
  contacto text not null,
  ciudad text,
  mensaje text,
  datos jsonb not null default '{}'::jsonb,
  origen text,
  nota_admin text,
  atendida_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solicitud_nombre_corto check (
    nombre is null or char_length(btrim(nombre)) between 2 and 120
  ),
  constraint solicitud_contacto_presente check (char_length(btrim(contacto)) between 3 and 200),
  constraint solicitud_ciudad_corta check (ciudad is null or char_length(btrim(ciudad)) <= 120),
  constraint solicitud_mensaje_limitado check (
    mensaje is null or char_length(btrim(mensaje)) <= 2000
  ),
  constraint solicitud_origen_corto check (origen is null or char_length(btrim(origen)) <= 200),
  constraint solicitud_nota_limitada check (
    nota_admin is null or char_length(btrim(nota_admin)) <= 500
  ),
  constraint solicitud_datos_objeto check (jsonb_typeof(datos) = 'object'),
  -- Fuera de `nueva` la fila ya fue tocada por alguien, y eso debe tener fecha.
  constraint solicitud_gestion_con_fecha check (estado = 'nueva' or atendida_en is not null)
);

comment on table public.solicitudes is
  'Bandeja única de formularios del sitio: contacto, empresas, aliados, aviso de lanzamiento, '
  'postulaciones de piloto, pedidos de cobertura e interés por un plan.';
comment on column public.solicitudes.contacto is
  'Correo o teléfono E.164 del visitante. Es el canal por donde se le responde.';
comment on column public.solicitudes.datos is
  'Contexto del formulario (plan, servicio, plataforma, experiencia). Sin credenciales ni documentos.';

create index solicitudes_nuevas_idx on public.solicitudes (tipo, created_at desc)
  where estado = 'nueva';
create index solicitudes_estado_idx on public.solicitudes (estado, created_at desc);

create trigger solicitudes_touch before update on public.solicitudes
  for each row execute function public.touch_updated_at();

alter table public.solicitudes enable row level security;

-- El público solo crea solicitudes nuevas y sin estado inventado.
create policy "solicitudes_crear_publico"
  on public.solicitudes for insert to anon, authenticated
  with check (estado = 'nueva' and atendida_en is null);

-- La bandeja la ve y la mueve únicamente el equipo de operaciones.
create policy "solicitudes_ver_admin"
  on public.solicitudes for select to authenticated
  using (public.es_admin());

create policy "solicitudes_editar_admin"
  on public.solicitudes for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

revoke all on public.solicitudes from anon, authenticated;
-- `trigger` hace falta porque la tabla tiene `solicitudes_touch`: Postgres lo
-- exige a quien ejecuta el statement, aunque ese disparador solo corre en update.
grant insert, trigger on public.solicitudes to anon, authenticated;
grant select, update, trigger on public.solicitudes to authenticated;
grant select, insert, update, delete on public.solicitudes to service_role;
