# Llégate — app Android

App nativa (Kotlin + Jetpack Compose) para pasajeros y pilotos en la Región
Central de Venezuela. Es el cliente móvil de la misma API que usa la web
(`lllegate-sim/server`), así que el registro, el saldo y los viajes son
compartidos: una cuenta, dos clientes.

## Estado

El ingreso ya es real: `ui/screens/LoginScreen.kt` pide el código en `/auth/otp`,
verifica en `/auth/verify` y guarda la sesión en `data/SessionStore`. La hoja de
cuenta del icono de persona muestra el nombre, el teléfono enmascarado y el saldo
que devuelve `/auth/me`, y su botón de cerrar sesión invalida el token. Las
tarifas se leen de `/config/app` y se calculan con la misma fórmula que la web
(`model/Models.kt::tarifaUsd`).

Sigue simulado: los pilotos cercanos, la búsqueda y el seguimiento del viaje y el
historial. La capa de datos de viajes y billetera ya está escrita y probada contra
los JSON reales de la API (`network/AuthorizedClient.kt` renueva el token y
reintenta ante un 401; `TripRepository.kt` traduce los `409 + motivo` de los RPC a
frases entendibles; `WalletRepository.kt` lee saldo, reserva y límites de
`/wallet/billetera`), pero todavía no está conectada a ninguna pantalla. Lo que
sigue es eso: pedir y seguir el viaje con `/trips`, y las recargas con el mismo
flujo de la web (`/payments/intents` + reporte). También falta la verificación de
documentos del piloto. La vitrina de concesionarios (`automotivePartners`) lista
beneficios comerciales que aún no están firmados: hay que confirmarlos o retirarlos
antes de publicar.

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

## La API

La app habla con `https://llegate-app-api.onrender.com`. La dirección se fija en
`ApiConfig`; no hay claves ni tokens empaquetados en el APK: el acceso es por
código enviado al teléfono y la sesión de este dispositivo se guarda sola, junto
con el `refresh_token` que la API rota en cada renovación.
