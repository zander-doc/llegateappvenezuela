\set ON_ERROR_STOP on

-- Pruebas de la bandeja de solicitudes: los formularios del sitio.
-- Se ejecuta después de 10, 20, 30, 40 y 50 sobre la misma base.
--
-- Lo que se cuida aquí es la frontera del formulario público: quien envía
-- puede crear una solicitud `nueva`, no puede leerla ni clasificarla, y solo
-- el rol admin gestiona la bandeja.
--
-- Como en 30_identidad.sql, el cambio de rol se hace con `set role` fuera del
-- bloque: dentro de `do $$ ... $$` no surte efecto sobre el DML. El id de la
-- fila viaja por un GUC en lugar de la tabla temporal, porque `_ctx` la dueña
-- es la conexión de pruebas y los roles anon/authenticated no pueden escribir
-- en ella.

delete from public.solicitudes;

create temp table _ctx (nombre text primary key, valor text);
\echo 'OK limpieza de solicitudes'

-- 1. El público crea una solicitud nueva ------------------------------------
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);

set role anon;

do $$
begin
  insert into public.solicitudes (tipo, nombre, contacto, ciudad, mensaje, datos, origen)
       values ('lanzamiento', 'Panita', '+584141234567', 'Maracaibo',
               'Avísenme cuando abran en mi ciudad', '{"plataforma":"android"}'::jsonb, '/app');
end $$;

reset role;

do $$
declare
  v_id uuid;
begin
  select id into v_id from public.solicitudes
   where tipo = 'lanzamiento' and contacto = '+584141234567';

  if v_id is null then
    raise exception 'el envío público no dejó fila';
  end if;

  perform set_config('test.solicitud_id', v_id::text, false);
  insert into _ctx values ('solicitud', v_id::text);

  if (select estado from public.solicitudes where id = v_id) <> 'nueva' then
    raise exception 'la solicitud no nació en estado nueva';
  end if;

  if (select datos ->> 'plataforma' from public.solicitudes where id = v_id) <> 'android' then
    raise exception 'se perdió el contexto del formulario';
  end if;
end $$;
\echo 'OK el público crea una solicitud en estado nueva'

-- 2. El público no puede inventarse un estado gestionado --------------------
select set_config('request.jwt.claim.role', 'anon', false);

set role anon;

do $$
begin
  begin
    insert into public.solicitudes (tipo, contacto, estado, atendida_en)
         values ('contacto', 'alguien@example.com', 'respondida', now());
    raise exception 'anon insertó una solicitud ya respondida' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- 3. Leer la bandeja no es del público --------------------------------------
do $$
declare
  n integer;
begin
  begin
    select count(*) into n from public.solicitudes;
    raise exception 'anon leyó % solicitudes', n using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
\echo 'OK anon solo crea: no elige estado ni lee la bandeja'

-- 4. Un cliente autenticado no ve ni mueve la bandeja -----------------------
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

set role authenticated;

do $$
declare
  n integer;
  v_id uuid := current_setting('test.solicitud_id')::uuid;
begin
  select count(*) into n from public.solicitudes;
  if n <> 0 then
    raise exception 'un cliente sin rol admin ve % solicitudes', n;
  end if;

  -- Por RLS la fila no aparece: el update no encuentra a nadie que mover.
  update public.solicitudes
     set estado = 'respondida', atendida_en = now()
   where id = v_id;
end $$;

reset role;

do $$
declare
  v_id uuid := current_setting('test.solicitud_id')::uuid;
begin
  if (select estado from public.solicitudes where id = v_id) <> 'nueva' then
    raise exception 'un cliente movió el estado de una solicitud';
  end if;
end $$;
\echo 'OK la bandeja queda fuera del alcance de un cliente'

-- 5. El admin ve, gestiona y deja fecha ------------------------------------
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

set role authenticated;

do $$
declare
  n integer;
  v_id uuid := current_setting('test.solicitud_id')::uuid;
begin
  select count(*) into n from public.solicitudes where id = v_id;
  if n <> 1 then
    raise exception 'el admin ve % de la solicitud que debe gestionar', n;
  end if;

  -- Mover el estado sin fecha choca con la restricción de la tabla.
  begin
    update public.solicitudes set estado = 'respondida' where id = v_id;
    raise exception 'aceptó una respuesta sin fecha' using errcode = 'ZZ999';
  exception when check_violation then
    null;
  end;

  update public.solicitudes
     set estado = 'respondida',
         atendida_en = now(),
         nota_admin = 'Respondido por correo'
   where id = v_id;
end $$;

reset role;

do $$
declare
  v_id uuid := current_setting('test.solicitud_id')::uuid;
begin
  if not exists (
    select 1 from public.solicitudes
     where id = v_id
       and estado = 'respondida'
       and atendida_en is not null
       and nota_admin = 'Respondido por correo'
  ) then
    raise exception 'el admin no pudo clasificar la solicitud';
  end if;
end $$;
\echo 'OK el admin gestiona con fecha y nota'

-- 6. Validaciones de forma --------------------------------------------------
do $$
begin
  begin
    insert into public.solicitudes (tipo, contacto) values ('contacto', '   ');
    raise exception 'aceptó un contacto en blanco';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.solicitudes (tipo, contacto, datos)
         values ('empresa', 'gerente@example.com', '[]'::jsonb);
    raise exception 'aceptó datos que no son objeto';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.solicitudes (tipo, contacto, nombre)
         values ('aliado', 'prensa@example.com', 'X');
    raise exception 'aceptó un nombre de una letra';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.solicitudes (tipo, contacto, estado)
         values ('cobertura', 'barinas@example.com', 'respondida');
    raise exception 'aceptó un estado gestionado sin fecha';
  exception when check_violation then
    null;
  end;
end $$;
\echo 'OK validaciones de contacto, datos, nombre y fecha'

\echo 'TODAS LAS PRUEBAS DE SOLICITUDES PASARON'
