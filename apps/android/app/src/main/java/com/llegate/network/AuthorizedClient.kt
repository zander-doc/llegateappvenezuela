package com.llegate.network

import com.llegate.data.SessionStore
import org.json.JSONObject

/**
 * Todas las rutas que piden identidad pasan por aquí: adjunta el token vigente,
 * renueva antes de que venza y reintenta una vez si la API lo rechaza.
 */
class AuthorizedClient(
  private val api: ApiClient,
  private val store: SessionStore
) {

  suspend fun get(path: String): JSONObject = conToken { api.get(path, it) }

  suspend fun post(path: String, body: JSONObject): JSONObject = conToken { api.post(path, body, it) }

  suspend fun delete(path: String): JSONObject = conToken { api.delete(path, it) }

  private suspend fun conToken(llamada: suspend (String) -> JSONObject): JSONObject {
    val token = store.accessTokenVigente() ?: renovar()?.accessToken ?: throw sinSesion()
    return try {
      llamada(token)
    } catch (fallo: ApiException) {
      if (fallo.httpStatus != 401) throw fallo
      val renovada = renovar() ?: throw fallo
      llamada(renovada.accessToken)
    }
  }

  private suspend fun renovar(): Session? = try {
    val refresh = store.refreshToken() ?: return null
    val session = sessionFrom(
      api.post("/auth/refresh", JSONObject().put("refresh_token", refresh))
    )
    store.save(session)
    session
  } catch (e: ApiException) {
    if (e.httpStatus == 401) store.clear()
    null
  }

  private fun sinSesion() =
    ApiException(401, "sin_sesion", "Inicia sesión con tu código para continuar.")
}
