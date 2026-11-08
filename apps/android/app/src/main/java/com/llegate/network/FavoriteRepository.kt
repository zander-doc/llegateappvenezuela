package com.llegate.network

import com.llegate.model.LocationPoint
import org.json.JSONObject

data class FavoriteAddress(
  val id: String,
  val label: String,
  val address: String,
  val lat: Double,
  val lng: Double
) {
  fun asLocationPoint() = LocationPoint(address, label, lat, lng)
}

data class FavoriteDriver(
  val id: String,
  val name: String,
  val vehicleType: String?,
  val plate: String?,
  val vehicle: String?
)

data class ReferralSummary(
  val code: String,
  val invitedCount: Int,
  val rewardedCount: Int,
  val accruedUsd: Double,
  val walletUsd: Double
)

class FavoriteRepository(private val http: AuthorizedClient) {

  suspend fun addresses(): List<FavoriteAddress> =
    http.get("/api/favoritos/direcciones").optJSONArray("direcciones").listar { json ->
      FavoriteAddress(
        id = json.stringOr("id"),
        label = json.stringOr("etiqueta"),
        address = json.stringOr("direccion_texto"),
        lat = json.doubleOr("lat"),
        lng = json.doubleOr("lng")
      )
    }

  suspend fun saveAddress(label: String, point: LocationPoint): FavoriteAddress {
    val json = http.post(
      "/api/favoritos/direcciones",
      JSONObject()
        .put("etiqueta", label)
        .put(
          "direccion_texto",
          listOf(point.title, point.subtitle).filter { it.isNotBlank() }.distinct().joinToString(" • ")
        )
        .put("lat", point.lat)
        .put("lng", point.lng)
    ).getJSONObject("direccion")
    return FavoriteAddress(
      id = json.stringOr("id"),
      label = json.stringOr("etiqueta"),
      address = json.stringOr("direccion_texto"),
      lat = json.doubleOr("lat"),
      lng = json.doubleOr("lng")
    )
  }

  suspend fun deleteAddress(id: String) {
    http.delete("/api/favoritos/direcciones/$id")
  }

  suspend fun drivers(): List<FavoriteDriver> =
    http.get("/api/favoritos/conductores").optJSONArray("conductores").listar { json ->
      FavoriteDriver(
        id = json.stringOr("conductor_id"),
        name = json.stringOr("nombre", "Piloto Llégate"),
        vehicleType = json.stringOrNull("tipo_vehiculo"),
        plate = json.stringOrNull("placa"),
        vehicle = listOfNotNull(json.stringOrNull("marca"), json.stringOrNull("modelo"))
          .joinToString(" ")
          .ifBlank { null }
      )
    }

  suspend fun addDriver(id: String) {
    http.post("/api/favoritos/conductores", JSONObject().put("conductor_id", id))
  }

  suspend fun deleteDriver(id: String) {
    http.delete("/api/favoritos/conductores/$id")
  }

  suspend fun referralSummary(): ReferralSummary {
    val resumen = http.get("/api/referidos").getJSONObject("resumen")
    return ReferralSummary(
      code = resumen.stringOr("codigo_referido"),
      invitedCount = resumen.intOr("invitados"),
      rewardedCount = resumen.intOr("invitados_bonificados"),
      accruedUsd = resumen.doubleOr("bono_acumulado_usd"),
      walletUsd = resumen.doubleOr("saldo_billetera")
    )
  }

  suspend fun applyReferral(code: String): String {
    val result = http.post(
      "/api/referidos/aplicar",
      JSONObject().put("codigo_referido", code.trim().uppercase())
    )
    return result.stringOr("estado")
  }
}
