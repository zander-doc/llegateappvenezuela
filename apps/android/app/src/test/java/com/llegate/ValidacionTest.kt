package com.llegate

import com.llegate.util.aE164Venezuela
import com.llegate.util.enmascararTelefono
import com.llegate.util.esNombrePersona
import com.llegate.util.esTelefonoVenezolano
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ValidacionTest {

  @Test
  fun `todo numero venezolano se convierte a E164`() {
    listOf("0414 1234567", "4141234567", "584141234567", "+58 414-123-4567").forEach { entrada ->
      assertEquals("+584141234567", aE164Venezuela(entrada))
      assertTrue(entrada, esTelefonoVenezolano(entrada))
    }
  }

  @Test
  fun `un numero incompleto o de otro pais no pasa`() {
    assertNull(aE164Venezuela("414 123 456"))
    assertFalse(esTelefonoVenezolano("414 123 456"))
    assertNull(aE164Venezuela(""))
  }

  @Test
  fun `el nombre acepta las tildes y la eñe venezolanas`() {
    assertTrue(esNombrePersona("José Ángel Muños"))
    assertFalse(esNombrePersona("J"))
    assertFalse(esNombrePersona("Casa #45"))
  }

  @Test
  fun `el numero se muestra enmascarado`() {
    assertEquals("+58 ••• 4567", enmascararTelefono("+584141234567"))
    assertEquals("••• 4567", enmascararTelefono("04141234567"))
  }
}
