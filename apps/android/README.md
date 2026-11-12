# Llégate — app Android

App nativa (Kotlin + Jetpack Compose) para pasajeros y pilotos en la Región
Central de Venezuela. Es el cliente móvil de la misma API que usa la web
(`lllegate-sim/server`), así que el registro, el saldo y los viajes son
compartidos: una cuenta, dos clientes.

## Estado

El ingreso ya es real: `ui/screens/LoginScreen.kt` pide el código en `/auth/otp`,
verifica en `/auth/verify` y guarda la sesión en `data/SessionStore`. La hoja está animada
(fondo de pista con líneas de velocidad, las dos hojas se deslizan entre sí, seis casillas
de código con foco automático y cuenta regresiva en anillo) y es honesta: muestra el canal
que contestó `/auth/otp` («Código enviado por WhatsApp»), deja el error de validación dentro
de la pantalla con sacudida en vez de solo un aviso flotante, y el «¿No te llega el código?»
explica que no hay SMS ni correo y que la plantilla de autenticación depende de la aprobación
de Meta. La hoja de
cuenta del icono de persona muestra el nombre, el teléfono enmascarado y el saldo
que devuelve `/auth/me`, y su botón de cerrar sesión invalida el token. Las
tarifas se leen de `/config/app` y se calculan con la misma fórmula que la web
(`model/Models.kt::tarifaUsd`).

Los viajes también son reales. `BookingScreen` registra el viaje con `POST /trips`
(origen, destino, tarifa y el método de pago de `public.metodo_pago`) y
`TripActiveScreen` pinta lo que contesta `GET /trips/:id` cada 5 segundos: buscando
piloto, el pana que aceptó, en viaje o finalizado. La ficha del piloto lleva solo lo que
hay en la base —nombre, teléfono, vehículo, placa y si su verificación está aprobada—;
no hay reseñas, PIN, color ni ETA inventados, y «Mensaje» abre WhatsApp con el número
real porque la API todavía no tiene chat. Cancelar llama a `/trips/:id/cancelar` y, si
el servidor lo rechaza, el viaje queda abierto con el motivo en pantalla.
`TripHistoryScreen` es exactamente `GET /trips`: fecha, estado, ruta, tarifa (con sus
bolívares cuando el servidor guardó la tasa BCV) y el piloto asignado.

La billetera es real: la hoja de cuenta lee `/wallet/billetera` (saldo disponible,
reserva y estado) y `/wallet/movimientos` (los tres últimos movimientos, con su signo y
su estado — una recarga `en_revision` se ve amarilla hasta que un admin la confirma).
El botón «Recargar» abre `RecargaSheet`, que recorre
el mismo flujo de la web — monto y método, `/payments/intents`, los datos del comercio
para Pago Móvil o el checkout de Binance Pay, y el reporte de la referencia que deja la
recarga `en_revision` hasta que un admin la confirma (`network/PagoRepository.kt`
traduce las claves de las RPC a frases y `AuthorizedClient` renueva el token ante un
401).

Si la app se cerró a mitad de un viaje, al abrir sesión `GET /trips` devuelve el viaje
abierto y la pantalla se reconstruye sola (con la ruta en texto, porque la base guarda
origen y destino como texto, sin coordenadas).

Lo que la API aún no tiene ya no se finge en pantalla: se borraron el radar de pilotos
cercanos, la telemetría GPS (satélites, precisión y rumbo de mentira) y el feed de alertas
de la comunidad con sus reportes guardados solo en el teléfono; `BookingScreen` dejó de
contar cuántos panas están cerca y de prometer respuesta en menos de un minuto, y la
sección de alertas queda rotulada «Próximamente». El mapa (`LeafletDarkMapView`) solo
dibuja la ruta declarada en el viaje. Siguen pendientes la verificación de documentos del
piloto y decidir qué hacer con la vitrina de concesionarios (`automotivePartners`), que
lista beneficios aún no firmados.

`MapboxDarkMapScreen` está disponible como componente reutilizable en
`ui/components/MapboxViewComponent.kt`, pero todavía no reemplaza el mapa Leaflet activo:
este último conserva la selección de destino y las rutas de la app.

## Requisitos

- JDK 17 o superior (lo trae Android Studio).
- Android SDK con API 36 y platform-tools.
- Un teléfono o emulador con Android 7.0 (API 24) o más nuevo.

## Compilar

```bash
cd apps/android
./gradlew assembleDebug          # APK de prueba
./gradlew testDebugUnitTest      # pruebas de la pantalla y de los JSON de la API
```

El APK queda en `app/build/outputs/apk/debug/app-debug.apk`. Para instalarlo en un
dispositivo conectado por USB o en BlueStacks:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Firma y versiones

La versión se configura en `gradle.properties`: incrementa `LLEGATE_VERSION_CODE`
en cada build que vayas a instalar o distribuir. Android requiere un código mayor
que el de la versión instalada para actualizarla. Actualiza también
`LLEGATE_VERSION_NAME` para reflejar la versión legible.

Para crear un keystore de release, ejecuta `keytool` (incluido con el JDK) y
elige contraseñas seguras cuando las solicite:

```powershell
keytool -genkeypair -v -keystore C:/Users/TU_USUARIO/llegate-keys/llegate-release.jks -alias llegate-release -keyalg RSA -keysize 2048 -validity 10000
```

Copia `keystore.properties.example` como `keystore.properties` dentro de
`apps/android/`, y edita `storeFile` para apuntar al archivo `.jks` creado.
Completa `storePassword`, `keyAlias` y `keyPassword` con los datos elegidos al
crear el keystore. No compartas ni subas `keystore.properties` o el keystore al
repositorio.

Si `keystore.properties` está presente, Gradle firma los APKs debug y release
con ese keystore. Si falta, debug usa la clave local predeterminada de Android y
release queda sin firmar; Gradle muestra una advertencia. Builds debug firmados
por claves distintas no se pueden instalar uno sobre otro. Cambiar de firma
obliga a desinstalar la app una vez antes de instalar el nuevo APK; desinstalar
borra los datos locales de la app.

Compila desde `apps/android`:

```powershell
.\gradlew.bat assembleDebug
.\gradlew.bat assembleRelease
```

Los APKs quedan en `app/build/outputs/apk/debug/app-debug.apk` y
`app/build/outputs/apk/release/app-release-unsigned.apk` (sin configuración de
firma) o `app/build/outputs/apk/release/app-release.apk` (firmado).

## Tipografías

La app trae las cuatro familias de la marca que usa la web (Bebas Neue, Outfit,
DM Sans y JetBrains Mono) empaquetadas en `app/src/main/res/font/`; `ui/theme/Type.kt`
las expone como `LlegateDisplay`, `LlegateHeading`, `LlegateBody` y `LlegateMono`.
Cómo se generan y bajo qué licencia están explicados en `fonts/README.md`.

## La API

La app habla con `https://llegate-app-api.onrender.com`. La dirección se fija en
`ApiConfig`; no hay credenciales de acceso a la API empaquetadas en el APK: el
acceso es por código enviado al teléfono y la sesión de este dispositivo se
guarda sola, junto con el `refresh_token` que la API rota en cada renovación.

El SDK de Mapbox usa el recurso `mapbox_access_token`. Para proporcionarlo sin
guardarlo en Git, define la variable de entorno `MAPBOX_ACCESS_TOKEN` antes de
compilar (o pásala como propiedad Gradle con `-PMAPBOX_ACCESS_TOKEN=...`). Si no
se define, el recurso queda vacío; los mapas Mapbox requieren un token público
válido para cargar estilos y datos.
