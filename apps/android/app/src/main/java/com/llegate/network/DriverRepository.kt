package com.llegate.network

import org.json.JSONObject

class DriverRepository(private val http: AuthorizedClient) {
  suspend fun registrarPerfil(datos: Map<String, String>) {
    val tipoVehiculo = when (datos["role"]) {
      "driver_moto" -> "moto"
      "driver_car", "delivery" -> "carro"
      else -> throw IllegalArgumentException("El rol seleccionado no es válido para un registro de socio.")
    }

    val body = JSONObject()
      .put("cedula", datos.getValue("cedula"))
      .put("tipo_vehiculo", tipoVehiculo)
      .put("placa", datos.getValue("plate"))

    datos["brand"]?.takeIf(String::isNotBlank)?.let { body.put("marca", it) }
    datos["model"]?.takeIf(String::isNotBlank)?.let { body.put("modelo", it) }
    datos["color"]?.takeIf(String::isNotBlank)?.let { body.put("color", it) }

    http.post("/drivers/me", body)
  }
}
