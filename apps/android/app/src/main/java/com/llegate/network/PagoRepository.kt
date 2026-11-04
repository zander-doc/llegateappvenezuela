package com.llegate.network

import org.json.JSONObject

/** Estados de `public.estado_pago`; `DESCONOCIDO` solo si la API manda algo nuevo. */
enum class EstadoPago {
  PENDIENTE,
  EN_REVISION,
  CONFIRMADO,
  RECHAZADO,
  EXPIRADO,
  CANCELADO,
  DESCONOCIDO
}

internal fun estadoPagoDe(valor: String?): EstadoPago =
  EstadoPago.entries.firstOrNull { it.name == valor?.uppercase() } ?: EstadoPago.DESCONOCIDO

/** Un método de `/payments/metodos`; `disponible` dice si la API tiene las claves del banco. */
data class MetodoPagoDisponible(val id: String, val disponible: Boolean, val revision: String)

/** Los datos del comercio que la API arma para Pago Móvil; la app solo los muestra. */
data class InstruccionesPago(
  val banco: String?,
  val telefono: String?,
  val cedula: String?,
  val titular: String?,
  val montoBs: Double?,
  val tasaBs: Double?,
  val nota: String?
)

data class Pago(
  val id: String,
  val codigo: String,
  val metodo: String,
  val estado: EstadoPago,
  val montoUsd: Double,
  val montoBs: Double?,
  val tasaBs: Double?,
  val checkoutUrl: String?,
  val instrucciones: InstruccionesPago,
  val referenciaReportada: String?,
  val expiraEn: String?,
  val motivoRechazo: String?
)

internal fun instruccionesFrom(json: JSONObject?): InstruccionesPago = InstruccionesPago(
  banco = json.stringOrNull("banco"),
  telefono = json.stringOrNull("telefono"),
  cedula = json.stringOrNull("cedula"),
  titular = json.stringOrNull("titular"),
  montoBs = json.doubleOrNull("monto_bs"),
  tasaBs = json.doubleOrNull("tasa_bs"),
  nota = json.stringOrNull("nota")
)

internal fun pagoFrom(json: JSONObject): Pago = Pago(
  id = json.stringOr("id"),
  codigo = json.stringOr("codigo"),
  metodo = json.stringOr("metodo", "pago_movil"),
  estado = estadoPagoDe(json.stringOrNull("estado")),
  montoUsd = json.doubleOr("monto_usd"),
  montoBs = json.doubleOrNull("monto_bs"),
  tasaBs = json.doubleOrNull("tasa_bs"),
  checkoutUrl = json.stringOrNull("checkout_url"),
  instrucciones = instruccionesFrom(json.optJSONObject("instrucciones")),
  referenciaReportada = json.stringOrNull("referencia_reportada"),
  expiraEn = json.stringOrNull("expira_en"),
  motivoRechazo = json.stringOrNull("motivo_rechazo")
)

/**
 * Recargas con el mismo flujo que la web: se crea la intención, el pana paga en su
 * banco y reporta la referencia; un admin confirma y el saldo aparece en la billetera.
 */
class PagoRepository(private val http: AuthorizedClient) {

  suspend fun metodos(): List<MetodoPagoDisponible> =
    http.get("/payments/metodos").optJSONArray("metodos").listar { metodo ->
      MetodoPagoDisponible(
        id = metodo.stringOr("id"),
        disponible = metodo.boolOr("disponible"),
        revision = metodo.stringOr("revision", "manual")
      )
    }

  suspend fun listar(): List<Pago> =
    http.get("/payments").optJSONArray("pagos").listar(::pagoFrom)

  suspend fun crearIntento(metodo: String, montoUsd: Double): Pago = try {
    pagoFrom(
      http.post(
        "/payments/intents",
        JSONObject().put("metodo", metodo).put("monto_usd", montoUsd)
      ).getJSONObject("pago")
    )
  } catch (fallo: ApiException) {
    throw traducir(fallo)
  }

  /** Devuelve el estado final de la intención después de reportar la referencia. */
  suspend fun reportar(id: String, referencia: String): EstadoPago = try {
    val json = http.post(
      "/payments/$id/report",
      JSONObject().put("referencia", referencia.trim())
    )
    val estado = estadoPagoDe(json.stringOrNull("estado"))
    if (json.boolOr("ok")) estado
    else throw ApiException(409, json.stringOr("motivo", "pago_no_reportable"), mensajePago(json.stringOr("motivo"), json.optString("estado")), json)
  } catch (fallo: ApiException) {
    throw traducir(fallo)
  }

  suspend fun cancelar(id: String): EstadoPago = try {
    estadoPagoDe(http.post("/payments/$id/cancel", JSONObject()).stringOrNull("estado"))
  } catch (fallo: ApiException) {
    throw traducir(fallo)
  }

  /**
   * Las RPC de pago fallan con `raise exception`, y el handler de la API devuelve el
   * nombre en clave de la restricción (`REFERENCIA_DUPLICADA`, `MONTO_FUERA_DE_RANGO`).
   * Eso no se le muestra a nadie: se traduce o se pide repetir.
   */
  private fun traducir(fallo: ApiException): ApiException {
    if (fallo.httpStatus == 0) return fallo
    val clave = "${fallo.code} ${fallo.message}".uppercase()
    val mensaje = when {
      "REFERENCIA_DUPLICADA" in clave ->
        "Esa referencia ya la reportaste en otra recarga. Escribe la de este pago."
      "MONTO_FUERA_DE_RANGO" in clave ->
        "La recarga del piloto va de 5 a 50 dólares."
      "REFERENCIA_INVALIDA" in clave ->
        "La referencia del Pago Móvil son 6 a 12 dígitos, sin letras ni espacios."
      "PAGO_NO_ENCONTRADO" in clave ->
        "No encontramos ese pago. Actualiza para ver cómo va tu recarga."
      "PAGO_NO_REPORTABLE" in clave || "PAGO_NO_CANCELABLE" in clave ->
        "Ese pago ya no admite cambios."
      else -> return fallo
    }
    return ApiException(fallo.httpStatus, fallo.code, mensaje, fallo.body)
  }

  private fun mensajePago(motivo: String?, estado: String?): String = when (motivo) {
    "pago_expirado" -> "Se venció el tiempo de este pago. Pide la recarga de nuevo."
    else -> "No pudimos registrar la referencia (el pago quedó en $estado)."
  }
}
