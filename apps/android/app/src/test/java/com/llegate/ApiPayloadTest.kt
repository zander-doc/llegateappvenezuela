package com.llegate

import com.llegate.model.ServiceType
import com.llegate.model.tarifaUsd
import com.llegate.network.configFrom
import com.llegate.network.sessionFrom
import com.llegate.network.usuarioFrom
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ApiPayloadTest {

  @Test
  fun `la config de la API es la que muestra la web`() {
    val config = configFrom(JSONObject(CONFIG_APP))

    assertEquals(1, config.version)
    assertEquals(6, config.services.size)

    val mototaxi = config.service("mototaxi")!!
    assertEquals(1.0, mototaxi.minFareUsd, 0.0)
    assertEquals(0.3, mototaxi.perKmUsd, 0.0)
    assertTrue(mototaxi.estaEnLanzamiento)
    assertNull(mototaxi.fase)

    val taxi = config.service("taxi-pana")!!
    assertEquals(3.0, taxi.minFareUsd, 0.0)
    assertEquals(0.5, taxi.perKmUsd, 0.0)

    val delivery = config.service("delivery")!!
    assertEquals(1.0, delivery.minFareUsd, 0.0)
    assertEquals(0.35, delivery.perKmUsd, 0.0)

    val minivan = config.service("minivan-vip")!!
    assertFalse(minivan.estaEnLanzamiento)
    assertEquals("Fase 2", minivan.fase)

    assertEquals(listOf("mototaxi", "taxi-pana", "delivery"),
      config.services.filter { it.estaEnLanzamiento }.map { it.slug })

    assertEquals(0.04, config.fareRules.perMinuteUsd, 0.0)
    assertTrue(config.fareRules.roundTripDoublesDistance)
    assertTrue(config.fareRules.minFareChargedOnce)
    assertEquals("min_fare_plus_km", config.fareRules.model)

    assertEquals(0.1, config.walletRules.commissionRate, 0.0)
    assertEquals(0.1, config.walletRules.minCommissionUsd, 0.0)
    assertEquals(1.0, config.walletRules.minBalanceUsd, 0.0)
    assertEquals(2.0, config.walletRules.lowBalanceUsd, 0.0)
    assertEquals(2.0, config.walletRules.welcomeUsd, 0.0)
    assertEquals(5.0, config.walletRules.minRechargeUsd, 0.0)
    assertEquals(50.0, config.walletRules.maxRechargeUsd, 0.0)
    assertEquals(15, config.walletRules.approvalSlaMinutes)

    assertEquals(4, config.rechargePacks.size)
    assertEquals("Ritmo", config.rechargePacks.first { it.recomendado }.name)
  }

  @Test
  fun `verify devuelve la sesion completa`() {
    val session = sessionFrom(
      JSONObject(
        """
        {"ok":true,"access_token":"eyJhbGciOiJIUzI1NiJ9.cabeza.firma",
         "refresh_token":"refresh-opaco","expires_at":1793894400,
         "usuario":{"id":"3f2a","telefono":"+584141234567"}}
        """.trimIndent()
      )
    )

    assertEquals("refresh-opaco", session.refreshToken)
    assertEquals(1793894400L, session.expiresAt)
    assertEquals("3f2a", session.userId)
    assertEquals("+584141234567", session.telefono)
  }

  @Test
  fun `me separa pasajero piloto y saldo`() {
    // saldo_billetera es numeric(12,2): la app lo acepta número o como texto ("7.50").
    val pasajero = usuarioFrom(
      JSONObject(
        """
        {"ok":true,
         "usuario":{"id":"3f2a","rol":"cliente","nombre":"Ana Pérez","telefono":"+584141234567",
                    "telefono_verificado":true,"email":null,"whatsapp":"+584141234567",
                    "estado":"Aragua","ciudad":"Maracay","saldo_billetera":"7.50"},
         "conductor":null,
         "capacidades":{"puede_pedir_viajes":true,"puede_conducir":false}}
        """.trimIndent()
      )
    )

    assertEquals("cliente", pasajero.rol)
    assertEquals(7.5, pasajero.saldoBilletera, 0.0)
    assertNull(pasajero.conductor)
    assertTrue(pasajero.puedePedirViajes)
    assertFalse(pasajero.puedeConducir)

    val piloto = usuarioFrom(
      JSONObject(
        """
        {"ok":true,
         "usuario":{"id":"8b1c","rol":"conductor","nombre":"Luis","telefono":"+584241112233",
                    "saldo_billetera":0},
         "conductor":{"tipo_vehiculo":"moto","placa":"AB123CD","verificacion":"aprobado",
                      "estado":"activo","motivo_rechazo":null,"verificado_en":"2026-11-01T10:00:00Z"},
         "capacidades":{"puede_pedir_viajes":false,"puede_conducir":true}}
        """.trimIndent()
      )
    )

    assertEquals(0.0, piloto.saldoBilletera, 0.0)
    assertTrue(piloto.conductor!!.aprobado)
    assertEquals("moto", piloto.conductor?.tipoVehiculo)
    assertTrue(piloto.puedeConducir)
  }

  @Test
  fun `los precios del APK coinciden con los que publica la API`() {
    val config = configFrom(JSONObject(CONFIG_APP))

    for (tipo in listOf(ServiceType.MOTO, ServiceType.CAR, ServiceType.DELIVERY)) {
      val servicio = config.service(tipo.slug)
      assertNotNull("falta ${tipo.slug} en /config/app", servicio)
      assertEquals(tipo.name, servicio!!.minFareUsd, tipo.minFareUsd, 0.0)
      assertEquals(tipo.name, servicio.perKmUsd, tipo.perKmUsd, 0.0)
    }
  }

  @Test
  fun `la tarifa es minima mas kilometros mas minutos`() {
    val config = configFrom(JSONObject(CONFIG_APP))

    // Mototaxi: 1,00 mínima + 0,30 x 3 km + 0,04 x 6 min
    assertEquals(2.14, tarifaUsd(config, ServiceType.MOTO, 3.0, 6), 0.0)
    // Taxi Pana: 3,00 + 0,50 x 10 km + 0,04 x 25 min
    assertEquals(9.00, tarifaUsd(config, ServiceType.CAR, 10.0, 25), 0.0)
    // Sin viaje cobrado por tiempo queda en la tarifa mínima
    assertEquals(1.00, tarifaUsd(config, ServiceType.MOTO, 0.0, 0), 0.0)
    // Y sin /config/app se usan los mismos números del APK
    assertEquals(2.14, tarifaUsd(null, ServiceType.MOTO, 3.0, 6), 0.0)
  }

  private companion object {
    const val CONFIG_APP =
      """{"ok":true,"version":1,"services":[{"slug":"mototaxi","name":"Mototaxi","short":"El viaje más rápido para distancias cortas.","tagline":"Llega en minutos, sin trancas.","description":"Para trayectos cortos dentro de la ciudad: de la casa al trabajo, al mercado o a la parada. Pides desde la app, ves el precio antes de confirmar y compartes tu ruta con quien quieras.","icon":"bike","minFareUSD":1,"perKmUSD":0.3,"capacity":"1 pasajero","eta":"3 a 7 min","status":"launch","phase":null},{"slug":"taxi-pana","name":"Taxi Pana","short":"El carro completo, para ti y los tuyos.","tagline":"Tu carro, tu música, tu ruta.","description":"Un carro privado para hasta cuatro pasajeros. Ideal para diligencias, salidas familiares o cuando llevas equipaje. Tarifa calculada por distancia, sin regateos.","icon":"car","minFareUSD":3,"perKmUSD":0.5,"capacity":"Hasta 4 pasajeros","eta":"5 a 10 min","status":"launch","phase":null},{"slug":"minivan-vip","name":"Minivan VIP","short":"Aeropuerto, empresas y traslados reservados.","tagline":"Reserva con tiempo. Viaja cómodo.","description":"Minivans de 7 plazas para traslados al aeropuerto, reuniones de trabajo o grupos. Se reserva con anticipación y el conductor te espera con tu nombre en la salida.","icon":"van","minFareUSD":25,"perKmUSD":1.4,"capacity":"Hasta 7 pasajeros","eta":"Reserva programada","status":"upcoming","phase":"Fase 2"},{"slug":"autobus-frontera","name":"Autobús y Frontera","short":"Rutas interurbanas y traslados a la frontera.","tagline":"Sal de la ciudad, con tu puesto asegurado.","description":"Puestos en unidades de 14 a 24 plazas para rutas entre ciudades y hacia la frontera. Compra tu puesto con anticipación, elige tu hora de salida y recibe los datos de la unidad.","icon":"bus","minFareUSD":12,"perKmUSD":0.25,"capacity":"14 a 24 puestos","eta":"Salidas programadas","status":"upcoming","phase":"Fase 3"},{"slug":"delivery","name":"Delivery Express","short":"Envía algo pequeño, hoy mismo.","tagline":"De tu puerta a su puerta.","description":"Entregas dentro de la ciudad en moto o carro. Útil para documentos, comida, medicinas o cualquier paquete de hasta 5 kg. Quien recibe puede confirmar la entrega desde su teléfono.","icon":"package","minFareUSD":1,"perKmUSD":0.35,"capacity":"Hasta 5 kg","eta":"20 a 45 min","status":"launch","phase":null},{"slug":"encomiendas-carga","name":"Encomiendas y Carga","short":"Mudanzas pequeñas y carga ligera.","tagline":"Lo que no cabe en el carro, va aquí.","description":"Camionetas y camiones para encomiendas, mobiliario o carga de hasta 500 kg. Reserva con medida y peso aproximado para asignar la unidad correcta y recibir un precio cerrado.","icon":"truck","minFareUSD":18,"perKmUSD":1.3,"capacity":"Hasta 500 kg","eta":"Reserva programada","status":"upcoming","phase":"Fase 3"}],"fareRules":{"model":"min_fare_plus_km","perKm":true,"perMinuteUSD":0.04,"roundTripDoublesDistance":true,"minFareChargedOnce":true,"currency":"USD"},"walletRules":{"commissionRate":0.1,"minCommissionUSD":0.1,"minBalanceUSD":1,"lowBalanceUSD":2,"welcomeUSD":2,"minRechargeUSD":5,"maxRechargeUSD":50,"approvalSlaMinutes":15},"rechargePacks":[{"amount":5,"name":"Arranque","note":"Para empezar el día","recommended":false},{"amount":10,"name":"Ritmo","note":"La más pedida","recommended":true},{"amount":20,"name":"Semana","note":"Menos recargas","recommended":false},{"amount":50,"name":"Turno largo","note":"Mayor cobertura","recommended":false}]}"""
  }
}
