package com.llegate.util

import kotlin.math.abs
import java.util.Locale

fun usd(valor: Double): String = String.format(Locale.US, "$%.2f", valor)

fun bs(valor: Double): String = "${String.format(Locale.US, "%.2f", valor)} Bs"

/** Un movimiento de la billetera se lee con su signo: `+$5.00` entra, `-$0.30` sale. */
fun usdConSigno(valor: Double): String = (if (valor < 0) "-" else "+") + usd(abs(valor))
