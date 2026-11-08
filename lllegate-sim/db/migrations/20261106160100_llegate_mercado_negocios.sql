-- Llégate App · vitrina real del Mercado Motor
--
-- La página llevaba meses diciendo "0 negocios" porque no existía ninguna tabla
-- donde vivirán las fichas (ver `db/README.md`). Aquí nace esa tabla: el dueño
-- publica su negocio, operaciones lo revisa y solo lo que quedó `publicado`
-- aparece en la vitrina.
--
-- Flujo de una ficha:
--   pendiente → publicado → archivado
--             ↘ rechazado (con motivo) → pendiente (otra revisión)
--
-- `contacto` es el canal privado para confirmar que el negocio es suyo; lo que
-- se muestra al público es `telefono_publico`. `verificado` lo pone únicamente
-- operaciones: es el sello que la web prometió desde el principio.

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  categoria text not null,
  estado public.estado_negocio not null default 'pendiente',
  ciudad text not null,
  zona text,
  direccion text,
  horario text,
  oferta text,
  descripcion text,
  sitio text,
  contacto text not null,
  telefono_publico text,
  verificado boolean not null default false,
  motivo_rechazo text,
  nota_admin text,
  usuario_id uuid references public.usuarios (id) on delete set null,
  publicada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint negocio_nombre_corto check (char_length(btrim(nombre)) between 3 and 120),
  constraint negocio_slug_valido check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+){0,7}$' and char_length(slug) between 3 and 80
  ),
  constraint negocio_categoria_conocida check (
    categoria in ('repuestos', 'talleres', 'cauchos', 'gruas', 'lubricantes', 'accesorios')
  ),
  constraint negocio_ciudad_corta check (char_length(btrim(ciudad)) between 2 and 80),
  constraint negocio_zona_corta check (zona is null or char_length(btrim(zona)) <= 120),
  constraint negocio_direccion_corta check (direccion is null or char_length(btrim(direccion)) <= 240),
  constraint negocio_horario_corto check (horario is null or char_length(btrim(horario)) <= 240),
  constraint negocio_oferta_corta check (oferta is null or char_length(btrim(oferta)) <= 500),
  constraint negocio_descripcion_corta check (
    descripcion is null or char_length(btrim(descripcion)) <= 2000
  ),
  constraint negocio_sitio_valido check (
    sitio is null or (char_length(btrim(sitio)) <= 300 and sitio ~ '^https?://')
  ),
  constraint negocio_contacto_presente check (char_length(btrim(contacto)) between 3 and 200),
  constraint negocio_telefono_corto check (
    telefono_publico is null or char_length(btrim(telefono_publico)) <= 40
  ),
  constraint negocio_rechazo_con_motivo check (
    estado <> 'rechazado' or char_length(btrim(coalesce(motivo_rechazo, ''))) >= 3
  ),
  -- Nada sale publicado sin revisión, y lo publicado lleva su fecha.
  constraint negocio_publicado_con_fecha check (
    estado <> 'publicado' or publicada_en is not null
  )
);

comment on table public.negocios is
  'Fichas del Mercado Motor: negocios del mundo motor que aparecen en la vitrina solo después de la revisión de operaciones.';
comment on column public.negocios.contacto is
  'Correo o teléfono E.164 del dueño, para confirmar que el negocio es suyo. No se publica.';
comment on column public.negocios.telefono_publico is
  'El contacto que la vitrina muestra a pasajeros y pilotos.';
comment on column public.negocios.verificado is
  'Sello Verificado: solo lo pone operaciones, nunca el formulario público.';

create index negocios_publicados_idx on public.negocios (ciudad, categoria, publicada_en desc)
  where estado = 'publicado';
create index negocios_estado_idx on public.negocios (estado, created_at desc);

create trigger negocios_touch before update on public.negocios
  for each row execute function public.touch_updated_at();

alter table public.negocios enable row level security;

-- La vitrina pública muestra únicamente fichas publicadas. Se separa en dos
-- policies porque `es_admin()` no es ejecutable por el rol anónimo: si una
-- sola policy lo llamara para `anon`, la lectura completa fallaría con 42501.
create policy "negocios_ver_vitrina"
  on public.negocios for select to anon
  using (estado = 'publicado');

-- Un cliente registrado ve la vitrina; operaciones ve además la cola pendiente.
create policy "negocios_ver_autenticado"
  on public.negocios for select to authenticated
  using (estado = 'publicado' or public.es_admin());

-- El formulario público crea fichas pendientes: sin sello y sin fecha.
create policy "negocios_crear_publico"
  on public.negocios for insert to anon, authenticated
  with check (estado = 'pendiente' and verificado = false and publicada_en is null);

-- Revisar, publicar, rechazar o archivar es solo de operaciones.
create policy "negocios_editar_admin"
  on public.negocios for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

revoke all on public.negocios from anon, authenticated;
-- `trigger` hace falta porque la tabla tiene `negocios_touch`: Postgres lo
-- exige a quien ejecuta el statement, aunque ese disparador solo corre en update.
grant select, insert, trigger on public.negocios to anon, authenticated;
grant select, update, trigger on public.negocios to authenticated;
grant select, insert, update, delete on public.negocios to service_role;
