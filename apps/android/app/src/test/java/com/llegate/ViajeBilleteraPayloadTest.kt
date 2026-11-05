package com.llegate

import com.llegate.model.TripStep
import com.llegate.network.EstadoViaje
import com.llegate.network.TripRepository
import com.llegate.network.activeTripDe
import com.llegate.network.billeteraFrom
import com.llegate.network.estadoViajeDe
import com.llegate.network.movimientoFrom
import com.llegate.network.puntoDeTexto
import com.llegate.network.viajeFrom
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ViajeBilleteraPayloadTest {

  @Test
  fun `un viaje recién pedido no tiene conductor ni comisión`() {
    val viaje = viajeFrom(JSONObject(VIAJE_RECIEN).getJSONObject("viaje"))

    assertEquals(EstadoViaje.SOLICITADO, viaje.estado)
    assertEquals("Maracay, Av. Las Delicias", viaje.origen)
    assertEquals("Terminal de Carga", viaje.destino)
    assertEquals(2.14, viaje.precioUsd, 0.0)
    assertEquals(3.0, viaje.distanciaKm!!, 0.0)
    assertEquals("saldo", viaje.metodoPago)
    assertNull(viaje.conductorId)
    assertNull(viaje.comisionUsd)
  }

  @Test
  fun `el viaje cobra la comisión del diez por ciento al finalizar`() {
    val viaje = viajeFrom(JSONObject(VIAJE_FINALIZADO).getJSONObject("viaje"))

    assertEquals(EstadoViaje.FINALIZADO, viaje.estado)
    assertEquals(9.0, viaje.precioUsd, 0.0)
    assertEquals(0.9, viaje.comisionUsd!!, 0.0)
    assertEquals("efectivo", viaje.metodoPago)
  }

  @Test
  fun `un viaje en curso puede llegar sin distancia y con el precio como texto`() {
    val viaje = viajeFrom(JSONObject(VIAJE_EN_CURSO).getJSONObject("viaje"))

    assertEquals(EstadoViaje.EN_CURSO, viaje.estado)
    assertEquals("8b1c0000-0000-0000-0000-000000000000", viaje.conductorId)
    assertNull("distancia_km es nullable", viaje.distanciaKm)
    assertEquals("la API a veces serializa numeric como texto", 6.30, viaje.precioUsd, 0.0)
    assertEquals("04/11/2026", viaje.fechaTexto)

    val conductor = viaje.conductor!!
    assertEquals("Carlos Conductor", conductor.nombre)
    assertEquals("+584141111112", conductor.telefono)
    assertEquals("AB123CD", conductor.placa)
    assertEquals("Toyota Corolla", "${conductor.marca} ${conductor.modelo}")
    assertTrue("un piloto aprobado se marca como verificado", conductor.verificado)
    assertTrue("un viaje en curso sigue abierto", viaje.abierto)
  }

  @Test
  fun `un viaje recien pedido no tiene piloto y esta abierto`() {
    val viaje = viajeFrom(JSONObject(VIAJE_RECIEN).getJSONObject("viaje"))

    assertNull(viaje.conductor)
    assertTrue(viaje.abierto)
  }

  @Test
  fun `un viaje terminado ya no esta abierto`() {
    val viaje = viajeFrom(JSONObject(VIAJE_FINALIZADO).getJSONObject("viaje"))

    assertEquals(false, viaje.abierto)
    assertNull("la API no siempre manda el piloto en el detalle", viaje.conductor)
  }

  @Test
  fun `el historial se lee en GET trips con la sesion de la app`() = runBlocking {
    val api = ApiFalsa(respuestas = mapOf("/trips" to JSONObject(LISTA_VIAJES)))

    val viajes = TripRepository(clienteAutorizado(api)).listar()

    assertEquals(listOf("/trips"), api.llamadas.map { it.first })
    assertEquals("access-de-prueba", api.tokens.first())
    assertEquals(2, viajes.size)
    assertEquals(listOf(EstadoViaje.EN_CURSO, EstadoViaje.CANCELADO), viajes.map { it.estado })
    assertEquals("AB123CD", viajes[0].conductor?.placa)
    assertNull(viajes[1].conductor)
    assertEquals(listOf(true, false), viajes.map { it.abierto })
  }

  @Test
  fun `el viaje se pide con la tarifa y el metodo de pago que vio el pana`() = runBlocking {
    val api = ApiFalsa(respuestas = mapOf("/trips" to JSONObject(VIAJE_RECIEN)))

    val viaje = TripRepository(clienteAutorizado(api)).pedir(
      origen = "Maracay, Av. Las Delicias",
      destino = "Terminal de Carga",
      precioUsd = 2.14,
      distanciaKm = 3.0,
      metodoPago = "saldo"
    )

    val (path, cuerpo) = api.llamadas.single()
    assertEquals("/trips", path)
    assertEquals("Maracay, Av. Las Delicias", cuerpo.getString("origen"))
    assertEquals("Terminal de Carga", cuerpo.getString("destino"))
    assertEquals(2.14, cuerpo.getDouble("precio_usd"), 0.0)
    assertEquals(3.0, cuerpo.getDouble("distancia_km"), 0.0)
    assertEquals("saldo", cuerpo.getString("metodo_pago"))
    assertEquals(EstadoViaje.SOLICITADO, viaje.estado)
    assertNull("el viaje recién pedido todavía no tiene piloto", viaje.conductor)
  }

  @Test
  fun `un viaje reanudado arma la pantalla sin coordenadas y con la tasa de hoy`() {
    val viaje = viajeFrom(JSONObject(VIAJE_EN_CURSO).getJSONObject("viaje"))

    val trip = activeTripDe(
      viaje = viaje,
      origen = puntoDeTexto(viaje.origen, "Origen de tu viaje"),
      destino = puntoDeTexto(viaje.destino, "Destino de tu viaje"),
      bcv = 900.0
    )

    assertEquals(viaje.id, trip.viajeId)
    assertEquals(TripStep.TRIP_IN_PROGRESS, trip.currentStep)
    assertEquals(0.75f, trip.progressFraction, 0.0f)
    assertEquals("Pago Móvil", trip.metodoPagoTexto)
    assertEquals(false, trip.origin.tieneCoordenadas)
    assertEquals("sin tasa del viaje se usan los Bs de la tasa que trae la app", 5670.0, trip.precioBs, 0.0)
    assertEquals("Carlos Conductor", trip.driver?.name)
    assertEquals("carro", trip.driver?.tipoVehiculo)
  }

  @Test
  fun `cancelar manda el motivo al servidor`() = runBlocking {
    val api = ApiFalsa(respuestas = mapOf("/trips/a1/cancelar" to JSONObject("""{"ok":true,"viaje_id":"a1","estado":"cancelado"}""")))

    val estado = TripRepository(clienteAutorizado(api)).cancelar("a1", "Cambié de planes")

    assertEquals(EstadoViaje.CANCELADO, estado)
    assertEquals("Cambié de planes", api.llamadas.single().second.getString("motivo"))
  }

  @Test
  fun `el historial se lee en espanol y con la tasa del dia`() {
    val viaje = viajeFrom(JSONObject(VIAJE_FINALIZADO).getJSONObject("viaje"))

    assertEquals("Finalizado", viaje.estadoTexto)
    assertEquals("Efectivo $", viaje.metodoPagoTexto)
    assertEquals(420.5, viaje.tasaBcv!!, 0.0)
    assertEquals("9.0 × la tasa BCV del viaje", 3784.5, viaje.precioBs!!, 0.0)
    assertEquals("Saldo Llégate", viajeFrom(JSONObject(VIAJE_RECIEN).getJSONObject("viaje")).metodoPagoTexto)
  }

  @Test
  fun `un estado que la app no conoce no revienta la pantalla`() {
    assertEquals(EstadoViaje.DESCONOCIDO, estadoViajeDe("reembolsado"))
    for (estado in EstadoViaje.entries) {
      if (estado == EstadoViaje.DESCONOCIDO) continue
      assertEquals(estado, estadoViajeDe(estado.name.lowercase()))
    }
  }

  @Test
  fun `la billetera del piloto separa lo reservado de lo disponible`() {
    val billetera = billeteraFrom(JSONObject(BILLETERA_PILOTO))

    assertEquals("piloto", billetera.tipo)
    assertEquals(20.5, billetera.saldoUsd, 0.0)
    assertEquals(2.0, billetera.reservadoUsd, 0.0)
    assertEquals(18.5, billetera.disponibleUsd, 0.0)
    assertEquals("activo", billetera.estado)
    assertEquals("activo", billetera.conductorEstado)

    assertEquals(0.1, billetera.limites.comisionPorcentaje, 0.0)
    assertEquals(0.1, billetera.limites.comisionMinimaUsd, 0.0)
    assertEquals(1.0, billetera.limites.saldoMinimoUsd, 0.0)
    assertEquals(2.0, billetera.limites.alertaSaldoBajoUsd, 0.0)
    assertEquals(5.0, billetera.limites.recargaMinimaUsd, 0.0)
    assertEquals(50.0, billetera.limites.recargaMaximaUsd, 0.0)
    assertEquals(15, billetera.limites.slaAprobacionMinutos)
    assertEquals(2.0, billetera.limites.bienvenidaUsd, 0.0)
  }

  @Test
  fun `el pasajero sin billetera llena no quiebra por las columnas que faltan`() {
    val billetera = billeteraFrom(
      JSONObject(
        """{"ok":true,"billetera":"pasajero","saldo_billetera":0,"reservado_usd":0,
           "disponible_usd":0,"estado_billetera":"sin_saldo","conductor_estado":null}"""
      )
    )

    assertEquals("pasajero", billetera.tipo)
    assertEquals(0.0, billetera.disponibleUsd, 0.0)
    assertEquals("sin_saldo", billetera.estado)
    assertNull(billetera.conductorEstado)
    assertEquals(0.0, billetera.limites.comisionPorcentaje, 0.0)
  }

  @Test
  fun `los movimientos cuentan la recarga pendiente y la rechazada`() {
    val pendiente = movimientoFrom(
      JSONObject(
        """{"id":"a1","tipo":"recarga","estado":"en_revision","metodo":"pago_movil",
           "monto_usd":"10.00","saldo_resultante":null,"referencia":"0135002345",
           "motivo_rechazo":null,"created_at":"2026-11-03T18:04:00Z"}"""
      )
    )

    assertEquals("recarga", pendiente.tipo)
    assertEquals("en_revision", pendiente.estado)
    assertEquals("pago_movil", pendiente.metodo)
    assertEquals(10.0, pendiente.montoUsd, 0.0)
    assertNull(pendiente.saldoResultante)
    assertEquals("0135002345", pendiente.referencia)
    assertEquals("2026-11-03T18:04:00Z", pendiente.creadoEn)

    val rechazada = movimientoFrom(
      JSONObject(
        """{"id":"a2","tipo":"recarga","estado":"rechazada","metodo":"binance_pay",
           "monto_usd":5,"saldo_resultante":5,"motivo_rechazo":"La referencia no coincide"}"""
      )
    )

    assertEquals("rechazada", rechazada.estado)
    assertEquals(5.0, rechazada.saldoResultante!!, 0.0)
    assertNotNull(rechazada.motivoRechazo)
  }

  @Test
  fun `los movimientos se traducen al español de la billetera`() {
    val pendiente = movimientoFrom(
      JSONObject(
        """{"id":"a1","tipo":"recarga","estado":"en_revision","monto_usd":10,
           "created_at":"2026-11-03T18:04:00Z"}"""
      )
    )
    assertEquals("Recarga", pendiente.etiqueta)
    assertEquals("en revisión", pendiente.estadoTexto)
    assertEquals("03/11/2026", pendiente.fechaTexto)

    val rechazada = movimientoFrom(
      JSONObject(
        """{"id":"a2","tipo":"recarga","estado":"rechazada","monto_usd":5,
           "motivo_rechazo":"La referencia no coincide"}"""
      )
    )
    assertEquals("rechazada: La referencia no coincide", rechazada.estadoTexto)

    val comision = movimientoFrom(
      JSONObject("""{"id":"a3","tipo":"comision","estado":"aprobada","monto_usd":-0.3}""")
    )
    assertEquals("Comisión del viaje", comision.etiqueta)
    assertNull(comision.estadoTexto)
    assertEquals("", comision.fechaTexto)

    val rara = movimientoFrom(
      JSONObject("""{"id":"a4","tipo":"propina","estado":"aprobada","monto_usd":1}""")
    )
    assertEquals("propina", rara.etiqueta)
  }

  private companion object {
    val VIAJE_RECIEN = """
      {"ok":true,"viaje":{"id":"3f2a0000-0000-0000-0000-000000000000",
        "cliente_id":"3f2a0000-0000-0000-0000-000000000000","conductor_id":null,
        "estado":"solicitado","origen":"Maracay, Av. Las Delicias","destino":"Terminal de Carga",
        "distancia_km":3,"precio_usd":2.14,"tasa_bcv":null,"metodo_pago":"saldo",
        "comision_usd":null,"comision_porcentaje":null,"created_at":"2026-11-04T09:12:00Z",
        "aceptado_en":null,"iniciado_en":null,"finalizado_en":null}}
    """

    val VIAJE_FINALIZADO = """
      {"ok":true,"viaje":{"id":"3f2a0000-0000-0000-0000-000000000000",
        "estado":"finalizado","origen":"Av. Las Delicias","destino":"El Limón",
        "distancia_km":10,"precio_usd":9,"tasa_bcv":420.5,"metodo_pago":"efectivo",
        "comision_usd":0.9,"comision_porcentaje":0.1,"aceptado_en":"2026-11-04T09:20:00Z",
        "finalizado_en":"2026-11-04T09:52:00Z"}}
    """

    val VIAJE_EN_CURSO = """
      {"ok":true,"viaje":{"id":"7c9d0000-0000-0000-0000-000000000000",
        "conductor_id":"8b1c0000-0000-0000-0000-000000000000","estado":"en_curso",
        "origen":"Oslo","destino":"Calle Páez","distancia_km":null,
        "precio_usd":"6.30","metodo_pago":"pago_movil","comision_usd":null,
        "created_at":"2026-11-04T09:40:00Z",
        "conductor":{"nombre":"Carlos Conductor","telefono":"+584141111112","placa":"AB123CD",
                     "tipo_vehiculo":"carro","marca":"Toyota","modelo":"Corolla",
                     "verificacion":"aprobado"}}}
    """

    val LISTA_VIAJES = """
      {"ok":true,"viajes":[
        {"id":"7c9d0000-0000-0000-0000-000000000000","estado":"en_curso","origen":"Oslo",
         "destino":"Calle Páez","precio_usd":6.3,"metodo_pago":"pago_movil",
         "conductor_id":"8b1c0000-0000-0000-0000-000000000000","created_at":"2026-11-04T09:40:00Z",
         "conductor":{"nombre":"Carlos Conductor","telefono":"+584141111112","placa":"AB123CD",
                      "tipo_vehiculo":"carro","marca":"Toyota","modelo":"Corolla","verificacion":"aprobado"}},
        {"id":"3f2a0000-0000-0000-0000-000000000000","estado":"cancelado","origen":"Chacao",
         "destino":"Sabana Grande","precio_usd":5,"metodo_pago":"saldo","conductor_id":null,
         "created_at":"2026-11-03T18:00:00Z","conductor":null}
      ]}
    """

    val BILLETERA_PILOTO = """
      {"ok":true,"billetera":"piloto","saldo_billetera":"20.50","reservado_usd":"2.00",
       "disponible_usd":"18.50","estado_billetera":"activo","conductor_estado":"activo",
       "limites":{"comision_porcentaje":0.1,"comision_minima_usd":0.1,"saldo_minimo_usd":1,
                  "alerta_saldo_bajo_usd":2,"recarga_minima_usd":5,"recarga_maxima_usd":50,
                  "sla_aprobacion_minutos":15,"bienvenida_usd":2}}
    """
  }
}
