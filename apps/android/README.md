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
historial. La billetera ya es real: la hoja de cuenta lee `/wallet/billetera` (saldo
disponible, reserva y estado) y `/wallet/movimientos` (los tres últimos movimientos, con
su signo y su estado — una recarga `en_revision` se ve amarilla hasta que un admin la
confirma). El botón «Recargar» abre `RecargaSheet`, que recorre
el mismo flujo de la web — monto y método, `/payments/intents`, los datos del comercio
para Pago Móvil o el checkout de Binance Pay, y el reporte de la referencia que deja la
recarga `en_revision` hasta que un admin la confirma (`network/PagoRepository.kt`
traduce las claves de las RPC a frases y `AuthorizedClient` renueva el token ante un
401). Lo que sigue es conectar los viajes: pedir y seguir el viaje con `/trips`; la
capa de datos (`network/TripRepository.kt`) ya está escrita y probada contra los JSON
reales, pero sin pantalla. También falta la verificación de documentos del piloto. La
vitrina de concesionarios (`automotivePartners`) lista beneficios comerciales que aún
no están firmados: hay que confirmarlos o retirarlos antes de publicar.

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

## Tipografías

La app trae las cuatro familias de la marca que usa la web (Bebas Neue, Outfit,
DM Sans y JetBrains Mono) empaquetadas en `app/src/main/res/font/`; `ui/theme/Type.kt`
las expone como `LlegateDisplay`, `LlegateHeading`, `LlegateBody` y `LlegateMono`.
Cómo se generan y bajo qué licencia están explicados en `fonts/README.md`.

## La API

La app habla con `https://llegate-app-api.onrender.com`. La dirección se fija en
`ApiConfig`; no hay claves ni tokens empaquetados en el APK: el acceso es por
código enviado al teléfono y la sesión de este dispositivo se guarda sola, junto
con el `refresh_token` que la API rota en cada renovación.
