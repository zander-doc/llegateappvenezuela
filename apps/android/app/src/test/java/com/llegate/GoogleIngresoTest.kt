package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.network.AuthRepository
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class GoogleIngresoTest {

  private fun repo(api: ApiFalsa) =
    AuthRepository(api = api, store = SessionStore(ApplicationProvider.getApplicationContext<Context>()))

  @Test
  fun `el ID de cliente viene de la API y es null si Google esta apagado`() = runBlocking {
    val activo = ApiFalsa(
      respuestas = mapOf("/auth/google/config" to JSONObject("""{"ok":true,"disponible":true,"client_id":"web-123"}"""))
    )
    assertEquals("web-123", repo(activo).googleClientId())

    val apagado = ApiFalsa(
      respuestas = mapOf("/auth/google/config" to JSONObject("""{"ok":true,"disponible":false,"client_id":null}"""))
    )
    assertNull(repo(apagado).googleClientId())
  }

  @Test
  fun `ingresar con Google manda el token y guarda la sesion`() = runBlocking {
    val api = ApiFalsa(
      respuestas = mapOf(
        "/auth/google" to JSONObject(
          """{"ok":true,"access_token":"a1","refresh_token":"r1","expires_at":4102444800,
             "usuario":{"id":"u1","telefono":"+584141234567"}}"""
        )
      )
    )
    val repositorio = repo(api)

    val sesion = repositorio.ingresarConGoogle("id-token-google")

    assertEquals("a1", sesion.accessToken)
    assertEquals("id-token-google", api.llamadas.single().second.getString("credential"))
    assertTrue(repositorio.tieneSesion)
  }
}
