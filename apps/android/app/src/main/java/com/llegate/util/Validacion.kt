package com.llegate.util

private val TELEFONO_VZLA = Regex("^(0\\d{10}|58\\d{10}|\\d{10})$")
private val NOMBRE_PERSONA = Regex("^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{3,}$")

fun digitos(valor: String): String = valor.filter { it.isDigit() }

fun esTelefonoVenezolano(valor: String): Boolean = TELEFONO_VZLA.matches(digitos(valor))

/** Acepta 0414 1234567, 4141234567, 584141234567 o +584141234567 y devuelve E.164. */
fun aE164Venezuela(valor: String): String? {
  val limpio = digitos(valor)
  return when {
    limpio.length == 12 && limpio.startsWith("58") -> "+$limpio"
    limpio.length == 11 && limpio.startsWith("0") -> "+58${limpio.substring(1)}"
    limpio.length == 10 -> "+58$limpio"
    else -> null
  }
}

fun esNombrePersona(valor: String): Boolean = NOMBRE_PERSONA.matches(valor.trim())

fun enmascararTelefono(valor: String?): String {
  val limpio = digitos(valor.orEmpty())
  if (limpio.length < 6) return valor.orEmpty()
  val prefijo = if (valor?.trim()?.startsWith("+") == true) "+${limpio.take(2)} " else ""
  return "$prefijo••• ${limpio.takeLast(4)}"
}
