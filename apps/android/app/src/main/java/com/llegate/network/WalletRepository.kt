package com.llegate.network

import com.llegate.util.fechaCorta
import org.json.JSONObject

data class LimitesBilletera(
  val comisionPorcentaje: Double,
  val comisionMinimaUsd: Double,
  val saldoMinimoUsd: Double,
  val alertaSaldoBajoUsd: Double,
  val recargaMinimaUsd: Double,
  val recargaMaximaUsd: Double,
  val slaAprobacionMinutos: Int,
  val bienvenidaUsd: Double
)

data class Billetera(
  val tipo: String,
  val saldoUsd: Double,
  val reservadoUsd: Double,
  val disponibleUsd: Double,
  val estado: String,
  val conductorEstado: String?,
  val limites: LimitesBilletera
)

data class Movimiento(
  val id: String,
  val tipo: String,
  val estado: String,
  val metodo: String?,
  val montoUsd: Double,
  val saldoResultante: Double?,
  val referencia: String?,
  val motivoRechazo: String?,
  val creadoEn: String?
) {
  /** El `tipo_transaccion` en el mismo español que usa el panel de la web. */
  val etiqueta: String
    get() = when (tipo) {
      "recarga" -> "Recarga"
      "bienvenida" -> "Saldo de bienvenida"
      "comision" -> "Comisión del viaje"
      "pago" -> "Viaje pagado con saldo"
      "abono" -> "Abono"
      "devolucion" -> "Devolución"
      "ajuste" -> "Ajuste de Llégate"
      else -> tipo
    }

  /** Una recarga pendiente o rechazada todavía no mueve el saldo: hay que decirlo. */
  val estadoTexto: String?
    get() = when (estado) {
      "aprobada" -> null
      "pendiente", "en_revision" -> "en revisión"
      "rechazada" -> motivoRechazo?.let { "rechazada: $it" } ?: "rechazada"
      else -> estado
    }

  val fechaTexto: String
    get() = fechaCorta(creadoEn)
}

internal fun billeteraFrom(json: JSONObject): Billetera {
  val limites = json.optJSONObject("limites")
  return Billetera(
    tipo = json.stringOr("billetera", "pasajero"),
    saldoUsd = json.doubleOr("saldo_billetera"),
    reservadoUsd = json.doubleOr("reservado_usd"),
    disponibleUsd = json.doubleOr("disponible_usd"),
    estado = json.stringOr("estado_billetera", "sin_saldo"),
    conductorEstado = json.stringOrNull("conductor_estado"),
    limites = LimitesBilletera(
      comisionPorcentaje = limites.doubleOr("comision_porcentaje"),
      comisionMinimaUsd = limites.doubleOr("comision_minima_usd"),
      saldoMinimoUsd = limites.doubleOr("saldo_minimo_usd"),
      alertaSaldoBajoUsd = limites.doubleOr("alerta_saldo_bajo_usd"),
      recargaMinimaUsd = limites.doubleOr("recarga_minima_usd"),
      recargaMaximaUsd = limites.doubleOr("recarga_maxima_usd"),
      slaAprobacionMinutos = limites.intOr("sla_aprobacion_minutos"),
      bienvenidaUsd = limites.doubleOr("bienvenida_usd")
    )
  )
}

internal fun movimientoFrom(json: JSONObject): Movimiento = Movimiento(
  id = json.stringOr("id"),
  tipo = json.stringOr("tipo", "comision"),
  estado = json.stringOr("estado", "pendiente"),
  metodo = json.stringOrNull("metodo"),
  montoUsd = json.doubleOr("monto_usd"),
  saldoResultante = json.doubleOrNull("saldo_resultante"),
  referencia = json.stringOrNull("referencia"),
  motivoRechazo = json.stringOrNull("motivo_rechazo"),
  creadoEn = json.stringOrNull("created_at")
)

class WalletRepository(private val http: AuthorizedClient) {

  /** Saldo, lo reservado por comisiones y los límites vigentes: lo mismo que lee la web. */
  suspend fun billetera(): Billetera = billeteraFrom(http.get("/wallet/billetera"))

  suspend fun movimientos(): List<Movimiento> =
    http.get("/wallet/movimientos").optJSONArray("movimientos").listar(::movimientoFrom)
}
