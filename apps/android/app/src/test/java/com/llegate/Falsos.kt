package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.network.ApiClient
import com.llegate.network.ApiException
import com.llegate.network.AuthRepository
import com.llegate.network.AuthorizedClient
import com.llegate.network.Session
import com.llegate.viewmodel.LlegateViewModel
import org.json.JSONObject

/** Doble de la API: responde lo que se le programó y anota cada llamada. */
internal class ApiFalsa(
  private val respuestas: Map<String, JSONObject> = emptyMap(),
  private val fallos: Map<String, ApiException> = emptyMap()
) : ApiClient("https://api.de.prueba") {
  val llamadas = mutableListOf<Pair<String, JSONObject>>()
  val tokens = mutableListOf<String?>()

  private fun responder(path: String, body: JSONObject?): JSONObject {
    llamadas.add(path to (body ?: JSONObject()))
    fallos[path]?.let { throw it }
    return respuestas[path]
      ?: throw ApiException(404, "no_programado", "La prueba no programó una respuesta para $path")
  }

  override suspend fun get(path: String, accessToken: String?): JSONObject {
    tokens.add(accessToken)
    return responder(path, null)
  }

  override suspend fun post(path: String, body: JSONObject, accessToken: String?): JSONObject {
    tokens.add(accessToken)
    return responder(path, body)
  }
}

internal fun storeConSesion(): SessionStore {
  val store = SessionStore(ApplicationProvider.getApplicationContext())
  store.save(
    Session(
      accessToken = "access-de-prueba",
      refreshToken = "refresh-de-prueba",
      expiresAt = System.currentTimeMillis() / 1000 + 3600,
      userId = "3f2a",
      telefono = "+584141234567"
    )
  )
  return store
}

internal fun clienteAutorizado(api: ApiClient): AuthorizedClient = AuthorizedClient(api, storeConSesion())

/** Sin sesión: la hoja se arma sin que ninguna prueba toque la API de producción. */
internal fun viewModelSinRed(api: ApiClient = ApiFalsa()): LlegateViewModel {
  val contexto = ApplicationProvider.getApplicationContext<Context>()
  return LlegateViewModel(AuthRepository(api = api, store = SessionStore(contexto)))
}
