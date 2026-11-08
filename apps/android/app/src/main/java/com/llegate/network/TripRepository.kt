package com.llegate.network

import com.llegate.model.ActiveTrip
import com.llegate.model.DriverProfile
import com.llegate.model.LocationPoint
import com.llegate.model.TripStep
import com.llegate.util.fechaCorta
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

/** El piloto que tomó el viaje: lo justo para llamarlo y reconocerlo en la calle. */
data class ConductorAsignado(
  val nombre: String,
  val telefono: String?,
  val placa: String?,
  val tipoVehiculo: String?,
  val marca: String?,
  val modelo: String?,
  val verificado: Boolean
)

data class Viaje(
  val id: String,
  val estado: EstadoViaje,
  val origen: String,
  val destino: String,
  val distanciaKm: Double?,
  val precioUsd: Double,
  val tasaBcv: Double?,
  val metodoPago: String,
  val comisionUsd: Double?,
  val conductorId: String?,
  val conductor: ConductorAsignado?,
  val creadoEn: String?
) {
  /** Un viaje sigue vivo mientras no termine ni se cancele: es el que la app debe seguir. */
  val abierto: Boolean
    get() = estado == EstadoViaje.SOLICITADO || estado == EstadoViaje.ACEPTADO || estado == EstadoViaje.EN_CURSO

  val fechaTexto: String
    get() = fechaCorta(creadoEn)

  /** Cómo se lee el estado en pantalla; `DESCONOCIDO` cubre un estado nuevo del servidor. */
  val estadoTexto: String
    get() = when (estado) {
      EstadoViaje.SOLICITADO -> "Buscando piloto"
      EstadoViaje.ACEPTADO -> "El piloto viene en camino"
      EstadoViaje.EN_CURSO -> "En viaje"
      EstadoViaje.FINALIZADO -> "Finalizado"
      EstadoViaje.CANCELADO -> "Cancelado"
      EstadoViaje.DESCONOCIDO -> "Estado pendiente"
    }

  /** `public.metodo_pago` en español; lo que el servidor guarde como binance_pay se ve igual. */
  val metodoPagoTexto: String
    get() = when (metodoPago) {
      "saldo" -> "Saldo Llégate"
      "pago_movil" -> "Pago Móvil"
      "binance_pay" -> "Binance Pay"
      "efectivo" -> "Efectivo $"
      else -> metodoPago
    }

  /** Los Bs solo existen cuando el viaje terminó y el servidor guardó la tasa del día. */
  val precioBs: Double?
    get() = tasaBcv?.let { precioUsd * it }
}

internal fun conductorFrom(json: JSONObject?): ConductorAsignado? = json?.let {
  ConductorAsignado(
    nombre = it.stringOr("nombre"),
    telefono = it.stringOrNull("telefono"),
    placa = it.stringOrNull("placa"),
    tipoVehiculo = it.stringOrNull("tipo_vehiculo"),
    marca = it.stringOrNull("marca"),
    modelo = it.stringOrNull("modelo"),
    verificado = it.stringOrNull("verificacion") == "aprobado"
  )
}

internal fun viajeFrom(json: JSONObject): Viaje = Viaje(
  id = json.stringOr("id"),
  estado = estadoViajeDe(json.stringOrNull("estado")),
  origen = json.stringOr("origen"),
  destino = json.stringOr("destino"),
  distanciaKm = json.doubleOrNull("distancia_km"),
  precioUsd = json.doubleOr("precio_usd"),
  tasaBcv = json.doubleOrNull("tasa_bcv"),
  metodoPago = json.stringOr("metodo_pago", "efectivo"),
  comisionUsd = json.doubleOrNull("comision_usd"),
  conductorId = json.stringOrNull("conductor_id"),
  conductor = conductorFrom(json.optJSONObject("conductor")),
  creadoEn = json.stringOrNull("created_at")
)

/** El piloto asignado, en la forma que usa la pantalla del viaje. */
fun conductorDe(viaje: Viaje): DriverProfile? = viaje.conductor?.let {
  DriverProfile(
    name = it.nombre,
    plate = it.placa,
    vehicleModel = listOfNotNull(it.marca, it.modelo).joinToString(" ").ifBlank { null },
    tipoVehiculo = it.tipoVehiculo,
    phone = it.telefono,
    verified = it.verificado,
    id = viaje.conductorId
  )
}

/** `public.estado_viaje` es el único que mueve la pantalla; un estado nuevo deja el anterior. */
fun pasoDeViaje(estado: EstadoViaje, actual: TripStep): TripStep = when (estado) {
  EstadoViaje.SOLICITADO -> TripStep.SEARCHING_DRIVER
  EstadoViaje.ACEPTADO -> TripStep.DRIVER_EN_ROUTE
  EstadoViaje.EN_CURSO -> TripStep.TRIP_IN_PROGRESS
  EstadoViaje.FINALIZADO -> TripStep.TRIP_COMPLETED
  else -> actual
}

/** La barra dice en qué etapa está el viaje, no cuánto falta: el servidor no da posición. */
fun progresoDePaso(paso: TripStep): Float = when (paso) {
  TripStep.SEARCHING_DRIVER -> 0.15f
  TripStep.DRIVER_EN_ROUTE -> 0.4f
  TripStep.TRIP_IN_PROGRESS -> 0.75f
  TripStep.TRIP_COMPLETED -> 1f
  else -> 0f
}

/**
 * La pantalla del viaje armada desde lo que contestó la API. Al reanudar, origen y
 * destino llegan como texto sin coordenadas (`viajes.origen` no guarda lat/lng), así que
 * el mapa se apaga y los bolívares se calculan con la tasa BCV que traiga la app.
 */
fun activeTripDe(
  viaje: Viaje,
  origen: LocationPoint,
  destino: LocationPoint,
  bcv: Double,
  actual: TripStep = TripStep.SEARCHING_DRIVER
): ActiveTrip {
  val paso = pasoDeViaje(viaje.estado, actual)
  return ActiveTrip(
    viajeId = viaje.id,
    origin = origen,
    destination = destino,
    precioUsd = viaje.precioUsd,
    precioBs = viaje.precioBs ?: viaje.precioUsd * bcv,
    metodoPagoTexto = viaje.metodoPagoTexto,
    driver = conductorDe(viaje),
    currentStep = paso,
    progressFraction = progresoDePaso(paso)
  )
}

/** Punto de ruta que solo existe como texto en la base. */
fun puntoDeTexto(titulo: String, detalle: String): LocationPoint =
  LocationPoint(title = titulo, subtitle = detalle, lat = 0.0, lng = 0.0)

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

  /** Mis viajes como pasajero, del más nuevo al más viejo: historial y viaje abierto. */
  suspend fun listar(): List<Viaje> =
    http.get("/trips").optJSONArray("viajes").listar(::viajeFrom)

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
