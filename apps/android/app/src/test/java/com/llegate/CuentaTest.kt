package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.model.PaymentMethod
import com.llegate.network.AuthRepository
import com.llegate.network.Session
import com.llegate.viewmodel.LlegateViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class CuentaTest {

  private fun nuevoViewModel(): LlegateViewModel {
    val context = ApplicationProvider.getApplicationContext<Context>()
    return LlegateViewModel(AuthRepository(store = SessionStore(context)))
  }

  @Test
  fun `la hoja de cuenta se abre y se cierra`() {
    val viewModel = nuevoViewModel()

    viewModel.mostrarCuenta(true)
    assertTrue(viewModel.uiState.value.showCuentaModal)

    viewModel.mostrarCuenta(false)
    assertFalse(viewModel.uiState.value.showCuentaModal)
  }

  @Test
  fun `cerrar sesion vacia la cuenta y cierra la hoja`() {
    val viewModel = nuevoViewModel()
    viewModel.mostrarCuenta(true)

    viewModel.cerrarSesion()

    assertNull(viewModel.uiState.value.cuenta)
    assertFalse(viewModel.uiState.value.showCuentaModal)
  }

  @Test
  fun `los metodos de pago son los mismos que ofrece la web`() {
    assertEquals(
      listOf("pago_movil", "efectivo", "saldo"),
      PaymentMethod.entries.map(PaymentMethod::identifier)
    )
  }

  @Test
  fun `la sesion se cifra con una clave segura del dispositivo`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val store = SessionStore(context)
    store.save(
      Session(
        accessToken = "access-de-prueba",
        refreshToken = "refresh-de-prueba",
        expiresAt = System.currentTimeMillis() / 1000 + 3600,
        userId = "3f2a",
        telefono = "+584141234567"
      )
    )

    val preferencias = context.getSharedPreferences("llegate_sesion", Context.MODE_PRIVATE)
    assertFalse(preferencias.getString("access_token", "").orEmpty().contains("access-de-prueba"))
    assertFalse(preferencias.getString("refresh_token", "").orEmpty().contains("refresh-de-prueba"))
    assertEquals("access-de-prueba", SessionStore(context).accessToken())
    assertEquals("refresh-de-prueba", SessionStore(context).refreshToken())

    store.clear()
    assertFalse(store.tieneSesion)
  }
}
