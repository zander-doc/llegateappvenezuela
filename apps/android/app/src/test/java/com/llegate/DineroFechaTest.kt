package com.llegate

import com.llegate.util.bs
import com.llegate.util.fechaCorta
import com.llegate.util.usd
import com.llegate.util.usdConSigno
import org.junit.Assert.assertEquals
import org.junit.Test

class DineroFechaTest {

  @Test
  fun `un movimiento se lee con su signo`() {
    assertEquals("+$5.00", usdConSigno(5.0))
    assertEquals("+$0.10", usdConSigno(0.1))
    assertEquals("-$0.30", usdConSigno(-0.3))
    assertEquals("+$0.00", usdConSigno(0.0))
  }

  @Test
  fun `el dolar y el bolivar se escriben con dos decimales`() {
    assertEquals("$2.14", usd(2.14))
    assertEquals("897.05 Bs", bs(897.05))
  }

  @Test
  fun `una fecha ISO se muestra como dia mes anio`() {
    assertEquals("03/11/2026", fechaCorta("2026-11-03T18:04:00Z"))
    assertEquals("03/11/2026", fechaCorta("2026-11-03"))
  }

  @Test
  fun `una fecha que no es ISO se queda vacia`() {
    listOf(null, "", "sin fecha", "2026/11/03", "26-11-03T00:00:00Z").forEach {
      assertEquals(it.orEmpty(), "", fechaCorta(it))
    }
  }
}
