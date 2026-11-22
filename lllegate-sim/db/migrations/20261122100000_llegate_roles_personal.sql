-- Roles de personal. `rol = 'admin'` sigue siendo la puerta de entrada al
-- panel; `rol_personal` dice qué módulos puede usar cada persona:
--   superadmin  todo, y asigna roles al personal
--   operaciones documentos de pilotos, negocios, solicitudes y métricas (sin dinero)
--   finanzas    cobros, recargas y métricas
--   soporte     solicitudes
-- Un admin sin rol_personal se trata como superadmin (compatibilidad).

alter table public.usuarios
  add column if not exists rol_personal text;

alter table public.usuarios
  drop constraint if exists usuarios_rol_personal_check;
alter table public.usuarios
  add constraint usuarios_rol_personal_check
  check (
    rol_personal is null
    or (rol = 'admin' and rol_personal in ('superadmin', 'operaciones', 'finanzas', 'soporte'))
  );

-- Quien ya es admin queda como superadmin.
update public.usuarios
   set rol_personal = 'superadmin'
 where rol = 'admin' and rol_personal is null;

create or replace view public.perfil_usuario
with (security_invoker = true)
as
select
  u.id,
  u.rol,
  u.nombre,
  u.telefono,
  u.telefono_verificado,
  u.email,
  u.whatsapp,
  u.saldo_billetera,
  u.created_at,
  u.updated_at,
  (d.usuario_id is not null) as es_conductor,
  d.tipo_vehiculo,
  d.placa,
  d.verificacion,
  d.estado as estado_conductor,
  d.motivo_rechazo,
  d.verificado_en,
  (u.rol = 'cliente') as puede_pedir_viajes,
  (d.verificacion = 'aprobado' and d.estado = 'activo') as puede_conducir,
  u.estado,
  u.ciudad,
  u.foto_url,
  u.acepta_promociones,
  u.origen_registro,
  (u.google_sub is not null) as tiene_google,
  u.preferencias,
  u.rol_personal
from public.usuarios u
left join public.conductores_detalles d on d.usuario_id = u.id;
