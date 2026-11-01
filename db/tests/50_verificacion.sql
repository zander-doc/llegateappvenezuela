\set ON_ERROR_STOP on

-- Pruebas de verificación documental y antifraude.
-- Se ejecutan después de 10, 20, 30 y 40 sobre la misma base.

delete from public.conductores_documentos;
delete from public.eventos_seguridad;

update public.conductores_detalles
   set verificacion = 'pendiente',
       estado = 'inactivo_sin_saldo',
       motivo_rechazo = null,
       riesgo_puntaje = 0,
       riesgo_motivos = '[]'::jsonb,
       enviado_en = null,
       intentos_verificacion = 0
 where usuario_id in (
   '55555555-5555-5555-5555-555555555555',
   '66666666-6666-6666-6666-666666666666'
 );

create temp table _ctx (nombre text primary key, valor text);
\echo 'OK limpieza de documentos y eventos'

-- 1. Documentos incompletos y validaciones de registro ----------------------
do $$
declare
  r jsonb;
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  -- Sin documentos no se puede enviar.
  begin
    perform public.enviar_verificacion_conductor();
    raise exception 'envió sin documentos' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  -- Ruta de otro usuario: rechazada.
  begin
    perform public.registrar_documento_conductor(
      'cedula_frente', '66666666-6666-6666-6666-666666666666/foto.jpg',
      'image/jpeg', 1000, repeat('a', 64)
    );
    raise exception 'registró un documento en carpeta ajena' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  -- MIME y tamaño fuera de rango: rechazados.
  begin
    perform public.registrar_documento_conductor(
      'cedula_frente', v_uid::text || '/foto.gif', 'image/gif', 1000, repeat('a', 64)
    );
    raise exception 'aceptó un MIME no permitido' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
  begin
    perform public.registrar_documento_conductor(
      'cedula_frente', v_uid::text || '/foto.jpg', 'image/jpeg', 6000000, repeat('a', 64)
    );
    raise exception 'aceptó un archivo de 6 MB' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;

  -- Tres documentos todavía no alcanzan.
  r := public.registrar_documento_conductor(
    'cedula_frente', v_uid::text || '/cedula-frente.jpg', 'image/jpeg', 1200, repeat('a', 64),
    'listo', 'REPUBLICA BOLIVARIANA NUEVO PILOTO V-87654321', 0.92, '{"proveedor":"prueba"}'::jsonb
  );
  if not (r ->> 'ok')::boolean then raise exception 'registro: %', r; end if;
  if (r -> 'documento' ->> 'tipo') <> 'cedula_frente' then raise exception 'tipo: %', r; end if;

  perform public.registrar_documento_conductor(
    'cedula_reverso', v_uid::text || '/cedula-reverso.jpg', 'image/jpeg', 1100, repeat('b', 64),
    'listo', 'V-87654321', 0.9, '{}'::jsonb
  );
  perform public.registrar_documento_conductor(
    'licencia', v_uid::text || '/licencia.jpg', 'image/jpeg', 1300, repeat('c', 64),
    'listo', 'LICENCIA NUEVO PILOTO', 0.9, '{}'::jsonb
  );

  begin
    perform public.enviar_verificacion_conductor();
    raise exception 'envió con tres documentos' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;
\echo 'OK validaciones y documentos incompletos'

-- 2. Documento duplicado entre cuentas --------------------------------------
do $$
declare
  v_uid uuid := '66666666-6666-6666-6666-666666666666';
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  begin
    perform public.registrar_documento_conductor(
      'cedula_frente', v_uid::text || '/copiada.jpg', 'image/jpeg', 1200, repeat('a', 64),
      'listo', 'DOCUMENTO COPIADO', 0.9, '{}'::jsonb
    );
    raise exception 'aceptó el mismo archivo en otra cuenta' using errcode = 'ZZ999';
  exception when unique_violation then
    null;
  end;

  -- Un piloto aprobado no puede reemplazar documentos.
  update public.conductores_detalles
     set verificacion = 'aprobado', estado = 'activo'
   where usuario_id = v_uid;
  begin
    perform public.registrar_documento_conductor(
      'licencia', v_uid::text || '/nueva.jpg', 'image/jpeg', 1200, repeat('d', 64),
      'listo', 'LICENCIA NUEVA', 0.9, '{}'::jsonb
    );
    raise exception 'un aprobado reemplazó un documento' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
  update public.conductores_detalles
     set verificacion = 'pendiente', estado = 'inactivo_sin_saldo'
   where usuario_id = v_uid;
end $$;
\echo 'OK duplicado entre cuentas y bloqueo de aprobados'

-- 3. Envío exitoso sin señales de riesgo ------------------------------------
do $$
declare
  r jsonb;
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
  v_det public.conductores_detalles%rowtype;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  perform public.registrar_documento_conductor(
    'certificado_medico', v_uid::text || '/medico.jpg', 'image/jpeg', 1400, repeat('e', 64),
    'listo', 'CERTIFICADO MEDICO NUEVO PILOTO', 0.9, '{}'::jsonb
  );

  r := public.enviar_verificacion_conductor();
  if not (r ->> 'ok')::boolean then raise exception 'envío: %', r; end if;
  if (r ->> 'verificacion') <> 'pendiente' then raise exception 'verificación: %', r; end if;
  if (r ->> 'riesgo_puntaje')::int <> 0 then raise exception 'riesgo: %', r; end if;
  if (r ->> 'riesgo_nivel') <> 'bajo' then raise exception 'nivel: %', r; end if;
  if (r ->> 'documentos')::int <> 4 then raise exception 'documentos: %', r; end if;

  select * into v_det from public.conductores_detalles where usuario_id = v_uid;
  if v_det.enviado_en is null then raise exception 'no marcó enviado_en'; end if;
  if v_det.intentos_verificacion <> 1 then raise exception 'intentos: %', v_det.intentos_verificacion; end if;
  if jsonb_array_length(v_det.riesgo_motivos) <> 0 then
    raise exception 'motivos inesperados: %', v_det.riesgo_motivos;
  end if;

  if not exists (
    select 1 from public.eventos_seguridad
     where usuario_id = v_uid and tipo = 'verificacion_enviada'
  ) then
    raise exception 'no registró el evento de envío';
  end if;

  -- Reenviar sin cambios no duplica el puntaje, pero suma intento.
  r := public.enviar_verificacion_conductor();
  if (r ->> 'riesgo_puntaje')::int <> 0 then raise exception 'riesgo reenvío: %', r; end if;
  select * into v_det from public.conductores_detalles where usuario_id = v_uid;
  if v_det.intentos_verificacion <> 2 then raise exception 'intentos reenvío: %', v_det.intentos_verificacion; end if;
end $$;
\echo 'OK envío y reenvío sin riesgo'

-- 4. Riesgo alto: cédula, nombre, confianza y reintentos --------------------
do $$
declare
  r jsonb;
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
  v_det public.conductores_detalles%rowtype;
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_uid::text, true);

  update public.conductores_detalles
     set verificacion = 'rechazado',
         motivo_rechazo = 'Documento ilegible',
         intentos_verificacion = 2
   where usuario_id = v_uid;

  -- Se reemplazan los cuatro documentos con lecturas que no coinciden.
  perform public.registrar_documento_conductor(
    'cedula_frente', v_uid::text || '/frente-2.jpg', 'image/jpeg', 1200, repeat('1', 64),
    'listo', 'REPUBLICA V-11111111 OTRA PERSONA', 0.4, '{}'::jsonb
  );
  perform public.registrar_documento_conductor(
    'cedula_reverso', v_uid::text || '/reverso-2.jpg', 'image/jpeg', 1100, repeat('2', 64),
    'listo', 'V-11111111', 0.4, '{}'::jsonb
  );
  perform public.registrar_documento_conductor(
    'licencia', v_uid::text || '/licencia-2.jpg', 'image/jpeg', 1300, repeat('3', 64),
    'listo', 'LICENCIA OTRA PERSONA', 0.4, '{}'::jsonb
  );
  perform public.registrar_documento_conductor(
    'certificado_medico', v_uid::text || '/medico-2.jpg', 'image/jpeg', 1400, repeat('4', 64),
    'listo', 'CERTIFICADO OTRA PERSONA', 0.4, '{}'::jsonb
  );

  r := public.enviar_verificacion_conductor();
  if (r ->> 'riesgo_puntaje')::int < 90 then raise exception 'riesgo esperado >= 90: %', r; end if;
  if (r ->> 'riesgo_nivel') <> 'alto' then raise exception 'nivel esperado alto: %', r; end if;
  if (r ->> 'verificacion') <> 'pendiente' then raise exception 'verificación: %', r; end if;

  select * into v_det from public.conductores_detalles where usuario_id = v_uid;
  if v_det.motivo_rechazo is not null then raise exception 'conservó el motivo de rechazo'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_det.riesgo_motivos) e
     where e ->> 'codigo' = 'cedula_no_coincide'
  ) then raise exception 'falta la señal de cédula: %', v_det.riesgo_motivos; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_det.riesgo_motivos) e
     where e ->> 'codigo' = 'nombre_no_coincide'
  ) then raise exception 'falta la señal de nombre: %', v_det.riesgo_motivos; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_det.riesgo_motivos) e
     where e ->> 'codigo' = 'ocr_baja_confianza'
  ) then raise exception 'falta la señal de confianza: %', v_det.riesgo_motivos; end if;
  if not exists (
    select 1 from public.eventos_seguridad
     where usuario_id = v_uid and tipo = 'verificacion_enviada' and severidad = 'alerta'
  ) then raise exception 'el riesgo alto no quedó como alerta'; end if;
end $$;
\echo 'OK scoring de riesgo alto'

-- 5. Aprobación y rechazo dejan auditoría -----------------------------------
do $$
declare
  r jsonb;
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
  v_admin text := '33333333-3333-3333-3333-333333333333';
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_admin, true);

  r := public.verificar_conductor(v_uid, false, 'Los documentos no coinciden con la persona');
  if (r ->> 'verificacion') <> 'rechazado' then raise exception 'rechazo: %', r; end if;

  if not exists (
    select 1 from public.eventos_seguridad
     where usuario_id = v_uid and tipo = 'conductor_rechazado' and severidad = 'alerta'
       and detalle ->> 'verificado_por' = v_admin
  ) then raise exception 'no auditó el rechazo'; end if;

  r := public.verificar_conductor(v_uid, true, null);
  if (r ->> 'verificacion') <> 'aprobado' then raise exception 'aprobación: %', r; end if;
  if not exists (
    select 1 from public.eventos_seguridad
     where usuario_id = v_uid and tipo = 'conductor_aprobado'
       and detalle ->> 'verificado_por' = v_admin
  ) then raise exception 'no auditó la aprobación'; end if;

  -- Un aprobado no vuelve a enviar verificación.
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  begin
    perform public.enviar_verificacion_conductor();
    raise exception 'un aprobado reenvió la verificación' using errcode = 'ZZ999';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;
\echo 'OK auditoría de aprobación y rechazo'

-- 6. RLS de documentos y eventos --------------------------------------------
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
set role authenticated;

do $$
declare
  n int;
begin
  select count(*) into n from public.conductores_documentos where usuario_id <> auth.uid();
  if n <> 0 then raise exception 'RLS documentos: ve % ajenos', n; end if;

  select count(*) into n from public.eventos_seguridad;
  if n <> 0 then raise exception 'RLS eventos: un piloto ve % eventos', n; end if;

  begin
    insert into public.conductores_documentos (
      usuario_id, tipo, storage_path, mime, bytes, hash_sha256
    ) values (
      auth.uid(), 'licencia', auth.uid()::text || '/directa.jpg', 'image/jpeg', 10, repeat('9', 64)
    );
    raise exception 'el piloto insertó un documento directo' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;

do $$
declare
  n int;
begin
  select count(*) into n from public.conductores_documentos;
  if n < 4 then raise exception 'el admin ve % documentos', n; end if;

  select count(*) into n from public.eventos_seguridad;
  if n < 5 then raise exception 'el admin ve % eventos', n; end if;
end $$;

reset role;
\echo 'OK RLS de documentos y eventos'

\echo 'TODAS LAS PRUEBAS DE VERIFICACIÓN PASARON'
