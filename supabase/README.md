# Base de datos Llégate (Supabase)

## Migraciones

| Archivo | Contenido |
| --- | --- |
| `20261030120000_llegate_core.sql` | Enums, tablas, constraints, triggers, RLS, grants y bucket de documentos |
| `20261030120100_llegate_rpc.sql` | RPC transaccionales: recargas, verificación y comisión del viaje |
| `20261030130000_llegate_billetera_tipos.sql` | Tipos `pago` y `abono` del libro mayor |
| `20261030130100_llegate_billetera_pago_saldo.sql` | Pago del viaje con saldo del cliente, integridad del libro mayor y referencias de recarga |
| `20261030140000_llegate_billetera_tipos_prepago.sql` | Tipo `bienvenida` del libro mayor |
| `20261030140100_llegate_billetera_prepago.sql` | Prepago del piloto: reservas de comisión, bienvenida, límites de recarga y SLA |
| `20261030150000_llegate_identidad_unificada.sql` | Vista `perfil_usuario` compartida por web y app; sincroniza WhatsApp al confirmar el teléfono |

Se aplican en orden. Con la CLI de Supabase:

```bash
supabase link --project-ref <ref>
supabase db push
```

Las migraciones que crean tipos (`...130000` y `...140000`) están separadas de
las que los usan (`...130100` y `...140100`) a propósito: PostgreSQL no permite
usar un valor de enum nuevo en la misma transacción que lo crea. No las fusiones.

También puedes pegarlas en el SQL Editor del dashboard, en orden por nombre.

## Requisitos del proyecto

1. **Auth por teléfono**: activa el proveedor SMS en Authentication → Providers → Phone
   y configura Twilio, MessageBird, Vonage o Textlocal. Define la plantilla del código
   y límites de envío.
2. **Bucket privado**: la migración crea `documentos-conductores` (10 MB, jpeg/png/webp/pdf)
   con políticas de acceso por carpeta `<usuario_id>/`.
3. **Confirmación de teléfono**: el perfil se marca `telefono_verificado = true` cuando
   `auth.users.phone_confirmed_at` existe. Sin esa confirmación un conductor no puede
   registrarse.

## Tablas

- `usuarios`: perfil 1:1 con `auth.users`, rol (`cliente`, `conductor`, `admin`) y
  `saldo_billetera`.
- `conductores_detalles`: cédula, vehículo, placa y URLs de documentos; verificación
  y estado operativo.
- `viajes`: origen/destino, precio en USD, tasa BCV, conductor y comisión aplicada.
- `transacciones_billetera`: libro mayor de recargas, pagos, abonos, comisiones,
  bienvenida, ajustes y devoluciones. La columna `billetera` distingue
  `pasajero` (saldo para pagar viajes) de `piloto` (saldo prepago de comisiones).
  Un viaje pagado con saldo genera tres filas (`pago`, `abono` y `comision`) que
  suman exactamente el cambio de cada billetera.
- `reservas_comision`: comisión reservada al aceptar cada viaje. Estados
  `reservada`, `capturada` y `liberada`. El saldo disponible del piloto es
  `saldo_billetera − reservas activas`.
- `configuracion_comisiones`: fila única con porcentaje (10 %), mínimo (0.10 USD),
  saldo mínimo del piloto (1 USD), alerta de saldo bajo (2 USD), rango de recarga
  (5–50 USD), SLA de aprobación (15 min) y bienvenida (2 USD).

## Identidad única para la web y la app

Una persona tiene una sola cuenta. La web de registro, el panel de administración
y la app móvil comparten la misma base:

- `auth.users` es la identidad; `public.usuarios` es su perfil 1:1, creado por el
  trigger `handle_new_user`.
- La llave compartida es el teléfono en formato E.164 (`+584141234567`), único en
  `usuarios`. Quien se registra en la web puede iniciar sesión en la app con el
  mismo número y viceversa.
- Un registro solo por correo crea el perfil sin teléfono; al confirmar un número
  desde Auth, `sync_usuario_auth` lo copia al perfil, lo marca verificado y lo usa
  como WhatsApp si aún no había uno.
- El metadata del cliente solo puede pedir `cliente` o `conductor`; `admin` se
  ignora y se promueve únicamente desde SQL.

La vista `public.perfil_usuario` es el contrato de lectura para ambos clientes.
Usa `security_invoker`, así que aplica la RLS de `usuarios` y
`conductores_detalles` con el JWT del visitante: cada cuenta ve su fila y el
admin ve todas. Expone:

| Columna | Uso |
| --- | --- |
| `id`, `rol`, `nombre`, `telefono`, `telefono_verificado`, `email`, `whatsapp` | Cuenta y contacto |
| `saldo_billetera` | Saldo del pasajero o prepago del piloto |
| `es_conductor`, `tipo_vehiculo`, `placa`, `verificacion`, `estado_conductor`, `motivo_rechazo`, `verificado_en` | Estado del piloto, sin consultar dos tablas |
| `puede_pedir_viajes` | `rol = cliente` (lo mismo que exige la RLS de `viajes`) |
| `puede_conducir` | Verificación aprobada y estado operativo `activo` |

El rol anónimo no tiene `select` sobre la vista.

### Del plan a las tablas

| En el plan | En la base |
| --- | --- |
| `usuarios` | `public.usuarios` (perfil 1:1 con `auth.users`) |
| `saldo_billetera` | `public.usuarios.saldo_billetera` + libro mayor |
| `estatus_verificación` | `public.conductores_detalles.verificacion` (visible como `verificacion` en la vista) |
| `conductores_detalles` | `public.conductores_detalles` (cédula, vehículo, placa y URLs de documentos) |
| `transacciones_billetera` | `public.transacciones_billetera` (`monto_usd`, `tipo`, `referencia`, `estado`, `billetera`) |
| `viajes` | `public.viajes` (`precio_usd`, `comision_usd`, `estado`, origen y destino) |

## Operación

**Promover un admin** (solo desde SQL como `postgres`/service role):

```sql
update public.usuarios set rol = 'admin' where telefono = '+584141234567';
```

**Cambiar la comisión**:

```sql
update public.configuracion_comisiones
   set porcentaje = 0.12, minimo_usd = 0.25
 where id;
```

**Reglas de saldo**

- El piloto usa prepago: sin mensualidad, sin bonos promocionales, sin
  vencimiento y sin saldo negativo. El pasajero mantiene su propia billetera;
  los roles son exclusivos y la columna `billetera` del libro mayor lo deja
  explícito.
- Al aprobar la verificación se acredita una sola vez el saldo de bienvenida
  (2 USD) y el piloto queda `activo` si alcanza el saldo mínimo (1 USD).
- Una recarga reportada queda `pendiente` y no acredita saldo. El piloto solo
  puede reportar entre 5 y 50 USD; el SLA objetivo de aprobación es 15 minutos.
- Al aprobarla, el saldo sube y, si el conductor está verificado y sin saldo,
  vuelve a `activo` cuando el saldo disponible alcanza el mínimo.
- Al aceptar un viaje se reserva la comisión
  (`max(porcentaje × precio, mínimo)`, nunca mayor al precio). El piloto no
  puede aceptar si `saldo − reservas < max(saldo mínimo, comisión)`.
- Al finalizar el viaje se captura la reserva y se debita la comisión. Una
  reserva liberada (viaje cancelado) vuelve al saldo disponible.
- Un viaje ya aceptado siempre se puede completar: si el saldo no alcanza, el
  viaje queda abierto, el piloto pasa a `inactivo_sin_saldo`, recarga y reintenta.
  Nunca se deja saldo negativo.
- `aceptar_viaje` exige verificación aprobada, saldo disponible suficiente y que
  el conductor no tenga otro viaje activo.
- Un viaje con `metodo_pago = 'saldo'` se paga cuando está `en_curso` con
  `pagar_viaje_con_saldo`: debita al cliente, abona al conductor y captura la
  reserva de comisión. No se puede cerrar con `procesar_comision_viaje`
  (devuelve `pago_con_saldo_pendiente`) ni finalizar por `UPDATE` directo.
- Repetir `pagar_viaje_con_saldo` es idempotente y el saldo del cliente nunca
  queda negativo. Si no alcanza, el viaje y las billeteras no cambian.
- Las recargas exigen referencias verificables: Pago Móvil de 6 a 12 dígitos;
  Binance Pay de 6 a 64 caracteres alfanuméricos (se admite guion).

## Validación local

La suite de `tests/` se aplica sobre PostgreSQL 15 con stubs de `auth` y `storage`
y no necesita un proyecto Supabase ni credenciales. Desde la raíz del repo:

```bash
npm run test:db
```

Requiere un contenedor local; el script crea y recrea la base `llegate_test`:

```bash
docker run --name llegate-pg -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 55432:5432 -d postgres:15-alpine
```

Cubre: pago feliz con saldo, libro mayor y conciliación, idempotencia, saldo
insuficiente, autorización del cliente, viaje en efectivo, comisión mínima topada
al precio, bloqueo de finalización directa, constraints de signo y unicidad,
recargas (referencias, duplicados, rechazo y reintento) y RLS para cliente y
terceros. `20_prepago.sql` cubre bienvenida única, reserva y liberación de la
comisión, captura, saldo mínimo, recarga del piloto con su SLA, finalización sin
saldo y RLS de las reservas. `30_identidad.sql` cubre el perfil creado desde
Auth, el rol admin ignorado, la sincronización del teléfono, el teléfono único
entre web y app, las capacidades dentro de `perfil_usuario` y la RLS de la vista
para pasajero, piloto, admin y anónimo.
