-- ---------------------------------------------------------------------------
-- Base portable: lo que antes administraba Supabase
--
-- La aplicación corre sobre PostgreSQL puro (Neon, un VPS o el Postgres
-- embebido de las pruebas). Esta migración crea los pocos objetos cuyo nombre
-- heredamos de Supabase para no reescribir el resto del esquema:
--
--  * roles anon / authenticated / service_role, que usan las políticas RLS;
--  * esquema auth con la tabla de identidad y las funciones auth.uid() y
--    auth.role(), que leen variables de sesión en vez de un JWT de Supabase;
--  * esquema storage con el catálogo de objetos, para que las políticas de
--    documentos sigan siendo válidas aunque los archivos vivan en R2 o en disco.
--
-- Además vive aquí lo que antes hacía el proveedor de autenticación: los
-- códigos OTP y las sesiones con refresh token.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Los roles son del clúster. `service_role` solo consigue BYPASSRLS cuando la
-- migración corre como superusuario (Postgres local); en un proveedor
-- administrado se crea sin ese atributo y las RPC security definer bastan.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    begin
      create role service_role nologin bypassrls;
    exception when insufficient_privilege then
      create role service_role nologin;
    end;
  end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

-- ---------------------------------------------------------------------------
-- Identidad
-- ---------------------------------------------------------------------------
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  phone_confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  banned_until timestamptz
);

-- Índices únicos: Postgres permite varios NULL, así que sirven para teléfono
-- opcional (registro por correo) y para el ON CONFLICT del OTP.
create unique index users_phone_unico on auth.users (phone);
create unique index users_email_unico on auth.users (email);

-- El API fija estas variables por transacción antes de llamar a una RPC:
--   select set_config('request.jwt.claim.sub', '<uuid>', true)
--   select set_config('request.jwt.claim.role', 'authenticated', true)
create function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create function auth.role()
returns text
language sql
stable
as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated') $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Códigos de un solo uso y sesiones
--
-- El código nunca se guarda en claro: se guarda un HMAC con el secreto del
-- servidor. Un volcado de la tabla no sirve para entrar a ninguna cuenta.
-- ---------------------------------------------------------------------------
create table auth.otp_codigos (
  telefono text primary key,
  codigo_hash text not null,
  expira_en timestamptz not null,
  intentos integer not null default 0,
  creado_en timestamptz not null default now()
);

create table auth.sesiones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  refresh_hash text not null unique,
  user_agent text,
  creada_en timestamptz not null default now(),
  ultimo_uso timestamptz not null default now(),
  expira_en timestamptz not null,
  revocada_en timestamptz
);

create index sesiones_usuario on auth.sesiones (usuario_id) where revocada_en is null;

-- ---------------------------------------------------------------------------
-- Catálogo de almacenamiento
--
-- Los archivos viven fuera de la base (Cloudflare R2 o disco local). Se
-- conservan estas tablas para que las políticas de documentos sigan
-- describiendo quién puede leer el prefijo de cada piloto.
-- ---------------------------------------------------------------------------
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

create function storage.foldername(object_name text)
returns text[]
language sql
immutable
as $$ select string_to_array(object_name, '/') $$;

grant select on storage.buckets to authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant select, insert, update, delete on storage.objects to service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
