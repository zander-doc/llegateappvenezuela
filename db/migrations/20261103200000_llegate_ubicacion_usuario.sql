-- Llégate App · estado y ciudad del usuario
--
-- El registro web pide el estado y la ciudad para saber desde dónde se usa el
-- piloto. Son opcionales (una cuenta creada desde la app puede no tenerlos) y
-- quedan visibles en el perfil compartido de la web y la app.

alter table public.usuarios
  add column if not exists estado text,
  add column if not exists ciudad text;

-- Se añaden al final para conservar el orden de las columnas existentes y los
-- permisos que ya tiene la vista.
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
  u.ciudad
from public.usuarios u
left join public.conductores_detalles d on d.usuario_id = u.id;
