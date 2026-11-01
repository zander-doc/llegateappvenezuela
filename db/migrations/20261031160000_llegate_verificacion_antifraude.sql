-- Llégate App · verificación documental y antifraude
--
-- El registro de conductores existente acepta tres rutas de documentos como
-- texto libre y marca al piloto como "pendiente" sin revisar nada. Esta
-- migración agrega lo mínimo para que la verificación sea real:
--
--   1. Un registro por documento con MIME, tamaño y SHA-256. El hash es único
--      en toda la base: la misma foto no puede respaldar dos cuentas.
--   2. Resultado del OCR por documento (texto, confianza y datos del proveedor).
--   3. Un puntaje de riesgo explicable, calculado al enviar la verificación.
--   4. Un libro de eventos de seguridad para auditoría.
--
-- El OCR nunca decide por sí solo: el piloto queda en revisión humana y el
-- operador ve el puntaje, los motivos y el texto leído. Un puntaje alto ordena
-- la cola y exige más atención, no bloquea automáticamente.
--
-- Los documentos viven en el bucket privado `documentos-conductores` (carpeta
-- del propio usuario). Los archivos se suben con el JWT del piloto; las filas
-- de `conductores_documentos` solo se escriben mediante RPC security definer.

create type public.tipo_documento_conductor as enum (
  'cedula_frente',
  'cedula_reverso',
  'licencia',
  'certificado_medico'
);

create type public.estado_ocr as enum ('no_configurado', 'listo', 'fallido');

-- ---------------------------------------------------------------------------
-- Documentos registrados
-- ---------------------------------------------------------------------------
create table public.conductores_documentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  tipo public.tipo_documento_conductor not null,
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/'),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes integer not null check (bytes between 1 and 5242880),
  hash_sha256 text not null check (hash_sha256 ~ '^[0-9a-f]{64}$'),
  ocr_estado public.estado_ocr not null default 'no_configurado',
  ocr_texto text check (ocr_texto is null or char_length(ocr_texto) <= 20000),
  ocr_confianza numeric(4, 3) check (ocr_confianza between 0 and 1),
  ocr_datos jsonb not null default '{}'::jsonb check (jsonb_typeof(ocr_datos) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conductor_documento_unico_por_tipo unique (usuario_id, tipo),
  constraint conductor_documento_hash_unico unique (hash_sha256),
  constraint conductor_documento_ocr_listo check (ocr_estado <> 'listo' or ocr_texto is not null)
);

create index conductores_documentos_usuario_idx
  on public.conductores_documentos (usuario_id);

create trigger conductores_documentos_touch before update on public.conductores_documentos
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Riesgo y trazabilidad del envío
-- ---------------------------------------------------------------------------
-- Las rutas sueltas de la primera versión quedan como legado: el flujo nuevo
-- sube los archivos a conductores_documentos, así que ya no son obligatorias.
alter table public.conductores_detalles
  alter column cedula_url drop not null,
  alter column licencia_url drop not null,
  alter column certificado_medico_url drop not null;

alter table public.conductores_detalles
  add column riesgo_puntaje smallint not null default 0
    check (riesgo_puntaje between 0 and 100),
  add column riesgo_motivos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(riesgo_motivos) = 'array'),
  add column enviado_en timestamptz,
  add column intentos_verificacion smallint not null default 0
    check (intentos_verificacion >= 0);

comment on column public.conductores_detalles.riesgo_puntaje is
  '0-100. Suma explicable de señales de riesgo; no es un veredicto automático.';
comment on column public.conductores_detalles.riesgo_motivos is
  'Lista de {codigo, peso, detalle} que explica el puntaje.';
comment on column public.conductores_detalles.intentos_verificacion is
  'Envíos acumulados. Reintentar varias veces sube el riesgo.';

-- ---------------------------------------------------------------------------
-- Eventos de seguridad (solo lectura para administración)
-- ---------------------------------------------------------------------------
create table public.eventos_seguridad (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.usuarios (id) on delete set null,
  tipo text not null check (char_length(btrim(tipo)) between 3 and 60),
  severidad text not null default 'info' check (severidad in ('info', 'alerta', 'critico')),
  detalle jsonb not null default '{}'::jsonb check (jsonb_typeof(detalle) = 'object'),
  created_at timestamptz not null default now()
);

create index eventos_seguridad_usuario_idx
  on public.eventos_seguridad (usuario_id, created_at desc);
create index eventos_seguridad_tipo_idx
  on public.eventos_seguridad (tipo, created_at desc);

alter table public.conductores_documentos enable row level security;
alter table public.eventos_seguridad enable row level security;

create policy "conductores_documentos_ver_propios_o_admin"
  on public.conductores_documentos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

create policy "eventos_seguridad_solo_admin"
  on public.eventos_seguridad for select to authenticated
  using (public.es_admin());

revoke all on public.conductores_documentos from anon, authenticated;
grant select on public.conductores_documentos to authenticated;
grant select, insert, update, delete on public.conductores_documentos to service_role;

revoke all on public.eventos_seguridad from anon, authenticated;
revoke all on sequence public.eventos_seguridad_id_seq from anon, authenticated;
grant select on public.eventos_seguridad to authenticated;
grant select, insert, update, delete on public.eventos_seguridad to service_role;
grant usage, select on sequence public.eventos_seguridad_id_seq to service_role;

-- Reemplazar un documento deja el archivo anterior huérfano en el bucket; el
-- piloto puede borrar solo su propia carpeta para limpiarlo.
create policy "documentos_conductor_borra"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documentos-conductores'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Registrar (o reemplazar) un documento con su resultado de OCR
-- ---------------------------------------------------------------------------
create function public.registrar_documento_conductor(
  p_tipo public.tipo_documento_conductor,
  p_storage_path text,
  p_mime text,
  p_bytes integer,
  p_hash_sha256 text,
  p_ocr_estado public.estado_ocr default 'no_configurado',
  p_ocr_texto text default null,
  p_ocr_confianza numeric default null,
  p_ocr_datos jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_verificacion public.estado_verificacion;
  v_doc public.conductores_documentos%rowtype;
  v_texto text := nullif(btrim(coalesce(p_ocr_texto, '')), '');
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_storage_path is null or p_storage_path not like v_uid::text || '/%' then
    raise exception 'RUTA_INVALIDA' using errcode = 'P0001';
  end if;
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'MIME_INVALIDO' using errcode = 'P0001';
  end if;
  if p_bytes is null or p_bytes < 1 or p_bytes > 5242880 then
    raise exception 'TAMANO_INVALIDO' using errcode = 'P0001';
  end if;
  if p_hash_sha256 is null or p_hash_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'HASH_INVALIDO' using errcode = 'P0001';
  end if;
  if p_ocr_estado <> 'listo' and p_ocr_estado <> 'fallido' and p_ocr_estado <> 'no_configurado' then
    raise exception 'OCR_ESTADO_INVALIDO' using errcode = 'P0001';
  end if;
  if p_ocr_estado = 'listo' and v_texto is null then
    raise exception 'OCR_SIN_TEXTO' using errcode = 'P0001';
  end if;
  if p_ocr_datos is null or jsonb_typeof(p_ocr_datos) <> 'object' then
    raise exception 'OCR_DATOS_INVALIDOS' using errcode = 'P0001';
  end if;
  if p_ocr_confianza is not null and (p_ocr_confianza < 0 or p_ocr_confianza > 1) then
    raise exception 'OCR_CONFIANZA_INVALIDA' using errcode = 'P0001';
  end if;

  select verificacion into v_verificacion
    from public.conductores_detalles
   where usuario_id = v_uid;
  if v_verificacion = 'aprobado' then
    raise exception 'CONDUCTOR_YA_APROBADO' using errcode = 'P0001';
  end if;

  -- El mismo archivo no puede acreditar a dos cuentas. Es la señal antifraude
  -- más fuerte que podemos calcular sin proveedores externos.
  if exists (
    select 1 from public.conductores_documentos
     where hash_sha256 = p_hash_sha256 and usuario_id <> v_uid
  ) then
    raise exception 'DOCUMENTO_DUPLICADO' using errcode = '23505';
  end if;

  begin
    insert into public.conductores_documentos (
      usuario_id, tipo, storage_path, mime, bytes, hash_sha256,
      ocr_estado, ocr_texto, ocr_confianza, ocr_datos
    )
    values (
      v_uid, p_tipo, p_storage_path, p_mime, p_bytes, p_hash_sha256,
      p_ocr_estado, v_texto, p_ocr_confianza, p_ocr_datos
    )
    on conflict (usuario_id, tipo) do update
      set storage_path = excluded.storage_path,
          mime = excluded.mime,
          bytes = excluded.bytes,
          hash_sha256 = excluded.hash_sha256,
          ocr_estado = excluded.ocr_estado,
          ocr_texto = excluded.ocr_texto,
          ocr_confianza = excluded.ocr_confianza,
          ocr_datos = excluded.ocr_datos
    returning * into v_doc;
  exception when unique_violation then
    raise exception 'DOCUMENTO_DUPLICADO' using errcode = '23505';
  end;

  return jsonb_build_object(
    'ok', true,
    'documento', jsonb_build_object(
      'id', v_doc.id,
      'tipo', v_doc.tipo,
      'mime', v_doc.mime,
      'bytes', v_doc.bytes,
      'ocr_estado', v_doc.ocr_estado,
      'ocr_confianza', v_doc.ocr_confianza,
      'created_at', v_doc.created_at,
      'updated_at', v_doc.updated_at
    )
  );
end;
$$;

revoke all on function public.registrar_documento_conductor(
  public.tipo_documento_conductor, text, text, integer, text, public.estado_ocr, text, numeric, jsonb
) from public, anon;
grant execute on function public.registrar_documento_conductor(
  public.tipo_documento_conductor, text, text, integer, text, public.estado_ocr, text, numeric, jsonb
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enviar la verificación y calcular riesgo
--
-- Requiere los cuatro documentos. El OCR es opcional (si el proveedor no está
-- configurado, el operador revisa a mano), pero cuando está disponible se
-- contrasta la cédula y el nombre leídos contra lo declarado.
-- ---------------------------------------------------------------------------
create function public.enviar_verificacion_conductor()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_detalle public.conductores_detalles%rowtype;
  v_nombre public.usuarios.nombre%type;
  v_docs int;
  v_ocr_count int;
  v_texto_cedula text := '';
  v_texto_licencia text := '';
  v_confianza_min numeric;
  v_cedula_digitos text;
  v_ocr_digitos text;
  v_normalizado text;
  v_token text;
  v_motivos jsonb := '[]'::jsonb;
  v_puntaje int := 0;
  v_nivel text;
  v_enviado timestamptz := now();
  v_sin_ocr boolean := false;
begin
  if v_uid is null then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;

  select * into v_detalle from public.conductores_detalles
   where usuario_id = v_uid
   for update;
  if not found then
    raise exception 'CONDUCTOR_NO_ENCONTRADO' using errcode = 'P0002';
  end if;
  if v_detalle.verificacion = 'aprobado' then
    raise exception 'CONDUCTOR_YA_APROBADO' using errcode = 'P0001';
  end if;
  if v_detalle.estado = 'bloqueado' then
    raise exception 'CONDUCTOR_BLOQUEADO' using errcode = 'P0001';
  end if;

  select count(distinct tipo) into v_docs
    from public.conductores_documentos
   where usuario_id = v_uid
     and tipo in ('cedula_frente', 'cedula_reverso', 'licencia', 'certificado_medico');
  if v_docs < 4 then
    raise exception 'DOCUMENTOS_INCOMPLETOS: faltan % de 4', 4 - v_docs using errcode = 'P0001';
  end if;

  select count(*) filter (where ocr_estado = 'listo'),
         min(ocr_confianza) filter (where ocr_estado = 'listo'),
         coalesce(max(ocr_texto) filter (where tipo = 'cedula_frente' and ocr_estado = 'listo'), ''),
         coalesce(max(ocr_texto) filter (where tipo in ('licencia', 'cedula_reverso') and ocr_estado = 'listo'), '')
    into v_ocr_count, v_confianza_min, v_texto_cedula, v_texto_licencia
    from public.conductores_documentos
   where usuario_id = v_uid;

  v_sin_ocr := v_ocr_count = 0;

  if not v_sin_ocr then
    v_cedula_digitos := regexp_replace(v_detalle.cedula, '[^0-9]', '', 'g');
    v_ocr_digitos := regexp_replace(v_texto_cedula, '[^0-9]', '', 'g');
    if v_ocr_digitos <> '' and position(v_cedula_digitos in v_ocr_digitos) = 0 then
      v_puntaje := v_puntaje + 40;
      v_motivos := v_motivos || jsonb_build_object(
        'codigo', 'cedula_no_coincide',
        'peso', 40,
        'detalle', 'El número leído en la cédula no coincide con el declarado.'
      );
    end if;

    select nombre into v_nombre from public.usuarios where id = v_uid;
    v_normalizado := lower(translate(
      coalesce(v_texto_cedula, '') || ' ' || coalesce(v_texto_licencia, ''),
      'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'
    ));
    foreach v_token in array regexp_split_to_array(lower(translate(coalesce(v_nombre, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '\s+')
    loop
      if char_length(v_token) >= 4 and position(v_token in v_normalizado) = 0 then
        v_puntaje := v_puntaje + 25;
        v_motivos := v_motivos || jsonb_build_object(
          'codigo', 'nombre_no_coincide',
          'peso', 25,
          'detalle', format('No encontramos «%s» en los documentos leídos.', v_token)
        );
        exit;
      end if;
    end loop;

    if v_confianza_min is not null and v_confianza_min < 0.6 then
      v_puntaje := v_puntaje + 15;
      v_motivos := v_motivos || jsonb_build_object(
        'codigo', 'ocr_baja_confianza',
        'peso', 15,
        'detalle', format('La lectura automática tiene confianza %s%%.', round(v_confianza_min * 100))
      );
    end if;
  end if;

  if v_detalle.intentos_verificacion >= 2 then
    v_puntaje := v_puntaje + 10;
    v_motivos := v_motivos || jsonb_build_object(
      'codigo', 'reintentos',
      'peso', 10,
      'detalle', format('Es el envío número %s.', v_detalle.intentos_verificacion + 1)
    );
  end if;

  if v_sin_ocr then
    v_motivos := v_motivos || jsonb_build_object(
      'codigo', 'ocr_no_disponible',
      'peso', 0,
      'detalle', 'No hay lectura automática; el operador revisa los documentos a mano.'
    );
  end if;

  v_puntaje := least(v_puntaje, 100);
  v_nivel := case
               when v_puntaje >= 50 then 'alto'
               when v_puntaje >= 20 then 'medio'
               else 'bajo'
             end;

  update public.conductores_detalles
     set verificacion = 'pendiente',
         motivo_rechazo = null,
         enviado_en = v_enviado,
         riesgo_puntaje = v_puntaje,
         riesgo_motivos = v_motivos,
         intentos_verificacion = intentos_verificacion + 1
   where usuario_id = v_uid;

  insert into public.eventos_seguridad (usuario_id, tipo, severidad, detalle)
  values (
    v_uid,
    'verificacion_enviada',
    case when v_nivel = 'alto' then 'alerta' else 'info' end,
    jsonb_build_object(
      'riesgo_puntaje', v_puntaje,
      'riesgo_nivel', v_nivel,
      'motivos', v_motivos,
      'documentos', v_docs,
      'ocr_disponible', not v_sin_ocr
    )
  );

  return jsonb_build_object(
    'ok', true,
    'verificacion', 'pendiente',
    'riesgo_puntaje', v_puntaje,
    'riesgo_nivel', v_nivel,
    'motivos', v_motivos,
    'documentos', v_docs,
    'enviado_en', v_enviado
  );
end;
$$;

revoke all on function public.enviar_verificacion_conductor() from public, anon;
grant execute on function public.enviar_verificacion_conductor() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Auditoría de aprobaciones y rechazos
--
-- `verificar_conductor` ya existe y se mantiene igual: este trigger registra
-- cada cambio de estado sin duplicar su lógica de saldo y bienvenida.
-- ---------------------------------------------------------------------------
create function public.auditar_verificacion_conductor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verificacion is distinct from old.verificacion then
    insert into public.eventos_seguridad (usuario_id, tipo, severidad, detalle)
    values (
      new.usuario_id,
      case new.verificacion
        when 'aprobado' then 'conductor_aprobado'
        when 'rechazado' then 'conductor_rechazado'
        else 'conductor_reenviado'
      end,
      case when new.verificacion = 'rechazado' then 'alerta' else 'info' end,
      jsonb_build_object(
        'anterior', old.verificacion,
        'nuevo', new.verificacion,
        'verificado_por', new.verificado_por,
        'motivo', new.motivo_rechazo,
        'riesgo_puntaje', new.riesgo_puntaje
      )
    );
  end if;
  return new;
end;
$$;

create trigger conductores_auditoria_verificacion
  after update on public.conductores_detalles
  for each row execute function public.auditar_verificacion_conductor();

comment on table public.conductores_documentos is
  'Documentos privados del piloto con hash único y resultado de OCR.';
comment on table public.eventos_seguridad is
  'Bitácora de envíos, aprobaciones, rechazos y señales antifraude.';
comment on function public.enviar_verificacion_conductor() is
  'Valida los cuatro documentos, calcula riesgo explicable y deja al piloto en revisión.';
