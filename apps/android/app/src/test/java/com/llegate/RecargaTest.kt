package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.network.ApiClient
import com.llegate.network.ApiException
import com.llegate.network.AuthRepository
import com.llegate.network.AuthorizedClient
import com.llegate.network.EstadoPago
import com.llegate.network.PagoRepository
import com.llegate.network.Session
import com.llegate.network.pagoFrom
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.PasoRecarga
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class RecargaTest {

  /** Doble de la API: responde lo que se le programó y anota cada llamada. */
  private class ApiFalsa(
    private val respuestas: Map<String, JSONObject> = emptyMap(),
    private val fallos: Map<String, ApiException> = emptyMap()
  ) : ApiClient("https://api.de.prueba") {
    val llamadas = mutableListOf<Pair<String, JSONObject>>()
    val tokens = mutableListOf<String?>()

    private fun responder(path: String, body: JSONObject?): JSONObject {
        llamadas.add(path to (body ?: JSONObject()))
        fallos[path]?.let { throw it }
        return respuestas[path]
          ?: throw ApiException(404, "no_programado", "La prueba no programó una respuesta para $path")
    }

    override suspend fun get(path: String, accessToken: String?): JSONObject {
        tokens.add(accessToken)
        return responder(path, null)
    }

    override suspend fun post(path: String, body: JSONObject, accessToken: String?): JSONObject {
        tokens.add(accessToken)
        return responder(path, body)
    }
  }

  private fun storeConSesion(): SessionStore {
    val store = SessionStore(ApplicationProvider.getApplicationContext())
    store.save(
      Session(
        accessToken = "access-de-prueba",
        refreshToken = "refresh-de-prueba",
        expiresAt = System.currentTimeMillis() / 1000 + 3600,
        userId = "3f2a",
        telefono = "+584141234567"
      )
    )
    return store
  }

  /** Sin sesión: la hoja se arma sin que ninguna prueba toque la API de producción. */
  private fun viewModelSinRed(api: ApiClient = ApiFalsa()): LlegateViewModel {
    val contexto = ApplicationProvider.getApplicationContext<Context>()
    return LlegateViewModel(AuthRepository(api = api, store = SessionStore(contexto)))
  }

  private fun clienteAutorizado(api: ApiClient): AuthorizedClient = AuthorizedClient(api, storeConSesion())

  @Test
  fun `la intencion de Pago Movil trae los datos del comercio`() {
    val pago = pagoFrom(JSONObject(INTENTO_PAGO_MOVIL).getJSONObject("pago"))

    assertEquals(EstadoPago.PENDIENTE, pago.estado)
    assertEquals("LLG-1A2B3C", pago.codigo)
    assertEquals("pago_movil", pago.metodo)
    assertEquals(10.0, pago.montoUsd, 0.0)
    assertEquals(8892.60, pago.montoBs!!, 0.0)
    assertEquals(889.26, pago.tasaBs!!, 0.0)
    assertNull("sin checkout hasta que exista un proveedor", pago.checkoutUrl)
    assertEquals("Banesco", pago.instrucciones.banco)
    assertEquals("04141234567", pago.instrucciones.telefono)
    assertEquals("12345678", pago.instrucciones.cedula)
    assertEquals("Llégate Servicios C.A.", pago.instrucciones.titular)
    assertEquals("2026-11-04T10:32:00Z", pago.expiraEn)
  }

  @Test
  fun `binance pay llega con su checkout y sin tasa de bolivares`() {
    val pago = pagoFrom(JSONObject(INTENTO_BINANCE).getJSONObject("pago"))

    assertEquals("binance_pay", pago.metodo)
    assertEquals(20.0, pago.montoUsd, 0.0)
    assertNull(pago.montoBs)
    assertNull(pago.tasaBs)
    assertEquals("https://pay.binance.com/checkout/abc", pago.checkoutUrl)
  }

  @Test
  fun `los metodos dicen cuales hay ahora mismo`() {
    val metodos = runBlocking { PagoRepository(clienteAutorizado(ApiFalsa(respuestas = mapOf("/payments/metodos" to JSONObject(METODOS))))).metodos() }

    assertEquals(listOf("pago_movil", "binance_pay"), metodos.map { it.id })
    assertTrue(metodos.first().disponible)
    assertEquals("manual", metodos.first().revision)
    assertEquals(false, metodos[1].disponible)
    assertEquals("automatica", metodos[1].revision)
  }

  @Test
  fun `crear el intento manda el metodo y el monto que eligio el pana`() {
    val api = ApiFalsa(respuestas = mapOf("/payments/intents" to JSONObject(INTENTO_PAGO_MOVIL)))
    val pago = runBlocking { PagoRepository(clienteAutorizado(api)).crearIntento("pago_movil", 10.0) }

    assertEquals(10.0, pago.montoUsd, 0.0)
    assertEquals("/payments/intents", api.llamadas.single().first)
    assertEquals("pago_movil", api.llamadas.single().second.getString("metodo"))
    assertEquals(10.0, api.llamadas.single().second.getDouble("monto_usd"), 0.0)
    assertEquals("access-de-prueba", api.tokens.single())
  }

  @Test
  fun `reportar la referencia deja el pago en revision`() {
    val reporte = JSONObject("""{"ok":true,"ya_reportado":false,"pago_id":"p1","estado":"en_revision","referencia":"0135002345"}""")
    val api = ApiFalsa(respuestas = mapOf("/payments/p1/report" to reporte))
    val estado = runBlocking { PagoRepository(clienteAutorizado(api)).reportar("p1", " 0135002345 ") }

    assertEquals(EstadoPago.EN_REVISION, estado)
    assertEquals("0135002345", api.llamadas.single().second.getString("referencia"))
  }

  @Test
  fun `una respuesta 200 con ok false no se devuelve como exito`() {
    val api = ApiFalsa(
      respuestas = mapOf("/payments/p1/report" to JSONObject("""{"ok":false,"motivo":"pago_expirado","estado":"expirado"}"""))
    )

    val fallo = assertThrows(ApiException::class.java) {
      runBlocking { PagoRepository(clienteAutorizado(api)).reportar("p1", "0135002345") }
    }

    assertEquals("pago_expirado", fallo.code)
    assertEquals("Se venció el tiempo de este pago. Pide la recarga de nuevo.", fallo.message)
  }

  @Test
  fun `las claves de las RPC se traducen a espanol`() {
    val casos = listOf(
      ApiException(409, "23505", "REFERENCIA_DUPLICADA") to
        "Esa referencia ya la reportaste en otra recarga. Escribe la de este pago.",
      ApiException(400, "P0001", "MONTO_FUERA_DE_RANGO: la recarga del piloto va de 5.00 a 50.00 USD") to
        "La recarga del piloto va de 5 a 50 dólares.",
      ApiException(400, "P0001", "REFERENCIA_INVALIDA") to
        "La referencia del Pago Móvil son 6 a 12 dígitos, sin letras ni espacios.",
      ApiException(404, "P0002", "PAGO_NO_ENCONTRADO") to
        "No encontramos ese pago. Actualiza para ver cómo va tu recarga."
    )

    for ((fallo, esperado) in casos) {
      val api = ApiFalsa(fallos = mapOf("/payments/p1/cancel" to fallo))
      val traducido = assertThrows(ApiException::class.java) {
        runBlocking { PagoRepository(clienteAutorizado(api)).cancelar("p1") }
      }
      assertEquals(esperado, traducido.message)
    }
  }

  @Test
  fun `un error que la app no conoce se deja pasar`() {
    val original = ApiException(503, "binance_no_configurado", "Binance Pay no está disponible en este momento. Prueba con Pago Móvil.")
    val api = ApiFalsa(fallos = mapOf("/payments/intents" to original))

    val fallo = assertThrows(ApiException::class.java) {
      runBlocking { PagoRepository(clienteAutorizado(api)).crearIntento("binance_pay", 20.0) }
    }

    assertEquals(original.message, fallo.message)
  }

  @Test
  fun `la hoja de recarga entra y devuelve a la de cuenta`() {
    val viewModel = viewModelSinRed()

    viewModel.mostrarRecarga(true)
    assertTrue(viewModel.uiState.value.showRecargaModal)
    assertEquals(PasoRecarga.MONTO, viewModel.uiState.value.pasoRecarga)

    viewModel.mostrarRecarga(false)
    assertEquals(PasoRecarga.MONTO, viewModel.uiState.value.pasoRecarga)
  }

  @Test
  fun `la referencia solo acepta digitos y hasta doce`() {
    val viewModel = viewModelSinRed()

    viewModel.onRecargaReferencia("0135 002-34567")
    assertEquals("013500234567", viewModel.uiState.value.recargaReferencia)

    viewModel.onRecargaReferencia("1234567890123456")
    assertEquals(12, viewModel.uiState.value.recargaReferencia.length)
  }

  @Test
  fun `los pasos de la recarga se recorren en orden`() {
    val viewModel = viewModelSinRed()

    viewModel.seleccionarMontoRecarga(20.0)
    viewModel.seleccionarMetodoRecarga("binance_pay")
    viewModel.irAReportarRecarga()

    assertEquals(20.0, viewModel.uiState.value.recargaMontoUsd, 0.0)
    assertEquals("binance_pay", viewModel.uiState.value.recargaMetodo)
    assertEquals(PasoRecarga.REPORTAR, viewModel.uiState.value.pasoRecarga)

    viewModel.volverALosDatosDeRecarga()
    assertEquals(PasoRecarga.INSTRUCCIONES, viewModel.uiState.value.pasoRecarga)
  }

  @Test
  fun `confirmar sin pago ni referencia no manda nada`() {
    val api = ApiFalsa()
    val viewModel = viewModelSinRed(api)

    viewModel.confirmarRecarga()

    assertTrue(api.llamadas.isEmpty())
    assertNull(viewModel.uiState.value.pagoEnCurso)
  }

  @Test
  fun `cerrar sesion limpia el saldo y la hoja abierta`() {
    val viewModel = viewModelSinRed()
    viewModel.mostrarRecarga(true)

    viewModel.cerrarSesion()

    assertEquals(false, viewModel.uiState.value.showRecargaModal)
    assertEquals(false, viewModel.uiState.value.showCuentaModal)
    assertNull(viewModel.uiState.value.billetera)
  }

  private companion object {
    val INTENTO_PAGO_MOVIL = """
      {"ok":true,"pago":{"id":"p1","codigo":"LLG-1A2B3C","metodo":"pago_movil","proveedor":"manual",
        "estado":"pendiente","monto_usd":10,"monto_bs":8892.6,"tasa_bs":889.26,"checkout_url":null,
        "instrucciones":{"tipo":"pago_movil","banco":"Banesco","telefono":"04141234567",
          "cedula":"12345678","titular":"Llégate Servicios C.A.","monto_bs":8892.6,"tasa_bs":889.26,
          "nota":"Paga el monto exacto en bolívares y reporta la referencia que te da tu banco."},
        "expira_en":"2026-11-04T10:32:00Z","billetera":"pasajero"}}
    """

    val INTENTO_BINANCE = """
      {"ok":true,"pago":{"id":"p2","codigo":"LLG-9F8E7D","metodo":"binance_pay","proveedor":"binance_pay",
        "estado":"pendiente","monto_usd":20,"monto_bs":null,"tasa_bs":null,
        "checkout_url":"https://pay.binance.com/checkout/abc",
        "instrucciones":{"tipo":"binance_pay"},"expira_en":"2026-11-04T10:45:00Z","billetera":"piloto"}}
    """

    val METODOS = """
      {"ok":true,"metodos":[
        {"id":"pago_movil","disponible":true,"revision":"manual"},
        {"id":"binance_pay","disponible":false,"revision":"automatica"}]}
    """
  }
}
