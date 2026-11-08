package com.llegate

import com.llegate.model.LocationPoint
import com.llegate.network.FavoriteRepository
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class FavoriteFeaturesTest {

  @Test
  fun `favoritos usan las rutas reales y conservan sus coordenadas`() = runBlocking {
    val api = ApiFalsa(
      respuestas = mapOf(
        "/api/favoritos/direcciones" to JSONObject(
          """{"ok":true,"direcciones":[{"id":"a1","etiqueta":"Casa",
            "direccion_texto":"Calle 1 • Maracay","lat":"10.25","lng":-67.58}]}"""
        ),
        "/api/favoritos/conductores" to JSONObject(
          """{"ok":true,"conductores":[{"conductor_id":"d1","nombre":"Wilmer",
            "tipo_vehiculo":"moto","placa":"AB123CD","marca":"Honda","modelo":"Wave"}]}"""
        ),
        "/api/referidos" to JSONObject(
          """{"ok":true,"resumen":{"codigo_referido":"LLEGATE-ABC","invitados":2,
            "invitados_bonificados":1,"bono_acumulado_usd":"5.00","saldo_billetera":"7.50"}}"""
        ),
        "/api/favoritos/conductores/d1" to JSONObject("""{"ok":true}""")
      )
    )
    val repository = FavoriteRepository(clienteAutorizado(api))

    val address = repository.addresses().single()
    val driver = repository.drivers().single()
    val summary = repository.referralSummary()
    repository.deleteDriver(driver.id)

    assertEquals("Casa", address.label)
    assertEquals(10.25, address.lat, 0.0)
    assertEquals("Calle 1 • Maracay", address.asLocationPoint().title)
    assertEquals("Honda Wave", driver.vehicle)
    assertEquals("LLEGATE-ABC", summary.code)
    assertEquals(2, summary.invitedCount)
    assertEquals(5.0, summary.accruedUsd, 0.0)
    assertEquals(
      listOf(
        "/api/favoritos/direcciones",
        "/api/favoritos/conductores",
        "/api/referidos",
        "/api/favoritos/conductores/d1"
      ),
      api.llamadas.map { it.first }
    )
    assertTrue(api.tokens.all { it == "access-de-prueba" })
  }

  @Test
  fun `guardar y aplicar mandan el cuerpo que espera la API`() = runBlocking {
    val api = ApiFalsa(
      respuestas = mapOf(
        "/api/favoritos/direcciones" to JSONObject(
          """{"ok":true,"direccion":{"id":"a2","etiqueta":"Trabajo",
            "direccion_texto":"Av. Bolívar • Maracay","lat":10.24,"lng":-67.59}}"""
        ),
        "/api/favoritos/conductores" to JSONObject("""{"ok":true}"""),
        "/api/referidos/aplicar" to JSONObject("""{"ok":true,"estado":"pendiente"}""")
      )
    )
    val repository = FavoriteRepository(clienteAutorizado(api))

    repository.saveAddress("Trabajo", LocationPoint("Av. Bolívar", "Maracay", 10.24, -67.59))
    repository.addDriver("driver-id")
    assertEquals("pendiente", repository.applyReferral("llegate-codigo"))

    assertEquals("Trabajo", api.llamadas[0].second.getString("etiqueta"))
    assertEquals("Av. Bolívar • Maracay", api.llamadas[0].second.getString("direccion_texto"))
    assertEquals(10.24, api.llamadas[0].second.getDouble("lat"), 0.0)
    assertEquals("driver-id", api.llamadas[1].second.getString("conductor_id"))
    assertEquals("LLEGATE-CODIGO", api.llamadas[2].second.getString("codigo_referido"))
  }
}
