package com.llegate.network

import org.json.JSONObject

/** Estados de `public.estado_viaje`; `DESCONOCIDO` solo si la API manda algo nuevo. */
enum class EstadoViaje {
  SOLICITADO,
  ACEPTADO,
  EN_CURSO,
  FINALIZADO,
  CANCELADO,
  DESCONOCIDO
}

internal fun estadoViajeDe(valor: String?): EstadoViaje =
  EstadoViaje.entries.firstOrNull { it.name == valor?.uppercase() } ?: EstadoViaje.DESCONOCIDO

data class Viaje(
  val id: String,
  val estado: EstadoViaje,
  val origen: String,
  val destino: String,
  val distanciaKm: Double?,
  val precioUsd: Double,
  val metodoPago: String,
  val comisionUsd: Double?,
  val conductorId: String?
)

internal fun viajeFrom(json: JSONObject): Viaje = Viaje(
  id = json.stringOr("id"),
  estado = estadoViajeDe(json.stringOrNull("estado")),
  origen = json.stringOr("origen"),
  destino = json.stringOr("destino"),
  distanciaKm = json.doubleOrNull("distancia_km"),
  precioUsd = json.doubleOr("precio_usd"),
  metodoPago = json.stringOr("metodo_pago", "efectivo"),
  comisionUsd = json.doubleOrNull("comision_usd"),
  conductorId = json.stringOrNull("conductor_id")
)

class TripRepository(private val http: AuthorizedClient) {

  suspend fun pedir(
    origen: String,
    destino: String,
    precioUsd: Double,
    distanciaKm: Double?,
    metodoPago: String
  ): Viaje = viajeFrom(
    http.post(
      "/trips",
      JSONObject()
        .put("origen", origen)
        .put("destino", destino)
        .put("precio_usd", precioUsd)
        .put("metodo_pago", metodoPago)
        .apply { if (distanciaKm != null) put("distancia_km", distanciaKm) }
    ).getJSONObject("viaje")
  )

  suspend fun consultar(id: String): Viaje =
    viajeFrom(http.get("/trips/$id").getJSONObject("viaje"))

  suspend fun cancelar(id: String, motivo: String? = null): EstadoViaje =
    accion("/trips/$id/cancelar", JSONObject().apply { if (!motivo.isNullOrBlank()) put("motivo", motivo) })

  suspend fun pagarConSaldo(id: String): EstadoViaje =
    accion("/trips/$id/pagar-saldo", JSONObject())

  /** Los RPC de viaje contestan 409 con `motivo`; ahí se traduce a algo que entienda el pana. */
  private suspend fun accion(path: String, body: JSONObject): EstadoViaje = try {
    val json = http.post(path, body)
    estadoViajeDe(json.stringOrNull("estado") ?: json.stringOrNull("estado_viaje"))
  } catch (fallo: ApiException) {
    if (fallo.httpStatus != 409) throw fallo
    throw ApiException(409, fallo.code, mensajeConflicto(fallo.code), fallo.body)
  }

  private fun mensajeConflicto(motivo: String): String = when (motivo) {
    "viaje_no_disponible" -> "Otro pana ya tomó ese viaje."
    "viaje_no_encontrado" -> "Ese viaje ya no está en Llégate."
    "estado_invalido" -> "El viaje cambió mientras tanto. Toca actualizar para ver en qué quedó."
    "viaje_activo" -> "Ya tienes un viaje abierto. Termínalo o cancela antes de pedir otro."
    "saldo_insuficiente" -> "No te alcanza el saldo. Recarga para poder pagar con Llégate."
    "pago_expirado" -> "El pago con saldo se venció. Pide el viaje de nuevo."
    "pago_con_saldo_pendiente" -> "Ese viaje todavía espera el pago con saldo."
    "conductor_no_registrado" -> "Para conducir necesitas subir tus documentos como piloto."
    "conductor_no_verificado" -> "Tu verificación de piloto todavía no está aprobada."
    "conductor_bloqueado" -> "Tu cuenta de piloto está bloqueada. Escríbenos y lo revisamos."
    else -> "No pudimos completar esa acción en el viaje."
  }
}
