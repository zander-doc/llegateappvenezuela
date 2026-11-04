package com.llegate.network

import com.llegate.data.SessionStore
import org.json.JSONObject

data class Session(
  val accessToken: String,
  val refreshToken: String,
  val expiresAt: Long,
  val userId: String,
  val telefono: String
)

data class Conductor(
  val tipoVehiculo: String?,
  val placa: String?,
  val verificacion: String?,
  val estado: String?,
  val motivoRechazo: String?
) {
  val aprobado: Boolean get() = verificacion == "aprobado"
}

data class Usuario(
  val id: String,
  val rol: String,
  val nombre: String?,
  val telefono: String,
  val saldoBilletera: Double,
  val conductor: Conductor?,
  val puedePedirViajes: Boolean,
  val puedeConducir: Boolean
)

internal fun sessionFrom(json: JSONObject): Session {
  val usuario = json.optJSONObject("usuario")
  return Session(
    accessToken = json.optString("access_token"),
    refreshToken = json.optString("refresh_token"),
    expiresAt = json.longOr("expires_at", 0L),
    userId = usuario?.stringOrNull("id").orEmpty(),
    telefono = usuario?.stringOrNull("telefono").orEmpty()
  )
}

internal fun usuarioFrom(json: JSONObject): Usuario {
  val perfil = json.getJSONObject("usuario")
  val capacidades = json.optJSONObject("capacidades")
  val conductor = json.optJSONObject("conductor")
  return Usuario(
    id = perfil.stringOrNull("id").orEmpty(),
    rol = perfil.optString("rol", "cliente"),
    nombre = perfil.stringOrNull("nombre"),
    telefono = perfil.optString("telefono"),
    saldoBilletera = perfil.doubleOr("saldo_billetera", 0.0),
    conductor = conductor?.let {
      Conductor(
        tipoVehiculo = it.stringOrNull("tipo_vehiculo"),
        placa = it.stringOrNull("placa"),
        verificacion = it.stringOrNull("verificacion"),
        estado = it.stringOrNull("estado"),
        motivoRechazo = it.stringOrNull("motivo_rechazo")
      )
    },
    puedePedirViajes = capacidades.boolOr("puede_pedir_viajes"),
    puedeConducir = capacidades.boolOr("puede_conducir")
  )
}

class AuthRepository(
  private val api: ApiClient = ApiClient(),
  private val store: SessionStore
) {

  val tieneSesion: Boolean get() = store.tieneSesion

  /** Devuelve el mensaje que la API manda mostrar (WhatsApp, SMS o el aviso de fallback). */
  suspend fun pedirCodigo(telefono: String, rol: String = "cliente", nombre: String? = null): String {
    val body = JSONObject().put("telefono", telefono).put("rol", rol)
    if (!nombre.isNullOrBlank()) body.put("nombre", nombre)
    return api.post("/auth/otp", body).optString("mensaje", "Revisa tu WhatsApp: te enviamos el código.")
  }

  suspend fun verificarCodigo(telefono: String, codigo: String): Session {
    val body = JSONObject().put("telefono", telefono).put("token", codigo.trim())
    val session = sessionFrom(api.post("/auth/verify", body))
    store.save(session)
    return session
  }

  suspend fun perfil(): Usuario {
    val token = store.accessTokenVigente() ?: renovar()?.accessToken ?: throw sinSesion()
    return try {
      usuarioFrom(api.get("/auth/me", token))
    } catch (e: ApiException) {
      if (e.httpStatus != 401) throw e
      val renovada = renovar() ?: throw e
      usuarioFrom(api.get("/auth/me", renovada.accessToken))
    }
  }

  suspend fun cerrarSesion() {
    val token = store.accessToken()
    store.clear()
    if (token != null) {
      try {
        api.post("/auth/logout", JSONObject(), token)
      } catch (fallo: ApiException) {
        // La sesión local ya se cerró; si la API no responde, el access_token muere solo.
      }
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
