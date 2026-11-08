# MAPA DE FUNCIONAMIENTO Y LÓGICA — Llégate Venezuela

**Repositorio:** `zander-doc/llegateappvenezuela` (rama `main`)  
**Carpeta del proyecto:** `lllegate-sim/`  
**Fecha:** 2026-11-06  
**Estado:** análisis realizado sobre la rama `main` (sincronizada con `origin/main`)

---

## 1. Resumen ejecutivo

Llégate es una plataforma de movilidad y servicios para Venezuela. Actualmente funciona como un **monorepo** con tres piezas que deben compartir **una sola base de datos PostgreSQL**:

| Pieza | Ruta | Tecnología | Rol |
|-------|------|------------|-----|
| **Web (cliente)** | `lllegate-sim/src/` | React 19 + Vite + TypeScript + React Router | Sitio web pública y panel de usuario/conductor |
| **API (servidor)** | `lllegate-sim/server/` | Node.js + Express + `pg` (node-postgres) | Expone REST, autentica, valida y accede a PostgreSQL |
| **App móvil** | `apps/android/` | Kotlin (Android) con WebView | Cliente nativo que consume la misma API/web |
| **Base de datos** | `lllegate-sim/db/migrations/` | PostgreSQL (migraciones SQL con RLS) | Fuente única de verdad |
| **Landing / sitio estático** | `lllegate-sim/landing/` | HTML estático | Página de aterrizaje pública |

**Regla de oro:** ni la web ni la app acceden directamente a PostgreSQL. Ambas hablan con la **misma API REST**, y la API es la única que escribe/lee la base de datos. De esa forma app y web trabajan con la **misma base de datos** de forma natural.

---

## 2. Arquitectura general (mermaid)

```mermaid
graph TD
    UsuarioWeb[Usuario Web<br/>React + Vite] -->|HTTPS / JSON| API[(API REST<br/>Node + Express)]
    AppMovil[App Móvil Android<br/>Kotlin + WebView] -->|HTTPS / JSON| API
    API -->|SQL (pg pool)| BD[(PostgreSQL<br/>migraciones + RLS)]
    API -->|JWT| Sesiones[Sesiones / Tokens<br/>access + refresh]
    API -->|OTP| Proveedores[(Twilio SMS<br/>WhatsApp Meta)]
    API -->|Pagos| Pagos[(PagoMóvil<br/>Binance Pay)]
    API -->|Archivos| Storage[(Storage local<br/>o Cloudflare R2)]
    BD -->|RLS políticas| Tablas[Tablas:<br/>usuarios, conductores,<br/>viajes, billetera,<br/>solicitudes, negocios]
```

**Flujo de una petición:**
1. Cliente (web o app) envía `HTTPS` → `API_URL` (ej. `https://api.llegate.app`).
2. API valida el `JWT` (access token) en `Authorization: Bearer <token>`.
3. API ejecuta SQL contra PostgreSQL mediante `pg.Pool`, respetando **políticas RLS** según el rol del usuario (`auth.uid()` / `request.jwt.claim.*`).
4. API responde `JSON` al cliente.
5. Los archivos (cédula, licencia, comprobantes) se suben a storage privado y se entregan mediante URLs firmadas por la API.

---

## 3. Capas y responsabilidades

### 3.1 Cliente Web (`lllegate-sim/src/`)
- Framework: React + React Router + Vite.
- Cliente HTTP centralizado: `src/lib/api.ts` (`request()` con retry, refresh automático de token, manejo de errores).
- Estado de sesión: `access_token`, `refresh_token`, `expires_at` guardados en `sessionStorage` (`llegate_sesion_v1`).
- Modo demostración: si no existe `VITE_API_URL`, la web funciona con `demoStorage.ts` (sin API real).
- Pantallas clave: `Home`, `Ingresar`, `PerfilScreen`, `WalletScreen`, `HistoryScreen`, `Market`, `VerificacionConductor`, `AdminSolicitudes`, `AdminOperaciones`, `AdminCobros`, `Cobertura`, `Tarifas`, `ClubVip`, `Empresas`, `Aliados`.

### 3.2 API (`lllegate-sim/server/`)
- Punto de entrada: `src/index.js` → crea `express()` en `src/app.js`.
- Configuración central: `src/config.js` (lee `.env`, valida `DATABASE_URL`, JWT, OTP, storage, pagos).
- Conexión a BD: `src/db.js` (`pg.Pool`, parser NUMERIC→Number, helper `enSesion()` para fijar `request.jwt.claim.sub/role` por transacción y usar RPCs de Postgres).
- Validación: `src/schemas.js` (Zod) para todos los cuerpos de petición.
- Middleware: `src/middleware.js` (`requireUser` valida JWT), `src/http.js` (manejo de errores), `src/security/rateLimit.js` (límites por IP/teléfono).

### 3.3 App móvil Android (`apps/android/`)
- Lenguaje: Kotlin / Gradle.
- Contiene una `WebView` (ej. `LeafletDarkMapView.kt` con JavaScript, DOM storage y base de datos web habilitados) que carga la misma aplicación web.
- Al compartir la web dentro de la WebView, la app usa la **misma `VITE_API_URL`**, la **misma API** y la **misma base de datos**.
- Las cookies/tokens de sesión se gestionan desde la web (WebView); no hay una API paralela en Kotlin.

### 3.4 Base de datos (`lllegate-sim/db/migrations/`)
- Motor: PostgreSQL con extensión `pgcrypto`.
- Seguridad a nivel de fila: **RLS (Row Level Security)** en todas las tablas sensibles.
- Acceso del cliente solo a través de la API; `service_role` solo para tareas de administración vía RPCs `SECURITY DEFINER`.
- Migraciones numeradas por fecha (aplicar en orden, ver `db/README.md`).

---

## 4. Modelo de datos (tablas principales)

| Tabla | Descripción |
|-------|-------------|
| `public.usuarios` | Perfil 1:1 con `auth.users`. Campos: `id`, `rol` (cliente/conductor/admin), `nombre`, `telefono`, `telefono_verificado`, `email`, `whatsapp`, `saldo_billetera`, `estado`, `ciudad`. |
| `public.conductores_detalles` | Datos del conductor: `cedula` (VE/E), `tipo_vehículo` (moto/carro), `placa`, `marca`, `modelo`, `anio`, URLs de documentos (`cedula_url`, `licencia_url`, `certificado_medico_url`), `verificacion` (pendiente/aprobado/rechazado), `estado_conductor`. |
| `public.viajes` | Solicitudes de viaje: estado (solicitado/aceptado/en_curso/finalizado/cancelado), conductor, pasajero, origen, destino, tarifa, comisión. |
| `public.transacciones_billetera` | Movimientos de saldo: tipo (recarga/comisión/ajuste/devolución), estado, método (pago_movil/binance_pay/efectivo/saldo), monto USD, referencia, comprobante. |
| `public.configuracion_comisiones` | Tarifas y comisiones del plataforma (editable solo por admin). |
| `public.solicitudes` | Formularios públicos (contacto, empresas, aliados, cobertura, lanzamiento, piloto). |
| `public.negocios` | Vitrina "Mercado Motor": fichas de negocios (repuestos, talleres, cauchos, grúas, lubricantes, accesorios) con estado (pendiente/publicado/rechazado/archivado). |
| `storage.buckets` | `documentos-conductores` (privado, 10 MB, imágenes/PDF). |

**Tipos enum definidos:** `rol_usuario`, `tipo_vehiculo`, `estado_verificacion`, `estado_conductor`, `estado_viaje`, `tipo_transaccion`, `estado_transaccion`, `metodo_pago`.


---

## 5. Autenticación y sesiones

1. **Registro / inicio de sesión por OTP:**
   - `POST /auth/request` → valida teléfono (E.164, `+58...`), crea/actualiza cuenta, genera código de 6 dígitos, lo envía por WhatsApp o SMS (Twilio / Meta WhatsApp). Si no hay proveedor configurado, solo lo escribe en log (desarrollo).
   - `POST /auth/verify` → valida el código, crea sesión y devuelve `access_token` (TTL 1 h por defecto) + `refresh_token` (30 días).
   - `POST /auth/refresh` → rota el refresh token y devuelve un nuevo access token.
   - `POST /auth/logout` → revoca solo la sesión actual (web y app pueden tener sesiones independientes sobre la misma cuenta).
   - `GET /auth/me` → devuelve perfil del usuario autenticado.
   - `PATCH /auth/perfil` → edita nombre, estado, ciudad, WhatsApp (el cliente no puede cambiar rol, saldo ni teléfono verificado).

2. **Control de acceso:** cada ruta protegida usa `requireUser`, que valida el JWT. Las políticas RLS de PostgreSQL filtran filas según `auth.uid()` / `request.jwt.claim.role`.

3. **Rate limiting:** límites por teléfono y por IP para envío de OTP y verificación de códigos (evita abuso y fuerza bruta).

---

## 6. Endpoints API principales

| Prefijo | Endpoints representativos | Descripción |
|---------|--------------------------|-------------|
| `/auth` | `POST /request`, `POST /verify`, `POST /refresh`, `POST /logout`, `GET /me`, `PATCH /perfil` | Autenticación OTP, JWT, perfil |
| `/config` | `GET /` | Configuración pública (métodos de pago, límites, billetera) |
| `/drivers` | `POST /me/documentos`, consultas de conductor | Registro y documentos de conductor |
| `/wallet` | `GET /saldo`, `POST /recarga`, `POST /pago-reportado` | Billetera USD, recargas, comprobantes |
| `/payments` | Webhooks de PagoMóvil y Binance Pay | Confirmación externa de pagos |
| `/trips` | `POST`, `GET`, `PUT /estado` | Viajes (pedir, aceptar, finalizar, cancelar) |
| `/solicitudes` | `POST` (público), `GET/POST /admin/*` | Formularios públicos y bandeja de admin |
| `/negocios` | `GET`, `POST`, `PATCH /:id/estado` | Vitrina Mercado Motor (leer y proponer fichas) |
| `/admin` | Bandeja de solicitudes, cobros, operaciones | Panel de operaciones |
| `/files` | Descargas firmadas de documentos | Enlaces temporales (900 s) |
| `/webhooks` | Webhooks externos | Pagos, WhatsApp, etc. |
| `/health`, `/health/db`, `/health/otp` | Diagnóstico | Estado de API, base de datos y canal OTP |

Todos los cuerpos de petición son validados con **Zod** (`src/schemas.js`) antes de llegar a la lógica de negocio.

---

## 7. Cómo app y web trabajan con la MISMA base de datos

Este es el punto central de tu solicitud. La estrategia ya está implementada y solo hay que preservarla/afianzarla:

1. **Un único punto de entrada:** tanto la web (`VITE_API_URL`) como la app (WebView que carga la web) apuntan a la **misma URL de la API**. No existen dos APIs.
2. **Un único almacén de datos:** la API es el único cliente de PostgreSQL. La app nunca ejecuta `SELECT`/`INSERT` directo contra la BD.
3. **Mismos tokens:** el JWT se genera en la API y se consume por igual desde la web y desde la WebView de la app. Una sesión iniciada en la web es válida en la app (y viceversa) mientras use el mismo `API_URL`.
4. **Mismo modelo de datos:** las migraciones SQL en `db/migrations/` definen una sola base de datos para ambos clientes.
5. **Mismo almacenamiento de archivos:** los documentos subidos desde la app o la web van al mismo bucket privado `documentos-conductores` y se sirven mediante URLs firmadas por la API.

**Condiciones para mantener esta unión:**
- `VITE_API_URL` debe ser idéntica en la build web y en la configuración de la WebView de Android.
- `CORS_ORIGIN` en `server/src/config.js` debe incluir el origen de la web y, si la WebView lo necesita, permitir el origen de la app.
- Las migraciones de BD se aplican en un solo lugar (`npm run db:migrate` en `server/`), no se duplican por cliente.


---

## 8. Flujos clave de datos

### A. Registro y primera sesión (app o web)
```
Cliente → POST /auth/request (teléfono + rol)
API → crea/actualiza public.usuarios
API → genera código 6 dígitos → Twilio/WhatsApp
Cliente → POST /auth/verify (teléfono + código)
API → valida código → crearSesion() → access_token + refresh_token
Cliente → guarda tokens en sessionStorage
```

### B. Recarga de billetera (USD)
```
Cliente → POST /wallet/recarga (monto, método pago_movil/binance_pay, referencia, comprobante base64)
API → insert public.transacciones_billetera (estado='pendiente')
Proveedor de pago → webhook /payments/webhook
API → aprueba/rechaza transacción → actualiza public.usuarios.saldo_billetera (siempre ≥ 0)
```

### C. Pedir un viaje (cliente → conductor)
```
Cliente → POST /trips (origen, destino)
API → insert public.viajes (estado='solicitado')
Conductor → GET /trips disponibles → acepta
API → UPDATE estado='aceptado', asigna conductor_id
Durante el viaje → estado='en_curso'
Al finalizar → estado='finalizado', se aplica comisión y se ajusta saldo
```

### D. Publicar un negocio (Mercado Motor)
```
Cliente → POST /negocios (nombre, categoría, ciudad, oferta, contacto...)
API → insert public.negocios (estado='pendiente')
Admin → PATCH /negocios/:id/estado (publicado/rechazado + motivo)
Web/App → GET /negocios muestra solo estado='publicado'
```

---

## 9. Variables de entorno críticas (`.env`)

| Variable | Propósito | Ejemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (obligatoria, debe empezar por `postgresql://`) | `postgresql://user:pass@host:5432/db` |
| `DATABASE_SSL` | Forzar SSL (Neon, Render, Railway) | `true` |
| `AUTH_JWT_SECRET` | Secreto para firmar JWT | `...` |
| `VITE_API_URL` | URL de la API que usa la web/app | `https://api.llegate.app` |
| `CORS_ORIGIN` | Orígenes permitidos por CORS | `http://localhost:5174,https://web.llegate.app` |
| `OTP_SECRET`, `TWILIO_*`, `WHATSAPP_*` | Envío de códigos OTP | `...` |
| `PAGO_MOVIL_*`, `BINANCE_PAY_*` | Configuración de pagos | `...` |
| `STORAGE_DRIVER` | `local` (dev) o `r2` (producción) | `local` |
| `R2_*` | Credenciales Cloudflare R2 (si `STORAGE_DRIVER=r2`) | `...` |

---

## 10. Recomendaciones para mantener app y web en la misma BD

1. **No crear una API separada para la app.** Reutilizar `lllegate-sim/server/`. Si la app nativa necesita endpoints que la web no expone, añadirlos a la misma API Express, no duplicar lógica.
2. **Sincronizar `VITE_API_URL`** en el build de la web y en la configuración de la WebView de Android.
3. **Mantener una sola cadena de migraciones** en `lllegate-sim/db/migrations/` y aplicar siempre con `npm run db:migrate` antes de desplegar.
4. **Probar `/health/db`** tras cada despliegue para confirmar que la API alcanza la misma PostgreSQL que usa la web.
5. **No escribir SQL directo desde el cliente.** Toda lectura/escritura debe pasar por los endpoints y las políticas RLS.
6. **Variables de entorno idénticas** para el servidor en todos los entornos (desarrollo, staging, producción) para que la BD sea la misma (o el clon correcto por entorno).

---

## 11. Estado del repositorio al momento del análisis

- Rama: `main`, sincronizada con `origin/main` (`https://github.com/zander-doc/llegateappvenezuela.git`).
- Hay cambios pendientes (staged y unstaged) en `lllegate-sim/` relativos a la vitrina de negocios, billetera, pantallas y scripts de corrección. Estos cambios **no fueron revertidos ni modificados** por este informe.
- El presente informe se agrega como archivo nuevo sin tocar el código existente.

---


---

## 6. Integración Híbrida y Seguridad Avanzada

### 6.1 Flujo de Recarga Híbrida (Físico ↔ Digital)
El sistema soporta nativamente el modelo de negocio de la AppBoutique física mediante el endpoint `POST /wallet/recargar`. Este permite que un operador autorizado (rol `admin`) procese pagos en efectivo o vía Pago Móvil desde una tablet o PC en el mostrador.
- **Seguridad Transaccional:** Utiliza transacciones atómicas (`BEGIN`/`COMMIT`/`ROLLBACK`) con bloqueo de fila (`FOR UPDATE`) para evitar condiciones de carrera.
- **Auditoría:** Registra la transacción en `public.transacciones_billetera` con tipo `ajuste` (para cumplir con los constraints de métodos de pago), auditando el `created_by` y `aprobada_por`.
- **Sincronización:** Al confirmarse, el `saldo_billetera` en `public.usuarios` se actualiza instantáneamente, reflejándose en tiempo real tanto en la app móvil como en la web.

### 6.2 Seguridad: Validación JWT y Row Level Security (RLS)
La API aplica una defensa en profundidad:
1. Validación estricta de payloads de entrada mediante **Zod** (UUIDs, montos máximos, tipos de dato).
2. La API valida el token JWT en cada solicitud para identificar al usuario y su rol.
3. Las consultas inyectan parámetros de forma segura para prevenir inyecciones SQL, complementado con políticas RLS en PostgreSQL para asegurar que las filas solo sean accesibles por el propietario o roles administrativos.

### 6.3 Integración Nativa: WebView y JavaScript Bridge
La app móvil (`apps/android/`) utiliza un WebView con un **Puente JavaScript (JS Bridge)** en Kotlin. Esto permite que la interfaz web solicite funcionalidades nativas del dispositivo Android, específicamente:
- Activación y lectura de coordenadas GPS para el rastreo de viajes.
- Apertura de la cámara nativa para la captura de documentos (licencia, fotos del vehículo).
- Registro del dispositivo para la recepción de Notificaciones Push.

---

## 12. Siguiente paso sugerido

Revisar este mapa con el equipo y, una vez validado, proceder a:
1. Desplegar la API apuntando a la PostgreSQL única.
2. Configurar `VITE_API_URL` igual en web y app Android.
3. Ejecutar las migraciones pendientes (`npm run db:migrate` en `server/`).
4. Probar `/health`, `/health/db` y un flujo completo (registro → perfil → recarga → viaje) desde web y desde app.

---

*Documento generado a partir del análisis estático del repositorio `llegatevenezuela`. No contiene credenciales ni secretos.*

