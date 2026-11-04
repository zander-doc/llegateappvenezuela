# Base de datos Llégate (PostgreSQL)

El esquema corre sobre PostgreSQL 15 o superior: Neon, un VPS o el PostgreSQL
embebido que usan las pruebas. Conserva los nombres heredados de Supabase
(`auth.users`, `auth.uid()`, roles `anon`/`authenticated`/`service_role` y el
catálogo `storage`) para no reescribir políticas ni RPC, pero **no depende de
Supabase**: la identidad, el OTP, las sesiones y los archivos los administra
esta aplicación.

## Migraciones

| Archivo | Contenido |
| --- | --- |
| `20261029000000_llegate_base_postgres.sql` | Roles, esquema `auth`, identidad, OTP, sesiones y catálogo de almacenamiento |
| `20261030120000_llegate_core.sql` | Enums, tablas, constraints, triggers, RLS, grants y bucket de documentos |
| `20261030120100_llegate_rpc.sql` | RPC transaccionales: recargas, verificación y comisión del viaje |
| `20261030130000_llegate_billetera_tipos.sql` | Tipos `pago` y `abono` del libro mayor |
| `20261030130100_llegate_billetera_pago_saldo.sql` | Pago del viaje con saldo del cliente, integridad del libro mayor y referencias de recarga |
| `20261030140000_llegate_billetera_tipos_prepago.sql` | Tipo `bienvenida` del libro mayor |
| `20261030140100_llegate_billetera_prepago.sql` | Prepago del piloto: reservas de comisión, bienvenida, límites de recarga y SLA |
| `20261030150000_llegate_identidad_unificada.sql` | Vista `perfil_usuario` compartida por web y app; sincroniza WhatsApp al confirmar el teléfono |
| `20261031120000_llegate_pagos.sql` | Intenciones de recarga (`pagos`), confirmación con clave de servidor y acreditación idempotente |
| `20261031160000_llegate_verificacion_antifraude.sql` | Documentos con hash único, OCR, puntaje de riesgo explicable, eventos de seguridad y RPC de envío de verificación |

Se aplican **en orden**. La forma recomendada es el aplicador del API, que no
necesita `psql` (lee `DATABASE_URL` de `server/.env`):

```bash
cd server
npm run db:migrate
```

Registra cada archivo en `public.migraciones_aplicadas` y salta lo ya aplicado,
así que se puede repetir sin duplicar tablas. Usa una conexión **directa** (sin
`-pooler`) para el DDL.

Alternativas: con `psql` y la cadena en `DATABASE_URL`:

```bash
for archivo in db/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$archivo" || break
done
```

O pega cada archivo en el SQL Editor de Neon, en orden por nombre. La primera
migración crea los roles del clúster; es idempotente, así que puede correrse en
un proyecto donde ya existan.

Las migraciones que crean tipos (`...130000` y `...140000`) están separadas de
las que los usan (`...130100` y `...140100`) a propósito: PostgreSQL no permite
usar un valor de enum nuevo en la misma transacción que lo crea. No las fusiones.

## Requisitos del proyecto

1. **PostgreSQL 15+** con la extensión `pgcrypto` (la crean las migraciones). En
   Neon sirve la cadena de conexión directa del proyecto; el API la toma de
   `DATABASE_URL` y activa TLS con `DATABASE_SSL=1` si el proveedor lo exige.
2. **Autenticación propia**: no hay proveedor externo. El API genera el código
   OTP, lo guarda como HMAC en `auth.otp_codigos` y entrega un JWT firmado con
   `AUTH_JWT_SECRET`. El pepper del OTP se configura en `OTP_SECRET`.
3. **Almacenamiento de documentos**: en desarrollo, disco local
   (`STORAGE_DRIVER=local`); en producción, Cloudflare R2
   (`STORAGE_DRIVER=r2`). La base solo guarda el catálogo y los metadatos; los
   archivos nunca viven en Postgres.
4. **Confirmación de teléfono**: el perfil se marca `telefono_verificado = true`
   cuando el API confirma el OTP y escribe `auth.users.phone_confirmed_at`. Sin
   esa confirmación un conductor no puede registrarse.

## Esquema base portable

La migración `20261029000000` reproduce lo mínimo que antes administraba
Supabase:

- **Roles** `anon`, `authenticated` y `service_role`, que usan las políticas
  RLS y los `grant`.
- **`auth.users`**: identidad 1:1 con `public.usuarios`, teléfono y correo
  únicos, metadata de registro y `phone_confirmed_at`.
- **`auth.uid()` y `auth.role()`**: leen `request.jwt.claim.sub` y
  `request.jwt.claim.role`, variables que el API fija por transacción con
  `set_config(..., true)` a partir del JWT verificado. No hay JWT de Supabase.
- **`auth.otp_codigos`**: un código vigente por teléfono, guardado como
  HMAC-SHA256 con pepper, TTL de 10 minutos y máximo de intentos.
- **`auth.sesiones`**: refresh tokens rotativos (solo su SHA-256), fecha de
  expiración y revocación por dispositivo.
- **`storage.buckets`, `storage.objects` y `storage.foldername()`**: catálogo
  para que las políticas de documentos sigan describiendo qué carpeta
  `<usuario_id>/` puede leer cada piloto.

El API se conecta con la credencial de `DATABASE_URL`; ninguna credencial de
base de datos viaja al navegador ni al móvil. Además de los `grant`, las RPC
comprueban `auth.uid()` y el rol antes de tocar saldos, verificación o pagos.

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
- `pagos`: intenciones de recarga por Pago Móvil (`manual`) o Binance Pay
  (`binance_pay`), con código público `LLG-`, monto USD/Bs, tasa, instrucciones,
  checkout, referencia reportada y estado. Solo el dueño y los admins la leen;
  nadie la escribe directo, todo pasa por RPC.
- `configuracion_pagos`: fila única con el SHA-256 de la clave de servidor. Sin
  grants para `anon` ni `authenticated`.
- `conductores_documentos`: un registro por documento (cédula frente/reverso,
  licencia, certificado médico) con MIME, tamaño, SHA-256 único en toda la base,
  resultado del OCR y datos del proveedor. Se escribe solo por RPC.
- `eventos_seguridad`: libro de auditoría (`info`, `alerta`, `critico`) legible
  únicamente por administración.

## Identidad única para la web y la app

Una persona tiene una sola cuenta. La web de registro, el panel de administración
y la app móvil comparten la misma base:

- `auth.users` es la identidad; `public.usuarios` es su perfil 1:1, creado por el
  trigger `handle_new_user` cuando el API inserta la cuenta al pedir el primer
  OTP.
- La llave compartida es el teléfono en formato E.164 (`+584141234567`), único en
  `usuarios`. Quien se registra en la web puede iniciar sesión en la app con el
  mismo número y viceversa. El registro del API es solo por teléfono; la columna
  `email` queda opcional para datos heredados.
- Al verificar el código, el API marca `phone_confirmed_at`; el trigger
  `sync_usuario_auth` copia el teléfono al perfil, lo marca verificado y lo usa
  como WhatsApp si aún no había uno.
- El metadata del cliente solo puede pedir `cliente` o `conductor`; `admin` se
  ignora y se promueve únicamente desde SQL.

La vista `public.perfil_usuario` es el contrato de lectura para ambos clientes.
Usa `security_invoker`, así que aplica la RLS de `usuarios` y
`conductores_detalles` cuando la consulta corre con un rol sujeto a RLS: cada
cuenta ve su fila y el admin ve todas. Expone:

| Columna | Uso |
| --- | --- |
| `id`, `rol`, `nombre`, `telefono`, `telefono_verificado`, `email`, `whatsapp` | Cuenta y contacto |
| `saldo_billetera` | Saldo del pasajero o prepago del piloto |
| `es_conductor`, `tipo_vehiculo`, `placa`, `verificacion`, `estado_conductor`, `motivo_rechazo`, `verificado_en` | Estado del piloto, sin consultar dos tablas |
| `puede_pedir_viajes` | `rol = cliente` (lo mismo que exige la RLS de `viajes`) |
| `puede_conducir` | Verificación aprobada y estado operativo `activo` |

### Del plan a las tablas

| En el plan | En la base |
| --- | --- |
| `usuarios` | `public.usuarios` (perfil 1:1 con `auth.users`) |
| `saldo_billetera` | `public.usuarios.saldo_billetera` + libro mayor |
| `estatus_verificación` | `public.conductores_detalles.verificacion` (visible como `verificacion` en la vista) |
| `conductores_detalles` | `public.conductores_detalles` (cédula, vehículo, placa y URLs de documentos) |
| `transacciones_billetera` | `public.transacciones_billetera` (`monto_usd`, `tipo`, `referencia`, `estado`, `billetera`) |
| `viajes` | `public.viajes` (`precio_usd`, `comision_usd`, `estado`, origen y destino) |

## Recargas con pasarelas

La web usa `public.pagos` como intención de recarga. La intención no acredita
saldo por sí sola: primero hay que confirmarla.

| RPC | Quién | Qué hace |
| --- | --- | --- |
| `crear_intencion_pago` | usuario | Crea la intención con código `LLG-`, monto y vencimiento (2 min–2 h). El piloto respeta el rango 5–50 USD. |
| `actualizar_intencion_pago` | dueño | Guarda checkout y datos de la orden mientras sigue pendiente |
| `mis_pagos` | usuario | Expira las vencidas y lista las últimas propias |
| `reportar_pago` | dueño | Pago Móvil: guarda la referencia (6–12 dígitos) y pasa a `en_revision` |
| `cancelar_pago` | dueño | Cancela una intención pendiente |
| `confirmar_pago` | `service_role` + clave de servidor | Confirma y acredita; la usa el webhook de Binance |
| `confirmar_pago_admin` | admin | Confirma un Pago Móvil revisado a mano |
| `rechazar_pago` | admin | Rechaza con motivo |
| `expirar_pagos` | admin/service | Marca vencidas |

Estados: `pendiente → en_revision → confirmado`, con salidas a `cancelado`,
`expirado` y `rechazado`. Confirmar es idempotente: el pago se liga a una sola
recarga (`transaccion_billetera_id` único) y `acreditar_recarga_interna` concentra
el cambio de saldo, el asiento del libro mayor y la reactivación del piloto. Una
referencia externa del proveedor tampoco se puede repetir.

### Configurar la clave de servidor

Solo el API se conecta a la base, pero el webhook de Binance es público. Para que
una petición no pueda confirmar un pago solo con la firma RSA (o con una clave
filtrada), la RPC exige además una clave que comparten el API y la base:

```sql
-- Ejecuta con la conexión de administración (owner del proyecto). La clave
-- real va en server/.env como PAGOS_CLAVE_SERVIDOR.
insert into public.configuracion_pagos (id, clave_servidor_hash)
values (true, encode(digest('mi-clave-larga-y-aleatoria', 'sha256'), 'hex'))
on conflict (id) do update
   set clave_servidor_hash = excluded.clave_servidor_hash,
       updated_at = now();
```

`confirmar_pago` compara el hash dentro de una función `security definer` y está
concedida solo a `anon` y `service_role` (el API entra como este último); cambiar
la clave exige actualizar el hash y el `.env` de la API a la vez.

### Relación con el flujo anterior

`/wallet/recargas/*` sigue existiendo para clientes antiguos: reporta directo en
`transacciones_billetera` y el admin aprueba con `aprobar_recarga`. La web nueva
no lo usa. `aprobar_recarga` reutiliza la misma acreditación interna, así que
ambos caminos dejan el mismo rastro en el libro mayor.

## Verificación de pilotos y antifraude

El piloto sube cuatro archivos al prefijo privado `documentos-conductores`, en su
propia carpeta `<usuario_id>/`. La API valida el tipo real del archivo (firma
binaria, no solo la extensión), calcula el SHA-256 y, si hay OCR configurado, el
texto y la confianza. El registro del documento y el envío del expediente pasan
por RPC `security definer`; el cliente no puede insertar filas a mano.

| RPC | Quién | Qué hace |
| --- | --- | --- |
| `registrar_documento_conductor` | dueño | Registra o reemplaza un documento del propio piloto con MIME, bytes, hash y OCR ya validados |
| `enviar_verificacion_conductor` | dueño | Exige los cuatro documentos, calcula el riesgo, marca `enviado_en` y suma un intento |
| `verificar_conductor` | admin | Aprueba o rechaza. El rechazo exige motivo (3–300 caracteres) y el trigger deja el evento |
| `auditar_verificacion_conductor` | trigger | Escribe `eventos_seguridad` cuando cambia el estado de verificación |

El hash SHA-256 es único en toda la tabla: la misma foto no puede respaldar dos
cuentas. Las rutas sueltas de `conductores_detalles` (`cedula_url`, `licencia_url`,
`certificado_medico_url`) quedan como legado y ya no son obligatorias.

**El OCR no decide.** Sus señales solo alimentan un puntaje explicable de 0 a 100;
el operador ve el texto leído, los motivos y el puntaje antes de aprobar o
rechazar. Un puntaje alto ordena la cola y pide más atención, no bloquea solo.

| Señal | Peso |
| --- | --- |
| Los dígitos de la cédula no aparecen en el OCR | +40 |
| Falta un token del nombre del perfil en el OCR | +25 |
| Confianza del OCR menor a 0.6 | +15 |
| Segundo envío o más (`intentos_verificacion ≥ 2`) | +10 |

Niveles: `alto` desde 50, `medio` desde 20, `bajo` por debajo. El puntaje se
recalcula en cada envío y nunca toca el estado de la cuenta por sí mismo. Enviar
de nuevo exige el expediente completo y está bloqueado si el piloto ya fue
aprobado o bloqueado (`CONDUCTOR_YA_APROBADO`, `CONDUCTOR_BLOQUEADO`,
`DOCUMENTOS_INCOMPLETOS`).

El almacenamiento es privado: el piloto solo borra archivos de su carpeta (para
limpiar un documento reemplazado) y la API genera enlaces de descarga firmados
por ella misma, válidos 900 s (`GET /files/:token`), para que el operador los
previsualice. Funcionan igual con R2 o con disco. `conductores_documentos` se lee
propio o admin y `eventos_seguridad` solo admin; ambos sin escritura directa para
`authenticated`. El envío deja un evento `verificacion_enviada` con puntaje,
motivos y conteo de documentos.

## Operación

**Promover un admin** (solo desde SQL, con la conexión del owner):

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

## Respaldos

El esquema se reconstruye con estas migraciones; el respaldo guarda solo los
datos. Se toma y se restaura desde `server/`:

```bash
cd server
npm run db:backup
npm run db:restore -- backups/<archivo>.jsonl.gz --destino "<base destino>" --forzar
```

El detalle (variables, R2, tarea diaria de Windows y cron) está en
`server/README.md`, sección «Respaldos y restauración». Restaurar exige una base
destino con las migraciones ya aplicadas.

## Validación local

La suite de `db/tests/` se aplica sobre un PostgreSQL real embebido (sin Docker,
sin proyecto externo y sin credenciales). Desde la raíz del repo:

```bash
npm run test:db
```

El script crea y recrea la base `llegate_test` en un clúster efímero, aplica
todas las migraciones —incluida la base portable con `auth` y `storage`— y
ejecuta las pruebas. El puerto se puede cambiar con `LLEGATE_TEST_PORT`.

Cubre: pago feliz con saldo, libro mayor y conciliación, idempotencia, saldo
insuficiente, autorización del cliente, viaje en efectivo, comisión mínima topada
al precio, bloqueo de finalización directa, constraints de signo y unicidad,
recargas (referencias, duplicados, rechazo y reintento) y RLS para cliente y
terceros. `20_prepago.sql` cubre bienvenida única, reserva y liberación de la
comisión, captura, saldo mínimo, recarga del piloto con su SLA, finalización sin
saldo y RLS de las reservas. `30_identidad.sql` cubre el perfil creado al
insertar en la identidad, el rol admin ignorado, la sincronización del teléfono,
el teléfono único entre web y app, las capacidades dentro de `perfil_usuario` y
la RLS de la vista para pasajero, piloto, admin y anónimo. `40_pagos.sql` cubre
la creación de intenciones, el reporte y la deduplicación de referencias, la
confirmación manual del admin, la confirmación automática con clave de servidor
(y el rechazo con una clave incorrecta), la idempotencia, el monto distinto, la
expiración, el rechazo con motivo, el crédito y reactivación del piloto y la RLS
de `pagos`. `50_verificacion.sql` cubre el expediente incompleto, las
validaciones del registro, el documento duplicado entre cuentas, el envío sin
riesgo y el reenvío, el scoring alto por cédula, nombre, confianza y reintentos,
la aprobación y el rechazo con su auditoría, el bloqueo de reenvío tras aprobar y
la RLS de `conductores_documentos` y `eventos_seguridad`.

Las pruebas de integración del API (`npm run test:api`) levantan otro PostgreSQL
embebido, aplican las mismas migraciones y ejercitan los endpoints reales.
