# Llégate — app Android

App nativa (Kotlin + Jetpack Compose) para pasajeros y pilotos en la Región
Central de Venezuela. Es el cliente móvil de la misma API que usa la web
(`lllegate-sim/server`), así que el registro, el saldo y los viajes son
compartidos: una cuenta, dos clientes.

## Estado

La capa de red ya existe (`network/ApiClient.kt`, `AuthRepository`,
`ConfigRepository` y `data/SessionStore`), pero ninguna pantalla la usa todavía:
la UI sigue funcionando con datos sembrados en `LlegateViewModel`, y el viaje es
un temporizador simulado. El siguiente paso es la pantalla de ingreso por código
y, después, que las tarifas se lean de `/config/app` en lugar de los `enum`
fijos de `model/Models.kt`.

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
