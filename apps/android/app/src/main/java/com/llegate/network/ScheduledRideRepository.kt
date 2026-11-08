package com.llegate.network

import com.llegate.model.LocationPoint
import org.json.JSONObject

enum class EstadoViajeProgramado {
  PROGRAMADO,
  CANCELADO,
  DESCONOCIDO
}

internal fun estadoViajeProgramadoDe(valor: String?): EstadoViajeProgramado =
  EstadoViajeProgramado.entries.firstOrNull { it.name == valor?.uppercase() }
    ?: EstadoViajeProgramado.DESCONOCIDO

data class ViajeProgramado(
  val id: String,
  val estado: EstadoViajeProgramado,
  val origen: String,
  val destino: String,
  val origenLat: Double?,
  val origenLng: Double?,
  val destinoLat: Double?,
  val destinoLng: Double?,
  val servicio: String,
  val programadoPara: String?,
  val distanciaKm: Double?,
  val precioUsd: Double,
  val metodoPago: String,
  val canceladoEn: String?,
  val creadoEn: String?
)

internal fun viajeProgramadoFrom(json: JSONObject): ViajeProgramado = ViajeProgramado(
  id = json.stringOr("id"),
  estado = estadoViajeProgramadoDe(json.stringOrNull("estado")),
  origen = json.stringOr("origen"),
  destino = json.stringOr("destino"),
  origenLat = json.doubleOrNull("origen_lat"),
  origenLng = json.doubleOrNull("origen_lng"),
  destinoLat = json.doubleOrNull("destino_lat"),
  destinoLng = json.doubleOrNull("destino_lng"),
  servicio = json.stringOr("servicio"),
  programadoPara = json.stringOrNull("programado_para"),
  distanciaKm = json.doubleOrNull("distancia_km"),
  precioUsd = json.doubleOr("precio_usd"),
  metodoPago = json.stringOr("metodo_pago", "efectivo"),
  canceladoEn = json.stringOrNull("cancelado_en"),
  creadoEn = json.stringOrNull("created_at")
)

/** Solicitudes futuras persistidas por la API; no se convierten en viajes inmediatos automáticamente. */
class ScheduledRideRepository(private val http: AuthorizedClient) {

  suspend fun crear(
    origen: LocationPoint,
    destino: LocationPoint,
    servicio: String,
    programadoPara: String,
    precioUsd: Double,
    distanciaKm: Double?,
    metodoPago: String
  ): ViajeProgramado {
    val body = JSONObject()
      .put("origen", origen.title)
      .put("destino", destino.title)
      .put("servicio", servicio)
      .put("programado_para", programadoPara)
      .put("precio_usd", precioUsd)
      .put("metodo_pago", metodoPago)
      .apply {
        if (distanciaKm != null) put("distancia_km", distanciaKm)
        if (origen.tieneCoordenadas) {
          put("origen_lat", origen.lat)
          put("origen_lng", origen.lng)
        }
        if (destino.tieneCoordenadas) {
          put("destino_lat", destino.lat)
          put("destino_lng", destino.lng)
        }
      }

    return viajeProgramadoFrom(
      http.post("/scheduled-rides", body).getJSONObject("viaje_programado")
    )
  }

  suspend fun listar(): List<ViajeProgramado> =
    http.get("/scheduled-rides").optJSONArray("viajes_programados").listar(::viajeProgramadoFrom)

  suspend fun consultar(id: String): ViajeProgramado =
    viajeProgramadoFrom(
      http.get("/scheduled-rides/$id").getJSONObject("viaje_programado")
    )

  suspend fun cancelar(id: String): ViajeProgramado =
    viajeProgramadoFrom(
      http.post("/scheduled-rides/$id/cancel", JSONObject()).getJSONObject("viaje_programado")
    )
}
