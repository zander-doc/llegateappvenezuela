package com.llegate

import com.llegate.network.DriverRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class DriverRegistrationTest {
  @Test
  fun `registra moto con datos legales y color del vehiculo`() = runBlocking {
    val api = ApiFalsa(respuestas = mapOf("/drivers/me" to JSONObject("""{"ok":true}""")))
    val repository = DriverRepository(clienteAutorizado(api))

    repository.registrarPerfil(
      mapOf(
        "role" to "driver_moto",
        "cedula" to "V12345678",
        "brand" to "Bera",
        "model" to "SBR",
        "plate" to "AB123CD",
        "color" to "Rojo"
      )
    )

    val (path, body) = api.llamadas.single()
    assertEquals("/drivers/me", path)
    assertEquals("V12345678", body.getString("cedula"))
    assertEquals("moto", body.getString("tipo_vehiculo"))
    assertEquals("AB123CD", body.getString("placa"))
    assertEquals("Bera", body.getString("marca"))
    assertEquals("SBR", body.getString("modelo"))
    assertEquals("Rojo", body.getString("color"))
  }

  @Test
  fun `delivery usa registro de vehiculo carro`() = runBlocking {
    val api = ApiFalsa(respuestas = mapOf("/drivers/me" to JSONObject("""{"ok":true}""")))
    val repository = DriverRepository(clienteAutorizado(api))

    repository.registrarPerfil(
      mapOf(
        "role" to "delivery",
        "cedula" to "V12345678",
        "plate" to "AB123CD"
      )
    )

    assertEquals("carro", api.llamadas.single().second.getString("tipo_vehiculo"))
  }
}
