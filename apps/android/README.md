# Llégate — app Android

App nativa (Kotlin + Jetpack Compose) para pasajeros y pilotos en la Región
Central de Venezuela. Es el cliente móvil de la misma API que usa la web
(`lllegate-sim/server`), así que el registro, el saldo y los viajes son
compartidos: una cuenta, dos clientes.

## Estado

Hoy la pantalla funciona con datos sembrados en `LlegateViewModel`: muestra el
servicio, calcula la tarifa y simula el viaje, pero todavía no inicia sesión ni
lee la base de datos. La conexión real con `/auth/otp`, `/config/app`, `/trips`
y `/wallet` es el trabajo en curso.

## Requisitos

- JDK 17 o superior (lo trae Android Studio).
- Android SDK con API 36 y platform-tools.
- Un teléfono o emulador con Android 7.0 (API 24) o más nuevo.

## Compilar

```bash
cd apps/android
./gradlew assembleDebug          # APK de prueba
./gradlew testDebugUnitTest      # pruebas del view model
```

El APK queda en `app/build/outputs/apk/debug/app-debug.apk`. Para instalarlo en un
dispositivo conectado por USB o en BlueStacks:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## La API

La app habla con `https://llegate-app-api.onrender.com`. La dirección se fija en
`ApiConfig` (se añade cuando exista la capa de red); no hay claves ni tokens
empaquetados en el APK: el acceso es por código enviado al teléfono.
