\set ON_ERROR_STOP on

-- Pruebas de la vitrina del Mercado Motor: las fichas de negocios.
-- Se ejecuta después de 10..60 sobre la misma base.
--
-- Lo que se cuida aquí es la promesa de la página: nada sale publicado sin
-- revisión de operaciones, la vitrina pública solo muestra fichas publicadas,
-- y el sello Verificado no lo puede poner quien llena el formulario.
--
-- Igual que en 30_identidad.sql y 60_solicitudes.sql, el rol se cambia con
-- `set role` fuera del bloque `do $$ ... $$` (dentro no surte efecto sobre el
-- DML) y el id de la fila viaja por un GUC.

delete from public.negocios;
\echo 'OK limpieza de negocios'

-- 1. El público publica una ficha pendiente ---------------------------------
select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);

set role anon;

do $$
begin
  insert into public.negocios (
    nombre, slug, categoria, ciudad, zona, horario, oferta, contacto, telefono_publico
  ) values (
    'Taller Demo', 'taller-demo', 'talleres', 'Caracas', 'Chacao', 'L-V 8:00 a 18:00',
    '10% de descuento para conductores Llégate', '+584141234567', '0212 555 1234'
  );
end $$;

reset role;

do $$
declare
  v_id uuid;
begin
  select id into v_id from public.negocios where slug = 'taller-demo';

  if v_id is null then
    raise exception 'el formulario público no dejó ficha';
  end if;

  perform set_config('test.negocio_id', v_id::text, false);

  if (select estado from public.negocios where id = v_id) <> 'pendiente' then
    raise exception 'la ficha no nació pendiente';
  end if;

  if (select verificado from public.negocios where id = v_id) then
    raise exception 'el formulario público se asignó el sello Verificado';
  end if;

  if (select publicada_en from public.negocios where id = v_id) is not null then
    raise exception 'una ficha pendiente nació con fecha de publicación';
  end if;
end $$;
\echo 'OK el público crea fichas pendientes, sin sello ni fecha'

-- 2. La vitrina pública no muestra lo pendiente ------------------------------
select set_config('request.jwt.claim.role', 'anon', false);

set role anon;

do $$
declare
  n integer;
begin
  select count(*) into n from public.negocios;
  if n <> 0 then
    raise exception 'la vitrina expuso % fichas pendientes', n;
  end if;
end $$;

reset role;
\echo 'OK pendiente no es visible para el público'

-- 3. El público no se publica ni se edita a sí mismo ------------------------
select set_config('request.jwt.claim.role', 'anon', false);

set role anon;

do $$
begin
  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto, estado, publicada_en)
         values ('Auto Lavado Falso', 'auto-lavado-falso', 'accesorios', 'Valencia',
                 'falso@example.com', 'publicado', now());
    raise exception 'anon publicó su propia ficha' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.negocios set estado = 'publicado', publicada_en = now()
     where slug = 'taller-demo';
    raise exception 'anon editó una ficha' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

do $$
declare
  v_id uuid := current_setting('test.negocio_id')::uuid;
begin
  if (select estado from public.negocios where id = v_id) <> 'pendiente' then
    raise exception 'el público movió su ficha a %', (select estado from public.negocios where id = v_id);
  end if;
end $$;
\echo 'OK nadie se autoproclama publicado ni se edita desde el formulario'

-- 4. Un cliente autenticado sin rol admin no mueve la cola ------------------
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

set role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from public.negocios where estado = 'pendiente';
  if n <> 0 then
    raise exception 'un cliente ve % fichas de la cola de revisión', n;
  end if;

  -- RLS: la fila simplemente no está, así que el update no toca a nadie.
  update public.negocios set verificado = true where slug = 'taller-demo';
end $$;

reset role;

do $$
begin
  if (select verificado from public.negocios where slug = 'taller-demo') then
    raise exception 'un cliente le puso el sello Verificado a una ficha';
  end if;
end $$;
\echo 'OK la cola de revisión queda fuera del alcance de un cliente'

-- 5. Operaciones publica, y eso exige su fecha ------------------------------
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

set role authenticated;

do $$
declare
  v_id uuid := current_setting('test.negocio_id')::uuid;
begin
  begin
    update public.negocios set estado = 'publicado' where id = v_id;
    raise exception 'aceptó una publicación sin fecha' using errcode = 'ZZ999';
  exception when check_violation then
    null;
  end;

  update public.negocios
     set estado = 'publicado',
         publicada_en = now(),
         verificado = true,
         nota_admin = 'Llamada al taller: existe y el contacto es del dueño'
   where id = v_id;
end $$;

reset role;

do $$
declare
  v_id uuid := current_setting('test.negocio_id')::uuid;
begin
  if not exists (
    select 1 from public.negocios
     where id = v_id
       and estado = 'publicado'
       and publicada_en is not null
       and verificado
  ) then
    raise exception 'operaciones no pudo publicar la ficha';
  end if;
end $$;
\echo 'OK operaciones publica con fecha, sello y nota'

-- 6. La vitrina ya la muestra, y solo a ella --------------------------------
insert into public.negocios (nombre, slug, categoria, ciudad, contacto, estado)
     values ('Cauchos Norte', 'cauchos-norte', 'cauchos', 'Barquisimeto',
             'cauchos@example.com', 'pendiente');

select set_config('request.jwt.claim.role', 'anon', false);
select set_config('request.jwt.claim.sub', '', false);

set role anon;

do $$
declare
  f record;
  n integer;
begin
  select count(*) into n from public.negocios;
  if n <> 1 then
    raise exception 'la vitrina muestra % fichas en vez de 1', n;
  end if;

  select * into f from public.negocios where slug = 'taller-demo';
  if f.slug is null or not f.verificado then
    raise exception 'la ficha publicada no aparece verificada en la vitrina';
  end if;

  if exists (select 1 from public.negocios where slug = 'cauchos-norte') then
    raise exception 'la vitrina filtró una ficha pendiente';
  end if;
end $$;

reset role;
\echo 'OK la vitrina solo expone lo publicado'

-- 7. Rechazar sin motivo no vale --------------------------------------------
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

set role authenticated;

do $$
begin
  begin
    update public.negocios set estado = 'rechazado' where slug = 'cauchos-norte';
    raise exception 'aceptó un rechazo sin motivo' using errcode = 'ZZ999';
  exception when check_violation then
    null;
  end;

  update public.negocios
     set estado = 'rechazado', motivo_rechazo = 'El teléfono no corresponde al negocio'
   where slug = 'cauchos-norte';

  update public.negocios set estado = 'archivado' where slug = 'taller-demo';
end $$;

reset role;

do $$
begin
  if (select estado from public.negocios where slug = 'cauchos-norte') <> 'rechazado' then
    raise exception 'el rechazo con motivo no se guardó';
  end if;

  if (select estado from public.negocios where slug = 'taller-demo') <> 'archivado' then
    raise exception 'la ficha no quedó archivada';
  end if;
end $$;
\echo 'OK rechazar exige motivo y archivar mueve la ficha de la vitrina'

-- 8. Validaciones de forma --------------------------------------------------
do $$
begin
  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('Taller Repetido', 'taller-repetido', 'talleres', 'Caracas', 'a@example.com');
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('Taller Repetido', 'taller-repetido', 'talleres', 'Caracas', 'b@example.com');
    raise exception 'aceptó un slug duplicado' using errcode = 'ZZ999';
  exception when unique_violation then
    delete from public.negocios where slug = 'taller-repetido';
  end;

  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('Taller Raro', 'Taller Raro', 'talleres', 'Caracas', 'c@example.com');
    raise exception 'aceptó un slug con mayúsculas y espacios';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('Tienda Rareza', 'tienda-rareza', 'vender', 'Caracas', 'd@example.com');
    raise exception 'aceptó una categoría que no existe';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto, sitio)
         values ('Ferretería Sur', 'ferreteria-sur', 'repuestos', 'Maracaibo',
                 'e@example.com', 'instagram.com/ferreteria');
    raise exception 'aceptó un sitio sin esquema';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('X', 'x', 'gruas', 'Caracas', 'f@example.com');
    raise exception 'aceptó un nombre de una letra';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.negocios (nombre, slug, categoria, ciudad, contacto)
         values ('Sin ciudad', 'sin-ciudad', 'lubricantes', '  ', 'g@example.com');
    raise exception 'aceptó una ficha sin ciudad';
  exception when check_violation then
    null;
  end;
end $$;
\echo 'OK slug, categoría, sitio, nombre y ciudad validan en la base'

\echo 'TODAS LAS PRUEBAS DEL MERCADO MOTOR PASARON'
