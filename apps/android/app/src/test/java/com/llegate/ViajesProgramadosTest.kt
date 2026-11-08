package com.llegate

import com.llegate.model.LocationPoint
import com.llegate.network.EstadoViajeProgramado
import com.llegate.network.ScheduledRideRepository
import com.llegate.network.estadoViajeProgramadoDe
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.Instant
import java.time.temporal.ChronoUnit

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ViajesProgramadosTest {

  @Test
  fun `crear envia ruta fecha tarifa pago y coordenadas a la API`() = runBlocking {
    val api = ApiFalsa(
      respuestas = mapOf(
        "/scheduled-rides" to JSONObject(
          """{"ok":true,"viaje_programado":{
            "id":"p1","estado":"programado","origen":"Origen","destino":"Destino",
            "origen_lat":10.25,"origen_lng":-67.58,"destino_lat":10.26,"destino_lng":-67.59,
            "servicio":"mototaxi","programado_para":"2026-11-10T12:00:00Z",
            "distancia_km":"2.50","precio_usd":"3.25","metodo_pago":"efectivo",
            "cancelado_en":null,"created_at":"2026-11-09T10:00:00Z"}}"""
        )
      )
    )
    val fecha = Instant.now().plus(1, ChronoUnit.DAYS).toString()

    val viaje = ScheduledRideRepository(clienteAutorizado(api)).crear(
      origen = LocationPoint("Origen", "Calle 1", 10.25, -67.58),
      destino = LocationPoint("Destino", "Calle 2", 10.26, -67.59),
      servicio = "mototaxi",
      programadoPara = fecha,
      precioUsd = 3.25,
      distanciaKm = 2.5,
      metodoPago = "efectivo"
    )

    val (path, body) = api.llamadas.single()
    assertEquals("/scheduled-rides", path)
    assertEquals("Origen", body.getString("origen"))
    assertEquals("Destino", body.getString("destino"))
    assertEquals(10.25, body.getDouble("origen_lat"), 0.0)
    assertEquals(-67.59, body.getDouble("destino_lng"), 0.0)
    assertEquals("mototaxi", body.getString("servicio"))
    assertEquals(fecha, body.getString("programado_para"))
    assertEquals(3.25, body.getDouble("precio_usd"), 0.0)
    assertEquals("efectivo", body.getString("metodo_pago"))
    assertEquals("access-de-prueba", api.tokens.single())
    assertEquals(EstadoViajeProgramado.PROGRAMADO, viaje.estado)
    assertEquals(2.5, viaje.distanciaKm!!, 0.0)
  }

  @Test
  fun `listar y cancelar leen los estados guardados por el servidor`() = runBlocking {
    val lista = JSONObject(
      """{"ok":true,"viajes_programados":[{
        "id":"p1","estado":"programado","origen":"Origen","destino":"Destino",
        "origen_lat":null,"origen_lng":null,"destino_lat":null,"destino_lng":null,
        "servicio":"taxi-pana","programado_para":"2026-11-10T12:00:00Z",
        "distancia_km":null,"precio_usd":4,"metodo_pago":"saldo",
        "cancelado_en":null,"created_at":"2026-11-09T10:00:00Z"}]}"""
    )
    val cancelado = JSONObject(
      """{"ok":true,"viaje_programado":{
        "id":"p1","estado":"cancelado","origen":"Origen","destino":"Destino",
        "servicio":"taxi-pana","programado_para":"2026-11-10T12:00:00Z",
        "precio_usd":4,"metodo_pago":"saldo","cancelado_en":"2026-11-09T11:00:00Z"}}"""
    )
    val api = ApiFalsa(
      respuestas = mapOf(
        "/scheduled-rides" to lista,
        "/scheduled-rides/p1/cancel" to cancelado
      )
    )
    val repository = ScheduledRideRepository(clienteAutorizado(api))

    val viajes = repository.listar()
    val viajeCancelado = repository.cancelar("p1")

    assertEquals(listOf("/scheduled-rides", "/scheduled-rides/p1/cancel"), api.llamadas.map { it.first })
    assertEquals(1, viajes.size)
    assertNull(viajes.single().origenLat)
    assertEquals(EstadoViajeProgramado.CANCELADO, viajeCancelado.estado)
    assertTrue(viajeCancelado.canceladoEn!!.isNotBlank())
  }

  @Test
  fun `estado futuro desconocido no rompe el parseo`() {
    assertEquals(EstadoViajeProgramado.DESCONOCIDO, estadoViajeProgramadoDe("expirado"))
  }
}
