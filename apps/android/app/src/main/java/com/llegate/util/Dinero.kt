package com.llegate.util

import java.util.Locale

fun usd(valor: Double): String = String.format(Locale.US, "$%.2f", valor)
