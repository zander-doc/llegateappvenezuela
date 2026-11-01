# Llégate API

API HTTP (Node.js + Express) sobre Supabase para la app móvil y la web. Todas las
operaciones sensibles se ejecutan en las funciones RPC de PostgreSQL: esta capa
solo valida entradas, propaga el JWT del usuario y traduce errores.

## Requisitos

- Node.js 20 o superior.
- Un proyecto Supabase con las migraciones de `../supabase/migrations` aplicadas.
- Proveedor SMS configurado en Supabase Auth. Opcionalmente, el Send SMS Hook
  puede entregar el código por WhatsApp (ver [OTP por WhatsApp](#otp-por-whatsapp)).

## Puesta en marcha

```bash
cd server
npm install
cp .env.example .env   # completa SUPABASE_URL y SUPABASE_ANON_KEY
npm run dev
```

Solo se usa la **anon key**. La `service_role` nunca debe viajar al móvil, a la web
ni a este servidor: los roles y permisos se resuelven con el JWT del usuario y RLS.

Las recargas con pasarelas usan variables opcionales (`PAGOS_CLAVE_SERVIDOR`,
`PAGO_MOVIL_*`, `BINANCE_PAY_*`). Si faltan, la API sigue arrancando y ese método
responde `503`; nunca se simula un pago. La configuración completa está en
[Recargas con pasarelas](#recargas-con-pasarelas).

## Flujo de autenticación

1. `POST /auth/otp` envía un código SMS al teléfono.
2. `POST /auth/verify` valida el código y devuelve `access_token` y `refresh_token`.
3. El cliente envía `Authorization: Bearer <access_token>` en cada petición.
4. Cuando el token expira, `POST /auth/refresh` entrega un par nuevo sin pedir otro SMS.
5. `POST /auth/logout` cierra solo la sesión de ese dispositivo.

Al primer registro, Supabase Auth crea el perfil en `public.usuarios` mediante un
trigger. El rol del metadata solo puede ser `cliente` o `conductor`; cualquier
intento de declararse `admin` se ignora.

### Una cuenta, dos clientes

La web y la app móvil usan el mismo teléfono y la misma cuenta. La app del
pasajero no necesita un alta distinta: si la persona ya se registró en la web,
el primer `POST /auth/otp` sobre su número inicia sesión en el perfil existente.
El saldo, el rol y el estado del piloto son los mismos en ambos clientes.

`GET /auth/me` lee la vista `perfil_usuario` y entrega todo en una sola llamada:

```json
{
  "ok": true,
  "usuario": {
    "id": "2222...",
    "rol": "conductor",
    "nombre": "Ana Cliente",
    "telefono": "+584142222222",
    "telefono_verificado": true,
    "email": "ana@example.com",
    "whatsapp": null,
    "saldo_billetera": 20
  },
  "conductor": {
    "tipo_vehiculo": "moto",
    "placa": "AB123CD",
    "verificacion": "aprobado",
    "estado": "activo",
    "motivo_rechazo": null,
    "verificado_en": "2026-10-30T12:00:00.000Z"
  },
  "capacidades": { "puede_pedir_viajes": false, "puede_conducir": true }
}
```

Para un pasajero, `conductor` es `null` y `puede_pedir_viajes` es `true`.

### Conectar la web

La web cambia entre modo real y demostración solo con `VITE_API_URL`:

```bash
cd ..                 # raíz de lllegate-sim
cp .env.example .env  # deja VITE_API_URL vacío para la demo
# .env
VITE_API_URL=http://localhost:3000
```

- **Sin `VITE_API_URL`**: `/ingresar` y `/registro` mantienen los formularios
  simulados de siempre. No se envía nada a ningún servidor.
- **Con `VITE_API_URL`**: esas páginas usan `POST /auth/otp` y
  `POST /auth/verify`. No se piden ni guardan contraseña ni cédula; el teléfono
  viaja a la API solo para enviar el código SMS.
- La sesión se guarda en `localStorage` (`llegate_sesion_v1`) únicamente con
  `access_token`, `refresh_token` y `expires_at`. El cliente renueva el token
  antes de vencer y `cerrar sesión` solo afecta a ese navegador.
- La cuenta creada en la web es la misma que abre la app móvil con ese teléfono.

La API debe aceptar el origen de la web en `CORS_ORIGIN`. El servidor de
desarrollo corre en `http://localhost:5174`:

```bash
# server/.env
CORS_ORIGIN=http://localhost:5174,http://localhost:5173
```

Vite inyecta `VITE_API_URL` al compilar: si cambias la URL o publicas la web,
vuelve a ejecutar `npm run build`.

## Endpoints

| Método | Ruta | Quién | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/otp` | público | Envía el código SMS (`telefono`, `rol`, `nombre` opcional) |
| POST | `/auth/verify` | público | Verifica el código y entrega la sesión |
| POST | `/auth/refresh` | público | Renueva la sesión con `refresh_token` |
| POST | `/auth/logout` | autenticado | Cierra la sesión de este dispositivo |
| GET | `/auth/me` | autenticado | Perfil unificado, estado del piloto, saldo y capacidades |
| POST | `/drivers/me` | conductor | Registra o reenvía datos del conductor |
| GET | `/drivers/me` | conductor | Estado de verificación, riesgo y documentos |
| POST | `/drivers/me/documentos` | conductor | Sube un documento (base64), calcula hash y OCR |
| POST | `/drivers/me/enviar` | conductor | Envía los 4 documentos a revisión y calcula riesgo |
| GET | `/wallet/saldo` | autenticado | Saldo, reservas y límites de la billetera |
| GET | `/wallet/billetera` | autenticado | Igual que `/saldo`, con nombre de billetera (`piloto`/`pasajero`) |
| GET | `/wallet/movimientos` | autenticado | Últimos 50 movimientos propios (con `billetera`) |
| GET | `/wallet/recargas` | autenticado | Últimas 50 recargas propias |
| POST | `/wallet/recargas/pago-movil` | autenticado | Reporta un Pago Móvil |
| POST | `/wallet/recargas/binance` | autenticado | Reporta un Binance Pay |
| GET | `/payments/metodos` | autenticado | Pasarelas configuradas en este despliegue |
| GET | `/payments` | autenticado | Últimas 20 intenciones de recarga propias |
| POST | `/payments/intents` | autenticado | Crea la intención (`metodo`, `monto_usd`) y una orden de Binance si aplica |
| POST | `/payments/:id/report` | autenticado | Reporta la referencia bancaria de un Pago Móvil |
| POST | `/payments/:id/cancel` | autenticado | Cancela una intención pendiente |
| POST | `/webhooks/binance-pay` | Binance | Confirma el pago con la firma RSA del webhook |
| POST | `/webhooks/supabase-otp` | Supabase | Send SMS Hook: entrega el OTP por WhatsApp |
| POST | `/trips` | cliente | Crea una solicitud de viaje |
| GET | `/trips/:id` | participante | Detalle del viaje |
| POST | `/trips/:id/aceptar` | conductor | Acepta y reserva la comisión (valida saldo disponible) |
| POST | `/trips/:id/iniciar` | conductor | Marca el viaje en curso |
| POST | `/trips/:id/finalizar` | conductor | Captura la reserva y cobra la comisión (efectivo) |
| POST | `/trips/:id/cancelar` | participante | Cancela el viaje y libera la reserva |
| POST | `/trips/:id/pagar-saldo` | cliente | Paga el viaje en curso con el saldo de su billetera |
| GET | `/admin/recargas?estado=pendiente` | admin | Recargas por revisar |
| POST | `/admin/recargas/:id/aprobar` | admin | Acredita el saldo |
| POST | `/admin/recargas/:id/rechazar` | admin | Rechaza con motivo |
| GET | `/admin/pagos?estado=en_revision` | admin | Intenciones de Pago Móvil por confirmar |
| POST | `/admin/pagos/:id/confirmar` | admin | Confirma el pago y acredita el saldo |
| POST | `/admin/pagos/:id/rechazar` | admin | Rechaza la intención con motivo |
| GET | `/admin/conductores?verificacion=pendiente` | admin | Conductores por verificar, ordenados por riesgo |
| GET | `/admin/conductores/:usuarioId` | admin | Detalle: perfil, documentos firmados, OCR y auditoría |
| POST | `/admin/conductores/:usuarioId/verificar` | admin | Aprueba o rechaza documentos |

## Ejemplos

### 1. Registro por SMS

```bash
curl -X POST http://localhost:3000/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"telefono":"+584141234567","rol":"conductor","nombre":"Carlos Pérez"}'

curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"telefono":"+584141234567","token":"123456"}'
```

Guarda el `access_token` devuelto:

```bash
TOKEN="eyJhbGciOi..."
```

Cuando expire, renueva la sesión sin pedir otro SMS:

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

Para cerrar solo ese dispositivo (la sesión de la web no se afecta si la app se
cierra):

```bash
curl -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer $TOKEN"
```

### 2. Reportar un Pago Móvil

El `ID Usuario` **no se envía en el body**: se obtiene del JWT para que nadie pueda
reportar recargas a nombre de otra persona. Monto, banco, referencia y comprobante
son los datos que pide el formulario. La referencia debe ser verificable: 6 a 12
dígitos para Pago Móvil y 6 a 64 caracteres alfanuméricos (se admite guion) para
Binance Pay.

```bash
curl -X POST http://localhost:3000/wallet/recargas/pago-movil \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto_usd": 5.00,
    "banco": "Banesco",
    "referencia": "0123456789",
    "comprobante_url": "11111111-1111-1111-1111-111111111111/comprobantes/0123456789.jpg"
  }'
```

Respuesta `201`:

```json
{
  "ok": true,
  "transaccion_id": "9f1c...",
  "estado": "pendiente",
  "metodo": "pago_movil",
  "monto_usd": 5.00
}
```

La transacción queda en `pendiente`; el saldo **no** cambia hasta que un admin la
apruebe. Una referencia ya usada responde `409` con `error: "23505"`.

### 3. Aprobar la recarga (admin)

```bash
curl -X POST http://localhost:3000/admin/recargas/9f1c.../aprobar \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Respuesta:

```json
{
  "ok": true,
  "transaccion_id": "9f1c...",
  "usuario_id": "1111...",
  "monto_usd": 5.00,
  "saldo_billetera": 5.10
}
```

Si el conductor estaba `inactivo_sin_saldo` y ya está verificado, la aprobación lo
reactiva automáticamente cuando el saldo alcanza el mínimo.

### 4. Verificación de documentos del piloto

El piloto sube cuatro documentos: cédula por ambos lados, licencia y certificado
médico. La API valida los bytes reales del archivo (JPG, PNG, WebP o PDF), calcula
su SHA-256, guarda una copia en el bucket privado `documentos-conductores` y, si
hay OCR configurado, registra el texto leído:

```bash
curl -X POST http://localhost:3000/drivers/me/documentos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cedula_frente",
    "mime": "image/jpeg",
    "contenido_base64": "/9j/4AAQSkZJRgABAQ..."
  }'
```

Respuesta `201`:

```json
{
  "ok": true,
  "documento": {
    "tipo": "cedula_frente",
    "mime": "image/jpeg",
    "bytes": 184320,
    "ocr_estado": "listo",
    "ocr_confianza": 0.91
  }
}
```

Los tipos admitidos son `cedula_frente`, `cedula_reverso`, `licencia` y
`certificado_medico`. Reemplazar un documento todavía está permitido mientras el
piloto no esté aprobado. Un mismo archivo **no puede estar vinculado a dos
cuentas**: el hash es único en `conductores_documentos` y responde `409`. Si la
RPC rechaza la fila, la API borra el archivo recién subido para no dejar huérfanos.

Con los cuatro documentos cargados se envía a revisión:

```bash
curl -X POST http://localhost:3000/drivers/me/enviar -H "Authorization: Bearer $TOKEN"
```

```json
{
  "ok": true,
  "verificacion": "pendiente",
  "riesgo_puntaje": 25,
  "riesgo_nivel": "medio",
  "motivos": [
    { "codigo": "nombre_no_coincide", "peso": 25, "detalle": "Falta «PEREZ» en la lectura del documento" }
  ],
  "documentos": 4,
  "enviado_en": "2026-10-31T15:20:00.000Z"
}
```

El puntaje es una **señal explicable**, no un veredicto: 40 por cédula que no
aparece en el OCR, 25 por nombre que no coincide, 15 por OCR de baja confianza y
10 por reenvíos acumulados (`intentos_verificacion >= 2`). Sin OCR configurado el
envío no se bloquea: queda `ocr_no_disponible` con peso 0 y el operador revisa a
mano. El admin ve la cola ordenada por riesgo en `GET /admin/conductores` y el
detalle con URLs firmadas de 15 minutos en `GET /admin/conductores/:id`.

`POST /drivers/me` se conserva para registrar los datos del vehículo y las rutas
heredadas; el flujo nuevo sube el archivo desde la web y no necesita URLs
públicas:

```bash
curl -X POST http://localhost:3000/drivers/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cedula": "V12345678",
    "tipo_vehiculo": "moto",
    "placa": "AB123CD",
    "marca": "Bera",
    "modelo": "Socialista",
    "anio": 2022,
    "cedula_url": "11111111-1111-1111-1111-111111111111/cedula.jpg",
    "licencia_url": "11111111-1111-1111-1111-111111111111/licencia.jpg",
    "certificado_medico_url": "11111111-1111-1111-1111-111111111111/medico.jpg"
  }'
```

### 5. OTP por WhatsApp

Supabase Auth puede entregar el código SMS mediante su **Send SMS Hook**. La API
recibe el evento en `/webhooks/supabase-otp`, verifica la firma HMAC del estándar
Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature` sobre
`<id>.<timestamp>.<cuerpo>`, ventana de 5 minutos) y envía una plantilla de
WhatsApp Cloud API:

```bash
SUPABASE_SEND_SMS_HOOK_SECRET=whsec_...
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_ID=1234567890
WHATSAPP_OTP_TEMPLATE=llegate_otp
WHATSAPP_OTP_LANGUAGE=es
WHATSAPP_API_VERSION=v21.0
```

1. En Supabase → Authentication → Hooks → Send SMS, activa el hook HTTP hacia
   `https://api.tudominio.com/webhooks/supabase-otp`.
2. Copia el secreto que muestra Supabase en `SUPABASE_SEND_SMS_HOOK_SECRET`.
3. La API responde `503` si falta el secreto o las credenciales de Meta; en ese
   caso Supabase debe seguir usando su proveedor SMS normal. Nunca se finge un
   envío.

Los límites de la API son una ventana deslizante en memoria por teléfono, por IP
y por intento de verificación (`OTP_MAX_POR_TELEFONO`, `OTP_MAX_POR_IP`,
`OTP_MAX_VERIFICACIONES`, `OTP_VENTANA_MINUTOS`). Al superarlos responde `429`
con `Retry-After`. Supabase también aplica su propio límite de envío; estos son
una segunda barrera. El almacén es en memoria: si la API escala a varias
instancias, debe moverse a Redis.

### 6. Ciclo del viaje y comisión

```bash
# Cliente solicita
curl -X POST http://localhost:3000/trips \
  -H "Authorization: Bearer $CLIENTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"origen":"Altamira","destino":"Chacao","precio_usd":10,"distancia_km":2.5}'

# Conductor acepta e inicia
curl -X POST http://localhost:3000/trips/$VIAJE_ID/aceptar -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/trips/$VIAJE_ID/iniciar -H "Authorization: Bearer $TOKEN"

# Al terminar, el servidor descuenta la comisión
curl -X POST http://localhost:3000/trips/$VIAJE_ID/finalizar -H "Authorization: Bearer $TOKEN"
```

Respuesta al finalizar:

```json
{
  "ok": true,
  "ya_procesado": false,
  "viaje_id": "...",
  "estado_viaje": "finalizado",
  "comision_usd": 1.00,
  "saldo_billetera": 9.00,
  "conductor_activo": true
}
```

Si el saldo no alcanza, responde `409` y el viaje queda abierto para reintentar
después de recargar:

```json
{
  "ok": false,
  "motivo": "saldo_insuficiente",
  "requiere_recarga": true,
  "comision_usd": 1.00,
  "saldo_billetera": 0.10
}
```

La operación es idempotente: repetirla sobre un viaje ya finalizado devuelve
`ya_procesado: true` sin volver a debitar.

### 7. Pagar un viaje con saldo

Se usa cuando el viaje se creó con `"metodo_pago": "saldo"`. Solo el cliente dueño
puede cobrarlo, y el viaje debe estar `en_curso`. El conductor no puede cerrarlo
con `/finalizar`: la RPC responde `409` con `motivo: "pago_con_saldo_pendiente"`.

```bash
curl -X POST http://localhost:3000/trips/$VIAJE_ID/pagar-saldo \
  -H "Authorization: Bearer $CLIENTE_TOKEN"
```

Respuesta `200`:

```json
{
  "ok": true,
  "ya_procesado": false,
  "viaje_id": "...",
  "estado_viaje": "finalizado",
  "precio_usd": 10.00,
  "comision_usd": 1.00,
  "neto_conductor": 9.00,
  "saldo_cliente": 10.00,
  "saldo_conductor": 19.00,
  "conductor_activo": true
}
```

La operación debita el precio al cliente, abona el precio al conductor y registra
la comisión como un débito aparte, todo en una sola transacción. Si el cliente no
tiene saldo responde `409` con `motivo: "saldo_insuficiente"` y no cambia nada.
Reintentarla es idempotente.

### 8. Prepago del piloto

Mototaxi, taxi pana y delivery no pagan mensualidad: recargan saldo y la
comisión se descuenta por viaje completado. La billetera del piloto es distinta
de la del pasajero; la columna `billetera` del libro mayor lo deja explícito.

```bash
curl http://localhost:3000/wallet/billetera -H "Authorization: Bearer $TOKEN"
```

Respuesta:

```json
{
  "ok": true,
  "billetera": "piloto",
  "saldo_billetera": 7.50,
  "reservado_usd": 1.00,
  "disponible_usd": 6.50,
  "estado_billetera": "activo",
  "conductor_estado": "activo",
  "limites": {
    "comision_porcentaje": 0.1,
    "comision_minima_usd": 0.1,
    "saldo_minimo_usd": 1,
    "alerta_saldo_bajo_usd": 2,
    "recarga_minima_usd": 5,
    "recarga_maxima_usd": 50,
    "sla_aprobacion_minutos": 15,
    "bienvenida_usd": 2
  }
}
```

Al aceptar un viaje se reserva la comisión. Si no hay saldo disponible responde
`409` con el detalle para recargar:

```json
{
  "ok": false,
  "motivo": "saldo_insuficiente",
  "requiere_recarga": true,
  "saldo_billetera": 0.5,
  "reservado_usd": 0,
  "disponible_usd": 0.5,
  "minimo_usd": 1,
  "comision_usd": 3,
  "faltante_usd": 2.5,
  "recarga_minima_usd": 5
}
```

Reglas del lanzamiento:

- Saldo de bienvenida de 2 USD, una sola vez, al aprobar la verificación. No es
  un bono promocional: mitiga que el piloto sienta que paga antes de ganar.
- Recargas del piloto entre 5 y 50 USD, con aprobación manual y SLA objetivo de
  15 minutos. Sin vencimiento.
- La reserva se libera al cancelar (`POST /trips/:id/cancelar`) y se captura al
  finalizar. Un viaje ya aceptado siempre se puede completar; si falta saldo, el
  viaje queda abierto para terminar tras recargar. Nunca hay saldo negativo.
- `procesar_comision_viaje` y `pagar_viaje_con_saldo` devuelven un `recibo` con
  tarifa, comisión descontada, neto y saldo resultante para mostrarlo al piloto.

## Recargas con pasarelas

Las recargas reales viven en `public.pagos` y no tocan el saldo hasta que el pago
se confirma. La intención nace `pendiente` con un código público `LLG-XXXXXXXXXX`;
la web muestra métodos según `GET /payments/metodos`.

### Pago Móvil (semiautomático)

1. La API toma banco, teléfono, cédula, titular y tasa de `PAGO_MOVIL_*`.
2. `POST /payments/intents` calcula el monto exacto en bolívares y devuelve las
   instrucciones. El cliente paga desde su banco.
3. `POST /payments/:id/report` guarda la referencia bancaria (6 a 12 dígitos) y
   deja el pago `en_revision`.
4. Un admin confirma:

```bash
curl -X POST http://localhost:3000/admin/pagos/$PAGO_ID/confirmar -H "Authorization: Bearer $ADMIN_TOKEN"
```

No hay scraping ni verificación bancaria automática: mientras el banco no ofrezca
API, la revisión es humana y el SLA objetivo sigue siendo de 15 minutos.

### Binance Pay (automático)

1. `POST /payments/intents` crea la intención y luego la orden v3 de Binance con
   `merchantTradeNo = codigo`.
2. La API firma el cuerpo con RSA-SHA256 y guarda `checkout_url` y `prepayId`.
3. La web abre el checkout; el usuario paga en Binance.
4. Binance llama a `POST /webhooks/binance-pay`. La API verifica la firma con la
   clave pública, el `timestamp` (ventana de ±5 minutos) y solo acepta
   `PAY_SUCCESS`/`PAID`. Después confirma el pago y acredita el saldo.

Variables:

```bash
BINANCE_PAY_CERT_SN=serial-del-certificado
BINANCE_PAY_SECRET_KEY=-----BEGIN PRIVATE KEY-----\n...   # PEM o base64 del PEM
BINANCE_PAY_WEBHOOK_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...  # clave pública de Binance
BINANCE_PAY_BASE_URL=https://bpay.binanceapi.com
```

El webhook debe quedar público en `https://api.tudominio.com/webhooks/binance-pay`
y se monta **antes** de `express.json()` porque la firma se calcula sobre el cuerpo
crudo. Sin claves configuradas el endpoint responde `503` y nunca confirma nada.

> **Pendiente de validación:** el flujo de Binance está probado con claves RSA
> locales y un servidor falso. Antes de producción hay que probarlo contra el
> sandbox de Binance con credenciales reales (creación de orden, checkout y
> webhook). La implementación falla cerrada: si algo no cuadra, no acredita saldo.

### Clave de servidor

Los clientes tienen la anon key, así que la confirmación no puede depender solo de
un JWT: cualquier usuario podría invocar la RPC. Por eso `confirmar_pago` exige una
clave que solo conocen la API y la base:

```bash
# 1. Genera la clave y guárdala en server/.env
openssl rand -hex 32
# PAGOS_CLAVE_SERVIDOR=<clave>

# 2. Registra solo su SHA-256 en Supabase (SQL Editor, como postgres)
insert into public.configuracion_pagos (id, clave_servidor_hash)
values (true, encode(digest('<clave>', 'sha256'), 'hex'))
on conflict (id) do update
   set clave_servidor_hash = excluded.clave_servidor_hash,
       updated_at = now();
```

`configuracion_pagos` no tiene grants para `anon` ni `authenticated`; el hash se
compara dentro de una función `security definer`. Cambiar la clave exige repetir
ambos pasos. El panel admin no usa la clave: confirma con su JWT mediante
`confirmar_pago_admin`.

### Estados e idempotencia

`pendiente → en_revision → confirmado`, con salidas a `cancelado`, `expirado` y
`rechazado`. Confirmar dos veces el mismo pago no duplica el saldo: la intención
queda ligada a una única recarga (`transaccion_billetera_id` unique) y una
referencia externa solo puede usarse una vez. Si el monto de Binance no coincide
con la intención (±0.01 USD), el pago queda pendiente y el webhook solo registra
el aviso.

## Pruebas

```bash
cd server
npm test
```

Las pruebas levantan un Supabase falso en memoria (GoTrue y PostgREST) y prueban
el API real sin credenciales ni red externa: pago feliz, saldo insuficiente,
rechazo `42501`, token ausente o inválido, UUID inválido, validaciones de recarga,
billetera del piloto, movimientos, cancelación con liberación de reserva, perfil
unificado, refresco de sesión, cierre de sesión local, las rutas de pagos
(métodos, intención de Pago Móvil, reporte, cancelación y Binance sin configurar),
la carga de documentos (formato, MIME declarado, hash y borrado si la RPC falla),
el envío con riesgo, la cola y el detalle del admin, el límite de OTP por teléfono
y por intento de verificación. `binance.test.mjs` cubre la firma RSA-SHA256, la
verificación del webhook (cuerpo alterado, firma ajena, timestamp viejo) y el
parseo de eventos. `ocr.test.mjs` cubre OCR.space, Google Vision y los fallos del
proveedor; `otpWebhook.test.mjs` cubre la firma del Send SMS Hook y la plantilla
de WhatsApp.

Las migraciones y RPC se prueban con PostgreSQL:

```bash
npm run test:db
```

## Errores

Formato uniforme:

```json
{ "error": "datos_invalidos", "mensaje": "Revisa los datos enviados", "detalles": [] }
```

| HTTP | Código | Causa |
| --- | --- | --- |
| 401 | `token_requerido` / `token_invalido` | Falta el JWT o expiró |
| 403 | `no_autorizado` / `solo_admin` | RLS o RPC rechazaron la operación |
| 404 | `P0002` | Registro no encontrado |
| 409 | `23505` | Referencia de pago o hash de documento duplicado |
| 413 | `documento_muy_grande` | El archivo supera `VERIFICACION_MAX_BYTES` |
| 422 | `datos_invalidos` | Falla de validación (Zod) |
| 422 | `formato_no_soportado` / `mime_no_coincide` | Los bytes no son JPG, PNG, WebP o PDF, o no coinciden con el MIME declarado |
| 429 | `demasiados_intentos` | Límite de OTP por teléfono, IP o intento de verificación |
| 503 | `pago_movil_no_configurado` / `binance_no_configurado` | La pasarela no tiene credenciales en este despliegue |
| 503 | `hook_no_configurado` / `whatsapp_no_configurado` | El Send SMS Hook o Meta no están configurados |

## Notas de seguridad

- El monto de la comisión jamás lo envía el cliente: se calcula en
  `aceptar_viaje` y se reserva; la finalización captura ese monto.
- La billetera no puede quedar negativa (`CHECK saldo_billetera >= 0`) y el saldo
  solo cambia por RPC (`security definer`), nunca por un `UPDATE` del cliente.
- El saldo del piloto y el del pasajero son billeteras distintas. El rol es
  exclusivo y el libro mayor registra `billetera = 'piloto' | 'pasajero'`.
- La finalización directa de un viaje está bloqueada por trigger.
- Las recargas quedan pendientes y una referencia solo puede canjearse una vez.
- La confirmación automática de Binance exige la firma RSA sobre el cuerpo crudo
  y un `timestamp` de ±5 minutos; el webhook nunca acepta el cuerpo parseado.
- La clave de servidor solo existe en `PAGOS_CLAVE_SERVIDOR` y como SHA-256 en
  `configuracion_pagos`. No se envía a la web, al móvil ni dentro del JWT.
- Los documentos de conductores viven en un bucket privado; RLS limita el acceso
  al dueño y a los admins. El admin los ve con URLs firmadas de 15 minutos.
- El MIME se decide por los bytes reales del archivo, no por lo que declara el
  navegador, y el hash SHA-256 es único entre cuentas para detectar documentos
  reutilizados. El OCR y el puntaje de riesgo son señales para el revisor, no una
  aprobación automática.
- La firma del Send SMS Hook se verifica sobre el cuerpo crudo con HMAC-SHA256 y
  una ventana de 5 minutos. Sin secreto o sin credenciales de Meta el hook
  responde `503`: nunca se finge haber enviado un código.
- El precio del viaje se recibe en `POST /trips`. Antes de producción debe
  calcularse en el servidor a partir de tarifa y distancia: hoy un cliente podría
  solicitar un viaje con un precio arbitrario.
- La web real solo guarda tokens de sesión en `localStorage`; nunca contraseña ni
  cédula. En modo demo no se almacena ni transmite ningún dato personal.
