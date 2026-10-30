# Llégate API

API HTTP (Node.js + Express) sobre Supabase para la app móvil y la web. Todas las
operaciones sensibles se ejecutan en las funciones RPC de PostgreSQL: esta capa
solo valida entradas, propaga el JWT del usuario y traduce errores.

## Requisitos

- Node.js 20 o superior.
- Un proyecto Supabase con las migraciones de `../supabase/migrations` aplicadas.
- Proveedor SMS configurado en Supabase Auth (Twilio, MessageBird, Vonage o Textlocal).

## Puesta en marcha

```bash
cd server
npm install
cp .env.example .env   # completa SUPABASE_URL y SUPABASE_ANON_KEY
npm run dev
```

Solo se usa la **anon key**. La `service_role` nunca debe viajar al móvil, a la web
ni a este servidor: los roles y permisos se resuelven con el JWT del usuario y RLS.

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

## Endpoints

| Método | Ruta | Quién | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/otp` | público | Envía el código SMS (`telefono`, `rol`, `nombre` opcional) |
| POST | `/auth/verify` | público | Verifica el código y entrega la sesión |
| POST | `/auth/refresh` | público | Renueva la sesión con `refresh_token` |
| POST | `/auth/logout` | autenticado | Cierra la sesión de este dispositivo |
| GET | `/auth/me` | autenticado | Perfil unificado, estado del piloto, saldo y capacidades |
| POST | `/drivers/me` | conductor | Registra o reenvía documentos del conductor |
| GET | `/drivers/me` | conductor | Estado de verificación y saldo bloqueado |
| GET | `/wallet/saldo` | autenticado | Saldo, reservas y límites de la billetera |
| GET | `/wallet/billetera` | autenticado | Igual que `/saldo`, con nombre de billetera (`piloto`/`pasajero`) |
| GET | `/wallet/movimientos` | autenticado | Últimos 50 movimientos propios (con `billetera`) |
| GET | `/wallet/recargas` | autenticado | Últimas 50 recargas propias |
| POST | `/wallet/recargas/pago-movil` | autenticado | Reporta un Pago Móvil |
| POST | `/wallet/recargas/binance` | autenticado | Reporta un Binance Pay |
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
| GET | `/admin/conductores?verificacion=pendiente` | admin | Conductores por verificar |
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

### 4. Registro de conductor

Las imágenes se suben directo a Supabase Storage desde la app con el JWT del
usuario, al bucket privado `documentos-conductores` y con la ruta
`<usuario_id>/<archivo>`. Después se registran las rutas:

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

El registro queda en `pendiente` hasta que un admin lo apruebe.

### 5. Ciclo del viaje y comisión

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

### 6. Pagar un viaje con saldo

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

### 7. Prepago del piloto

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

## Pruebas

```bash
cd server
npm test
```

Las pruebas levantan un Supabase falso en memoria (GoTrue y PostgREST) y prueban
el API real sin credenciales ni red externa: pago feliz, saldo insuficiente,
rechazo `42501`, token ausente o inválido, UUID inválido, validaciones de recarga,
billetera del piloto, movimientos, cancelación con liberación de reserva, perfil
unificado, refresco de sesión y cierre de sesión local.

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
| 409 | `23505` | Referencia de pago duplicada |
| 422 | `datos_invalidos` | Falla de validación (Zod) |

## Notas de seguridad

- El monto de la comisión jamás lo envía el cliente: se calcula en
  `aceptar_viaje` y se reserva; la finalización captura ese monto.
- La billetera no puede quedar negativa (`CHECK saldo_billetera >= 0`) y el saldo
  solo cambia por RPC (`security definer`), nunca por un `UPDATE` del cliente.
- El saldo del piloto y el del pasajero son billeteras distintas. El rol es
  exclusivo y el libro mayor registra `billetera = 'piloto' | 'pasajero'`.
- La finalización directa de un viaje está bloqueada por trigger.
- Las recargas quedan pendientes y una referencia solo puede canjearse una vez.
- Los documentos de conductores viven en un bucket privado; RLS limita el acceso
  al dueño y a los admins.
- El precio del viaje se recibe en `POST /trips`. Antes de producción debe
  calcularse en el servidor a partir de tarifa y distancia: hoy un cliente podría
  solicitar un viaje con un precio arbitrario.
