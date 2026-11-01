\set ON_ERROR_STOP on

-- Identidad única web + app: un auth.users por persona, un perfil en
-- public.usuarios y una vista compartida por ambos clientes.
-- Se ejecuta después de 10_billetera.sql y 20_prepago.sql sobre la misma base.

-- Altas simuladas del proveedor de Auth --------------------------------------
-- 6 = piloto (app), 7 = pasajero (app), 8 = registro web por correo sin teléfono,
-- 9 = intento de autoasignarse admin desde metadata.
insert into auth.users (id, email, phone, phone_confirmed_at, raw_user_meta_data) values
  ('66666666-6666-6666-6666-666666666666', 'piloto@example.com', '+584146666666', now(),
   '{"nombre":"Piloto Unificado","rol":"conductor"}'),
  ('77777777-7777-7777-7777-777777777777', 'pasajero@example.com', '+584147777777', now(),
   '{"nombre":"Pasajero Unificado","rol":"cliente"}'),
  ('88888888-8888-8888-8888-888888888888', 'web@example.com', null, null,
   '{"nombre":"Registro Web","rol":"cliente"}'),
  ('99999999-9999-9999-9999-999999999999', null, '+584149999999', now(),
   '{"nombre":"Aspirante Admin","rol":"admin"}');

\echo 'OK altas desde auth.users'

-- 1. El trigger crea el perfil con el rol permitido y el teléfono verificado
do $$
declare
  u public.usuarios%rowtype;
begin
  select * into u from public.usuarios where id = '66666666-6666-6666-6666-666666666666';
  if u.rol <> 'conductor' then raise exception 'rol del piloto: %', u.rol; end if;
  if u.telefono <> '+584146666666' or not u.telefono_verificado then
    raise exception 'teléfono del piloto: % / %', u.telefono, u.telefono_verificado;
  end if;
  if u.whatsapp is distinct from '+584146666666' then
    raise exception 'whatsapp del piloto: %', u.whatsapp;
  end if;

  select * into u from public.usuarios where id = '88888888-8888-8888-8888-888888888888';
  if u.telefono is not null or u.telefono_verificado then
    raise exception 'el registro web sin teléfono quedó verificado: % / %', u.telefono, u.telefono_verificado;
  end if;
  if u.email <> 'web@example.com' then raise exception 'email del registro web: %', u.email; end if;

  select * into u from public.usuarios where id = '99999999-9999-9999-9999-999999999999';
  if u.rol <> 'cliente' then
    raise exception 'el metadata pudo crear un admin: %', u.rol;
  end if;
end $$;
\echo 'OK perfil creado por trigger y rol admin ignorado'

-- 2. El teléfono confirmado se sincroniza al perfil y completa WhatsApp
update auth.users
   set phone = '+584148888888', phone_confirmed_at = now()
 where id = '88888888-8888-8888-8888-888888888888';

do $$
declare u public.usuarios%rowtype;
begin
  select * into u from public.usuarios where id = '88888888-8888-8888-8888-888888888888';
  if u.telefono <> '+584148888888' or not u.telefono_verificado then
    raise exception 'sincronización de teléfono: % / %', u.telefono, u.telefono_verificado;
  end if;
  if u.whatsapp is distinct from '+584148888888' then
    raise exception 'whatsapp tras confirmar teléfono: %', u.whatsapp;
  end if;
end $$;
\echo 'OK sincronización del teléfono confirmado'

-- 3. Un teléfono es una sola cuenta, venga de la web o de la app
do $$
begin
  begin
    insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data) values (
      'aaaaaaaa-1111-1111-1111-111111111111', '+584147777777', now(),
      '{"nombre":"Duplicado","rol":"cliente"}'
    );
    raise exception 'permitió dos cuentas con el mismo teléfono' using errcode = 'ZZ999';
  exception when unique_violation then
    null;
  end;
end $$;
\echo 'OK teléfono único entre web y app'

-- 4. La vista resume el estado del conductor y sus capacidades
insert into public.conductores_detalles (
  usuario_id, cedula, tipo_vehiculo, placa, cedula_url, licencia_url,
  certificado_medico_url, verificacion, estado
) values (
  '66666666-6666-6666-6666-666666666666', 'V66666666', 'moto', 'ZZ666ZZ',
  '66666666-6666-6666-6666-666666666666/cedula.jpg',
  '66666666-6666-6666-6666-666666666666/licencia.jpg',
  '66666666-6666-6666-6666-666666666666/medico.jpg',
  'pendiente', 'inactivo_sin_saldo'
);

do $$
declare
  p record;
begin
  select * into p from public.perfil_usuario where id = '66666666-6666-6666-6666-666666666666';
  if not p.es_conductor then raise exception 'piloto sin marca de conductor'; end if;
  if p.placa <> 'ZZ666ZZ' then raise exception 'placa: %', p.placa; end if;
  if p.verificacion <> 'pendiente' then raise exception 'verificación: %', p.verificacion; end if;
  if p.puede_conducir then raise exception 'un conductor pendiente ya puede conducir'; end if;
  if p.puede_pedir_viajes then raise exception 'un conductor figura como pasajero'; end if;

  select * into p from public.perfil_usuario where id = '77777777-7777-7777-7777-777777777777';
  if p.es_conductor then raise exception 'el pasajero figura como conductor'; end if;
  if not p.puede_pedir_viajes then raise exception 'el pasajero no puede pedir viajes'; end if;
  if p.puede_conducir then raise exception 'el pasajero puede conducir'; end if;

  update public.conductores_detalles
     set verificacion = 'aprobado', estado = 'activo'
   where usuario_id = '66666666-6666-6666-6666-666666666666';

  select * into p from public.perfil_usuario where id = '66666666-6666-6666-6666-666666666666';
  if not p.puede_conducir then raise exception 'un conductor aprobado y activo no puede conducir'; end if;

  update public.conductores_detalles
     set estado = 'inactivo_sin_saldo'
   where usuario_id = '66666666-6666-6666-6666-666666666666';

  select * into p from public.perfil_usuario where id = '66666666-6666-6666-6666-666666666666';
  if p.puede_conducir then raise exception 'conductor sin saldo figura como activo'; end if;

  update public.conductores_detalles
     set estado = 'activo'
   where usuario_id = '66666666-6666-6666-6666-666666666666';
end $$;
\echo 'OK estado y capacidades del conductor en la vista'

-- 5. RLS de la vista: cada quien ve su fila y el admin ve todas
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);
set role authenticated;

do $$
declare
  n int;
  propio int;
begin
  select count(*) into n from public.perfil_usuario;
  if n <> 1 then raise exception 'RLS vista: el pasajero ve % perfiles', n; end if;

  select count(*) into propio from public.perfil_usuario where id = auth.uid();
  if propio <> 1 then raise exception 'RLS vista: el pasajero no ve su propio perfil'; end if;
end $$;

reset role;
\echo 'OK vista filtrada para el pasajero'

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);
set role authenticated;

do $$
declare
  p record;
begin
  if (select count(*) from public.perfil_usuario) <> 1 then
    raise exception 'RLS vista: el piloto ve perfiles ajenos';
  end if;

  select * into p from public.perfil_usuario where id = auth.uid();
  if p.placa <> 'ZZ666ZZ' or p.rol <> 'conductor' then
    raise exception 'el piloto no ve su vehículo: %', p;
  end if;
end $$;

reset role;
\echo 'OK vista filtrada para el piloto'

select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.perfil_usuario;
  if n <> (select count(*) from public.usuarios) then
    raise exception 'el admin ve % perfiles de % usuarios', n, (select count(*) from public.usuarios);
  end if;
  if n < 9 then raise exception 'perfiles totales: %', n; end if;
end $$;

reset role;
\echo 'OK vista completa para el admin'

-- 6. El rol anónimo no puede leer la vista
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;

do $$
begin
  begin
    perform count(*) from public.perfil_usuario;
    raise exception 'el rol anónimo leyó la vista' using errcode = 'ZZ999';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
\echo 'OK la vista no se expone al rol anónimo'

\echo 'TODAS LAS PRUEBAS DE IDENTIDAD PASARON'
