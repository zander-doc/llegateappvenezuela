package com.llegate.util

/**
 * Las fechas que manda la API vienen como texto ISO (`2026-11-03T18:04:00Z`) y la app
 * no trae desugaring, así que `java.time` no está disponible en API 24. Aquí solo se
 * reordena el día, el mes y el año: la hora se queda en UTC y por eso no se muestra.
 */
fun fechaCorta(valor: String?): String {
  val fecha = valor?.substringBefore("T").orEmpty()
  val partes = fecha.split("-")
  if (partes.size != 3 || partes[0].length != 4) return ""
  return "${partes[2]}/${partes[1]}/${partes[0]}"
}
