package com.llegate.network

import org.json.JSONArray
import org.json.JSONObject

data class Servicio(
  val slug: String,
  val name: String,
  val short: String,
  val tagline: String,
  val description: String,
  val icon: String,
  val minFareUsd: Double,
  val perKmUsd: Double,
  val capacity: String,
  val eta: String,
  val estaEnLanzamiento: Boolean,
  val fase: String?
)

data class ReglasTarifa(
  val model: String,
  val perMinuteUsd: Double,
  val roundTripDoublesDistance: Boolean,
  val minFareChargedOnce: Boolean,
  val currency: String
)

data class ReglasBilletera(
  val commissionRate: Double,
  val minCommissionUsd: Double,
  val minBalanceUsd: Double,
  val lowBalanceUsd: Double,
  val welcomeUsd: Double,
  val minRechargeUsd: Double,
  val maxRechargeUsd: Double,
  val approvalSlaMinutes: Int
)

data class PaqueteRecarga(val amountUsd: Double, val name: String, val note: String, val recomendado: Boolean)

data class ConfigApp(
  val version: Int,
  val services: List<Servicio>,
  val fareRules: ReglasTarifa,
  val walletRules: ReglasBilletera,
  val rechargePacks: List<PaqueteRecarga>
) {
  fun service(slug: String): Servicio? = services.firstOrNull { it.slug == slug }
}

internal fun configFrom(json: JSONObject): ConfigApp {
  val tarifas = json.optJSONObject("fareRules")
  val billetera = json.optJSONObject("walletRules")
  return ConfigApp(
    version = json.intOr("version"),
    services = json.optJSONArray("services").listar(::servicioFrom),
    fareRules = ReglasTarifa(
      model = tarifas.stringOr("model", "min_fare_plus_km"),
      perMinuteUsd = tarifas.doubleOr("perMinuteUSD"),
      roundTripDoublesDistance = tarifas.boolOr("roundTripDoublesDistance"),
      minFareChargedOnce = tarifas.boolOr("minFareChargedOnce"),
      currency = tarifas.stringOr("currency", "USD")
    ),
    walletRules = ReglasBilletera(
      commissionRate = billetera.doubleOr("commissionRate"),
      minCommissionUsd = billetera.doubleOr("minCommissionUSD"),
      minBalanceUsd = billetera.doubleOr("minBalanceUSD"),
      lowBalanceUsd = billetera.doubleOr("lowBalanceUSD"),
      welcomeUsd = billetera.doubleOr("welcomeUSD"),
      minRechargeUsd = billetera.doubleOr("minRechargeUSD"),
      maxRechargeUsd = billetera.doubleOr("maxRechargeUSD"),
      approvalSlaMinutes = billetera.intOr("approvalSlaMinutes")
    ),
    rechargePacks = json.optJSONArray("rechargePacks").listar { paquete ->
      PaqueteRecarga(
        amountUsd = paquete.doubleOr("amount"),
        name = paquete.optString("name"),
        note = paquete.optString("note"),
        recomendado = paquete.boolOr("recommended")
      )
    }
  )
}

private fun servicioFrom(json: JSONObject): Servicio = Servicio(
  slug = json.optString("slug"),
  name = json.optString("name"),
  short = json.optString("short"),
  tagline = json.optString("tagline"),
  description = json.optString("description"),
  icon = json.optString("icon"),
  minFareUsd = json.doubleOr("minFareUSD"),
  perKmUsd = json.doubleOr("perKmUSD"),
  capacity = json.optString("capacity"),
  eta = json.optString("eta"),
  estaEnLanzamiento = json.optString("status") == "launch",
  fase = json.stringOrNull("phase")
)

private inline fun <T> JSONArray?.listar(transformar: (JSONObject) -> T): List<T> =
  if (this == null) emptyList() else List(length()) { transformar(getJSONObject(it)) }

class ConfigRepository(private val api: ApiClient = ApiClient()) {
  /** `/config/app` es la única fuente de precios y reglas: la app no los trae fijados. */
  suspend fun cargar(): ConfigApp = configFrom(api.get("/config/app"))
}
