-- Llégate App · identidad única entre la web y la app
--
-- Una persona tiene una sola cuenta: auth.users es la identidad y
-- public.usuarios el perfil 1:1. La web y la app móvil inician sesión con el
-- mismo teléfono (E.164) y leen el mismo perfil desde esta vista.
--
-- La vista no guarda datos nuevos: resume el estado operativo que ambos
-- clientes necesitan (rol, saldo, verificación del conductor y qué acciones
-- puede hacer) para que no existan dos versiones del perfil.

-- El teléfono es la llave compartida entre la web y la app. Al confirmarlo,
-- el perfil se sincroniza y lo usa como WhatsApp si aún no tenía uno.
create or replace function public.sync_usuario_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuarios
     set telefono = coalesce(new.phone, telefono),
         telefono_verificado = new.phone_confirmed_at is not null,
         email = coalesce(new.email, email),
         whatsapp = coalesce(whatsapp, new.phone)
   where id = new.id;
  return new;
end;
$$;

create view public.perfil_usuario
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
  (d.verificacion = 'aprobado' and d.estado = 'activo') as puede_conducir
from public.usuarios u
left join public.conductores_detalles d on d.usuario_id = u.id;

comment on view public.perfil_usuario is
  'Contrato de lectura compartido por la web y la app: un perfil por usuario con el estado del conductor resumido.';

-- security_invoker hace que la RLS de usuarios y conductores_detalles se
-- aplique con el JWT del visitante: cada quien ve su fila y el admin todas.
revoke all on public.perfil_usuario from anon, authenticated;
grant select on public.perfil_usuario to authenticated, service_role;
