package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.network.AuthRepository
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.PasoInicio
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class LoginFlujoTest {

  private fun nuevoViewModel(): LlegateViewModel {
    val context = ApplicationProvider.getApplicationContext<Context>()
    return LlegateViewModel(AuthRepository(store = SessionStore(context)))
  }

  @Test
  fun `empezar sin sesion deja la pantalla de ingreso`() {
    val estado = nuevoViewModel().uiState.value

    assertNull(estado.cuenta)
    assertEquals(PasoInicio.DATOS, estado.pasoInicio)
    assertEquals(false, estado.revisandoSesion)
  }

  @Test
  fun `un numero que no es venezolano no envia codigo`() {
    val viewModel = nuevoViewModel()
    viewModel.onTelefono("414 123 456")

    viewModel.enviarCodigo()

    assertEquals(PasoInicio.DATOS, viewModel.uiState.value.pasoInicio)
    assertEquals("Escribe un número venezolano, por ejemplo 0414 1234567.", viewModel.uiState.value.statusMessage)
  }

  @Test
  fun `los terminos son obligatorios antes de pedir el codigo`() {
    val viewModel = nuevoViewModel()
    viewModel.onTelefono("0414 1234567")

    viewModel.enviarCodigo()

    assertEquals("Debes aceptar los términos para usar Llégate.", viewModel.uiState.value.statusMessage)
  }

  @Test
  fun `el codigo solo acepta seis digitos`() {
    val viewModel = nuevoViewModel()
    viewModel.onCodigo("12a34567")
    assertEquals("123456", viewModel.uiState.value.codigo)

    viewModel.onCodigo("1234")
    viewModel.onTelefono("0414 1234567")

    viewModel.verificarCodigo()

    assertEquals("El código tiene 6 dígitos.", viewModel.uiState.value.statusMessage)
  }
}
