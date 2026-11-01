-- El rol del usuario acompaña a la verificación: los roles son exclusivos.
-- Aprobar convierte al pasajero en conductor; un rechazo lo devuelve a cliente
-- para que siga pudiendo pedir viajes. Así el perfil compartido por la web y la
-- app no muestra "Pasajero" a un piloto ya aprobado.

create or replace function public.sincronizar_rol_por_verificacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verificacion is not distinct from old.verificacion then
    return new;
  end if;

  if new.verificacion = 'aprobado' then
    update public.usuarios
       set rol = 'conductor', updated_at = now()
     where id = new.usuario_id and rol = 'cliente';
  elsif new.verificacion = 'rechazado' then
    update public.usuarios
       set rol = 'cliente', updated_at = now()
     where id = new.usuario_id and rol = 'conductor';
  end if;

  return new;
end;
$$;

drop trigger if exists conductores_sincronizar_rol on public.conductores_detalles;
create trigger conductores_sincronizar_rol
  after update of verificacion on public.conductores_detalles
  for each row execute function public.sincronizar_rol_por_verificacion();

-- Pilotos aprobados antes de este cambio.
update public.usuarios u
   set rol = 'conductor', updated_at = now()
  from public.conductores_detalles d
 where d.usuario_id = u.id
   and d.verificacion = 'aprobado'
   and u.rol = 'cliente';
