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

/** Lo que `/auth/otp` contesta: el texto para el usuario y el canal que realmente salió. */
data class EnvioOtp(val mensaje: String, val canal: String?) {
  val entregado: Boolean
    get() = canal == "whatsapp" || canal == "sms"
}

class AuthRepository(
  private val api: ApiClient = ApiClient(),
  private val store: SessionStore
) {

  /**
   * El cliente autenticado de esta sesión. Viajes, billetera y pagos lo comparten
   * para que el token y su renovación vivan en un solo lugar.
   */
  val http = AuthorizedClient(api, store)

  val tieneSesion: Boolean get() = store.tieneSesion

  /**
   * Pide el código. `/auth/otp` contesta 202 con el canal que usó: `whatsapp` o `sms`
   * significan que salió, `log` que la entrega falló y el código quedó solo en el
   * servidor. La hoja de ingreso pinta el aviso según eso, no como un éxito.
   */
  suspend fun pedirCodigo(telefono: String, rol: String = "cliente", nombre: String? = null): EnvioOtp {
    val body = JSONObject().put("telefono", telefono).put("rol", rol)
    if (!nombre.isNullOrBlank()) body.put("nombre", nombre)
    val respuesta = api.post("/auth/otp", body)
    return EnvioOtp(
      mensaje = respuesta.optString("mensaje", "Revisa tu WhatsApp: te enviamos el código."),
      canal = respuesta.stringOrNull("canal")
    )
  }

  suspend fun verificarCodigo(telefono: String, codigo: String): Session {
    val body = JSONObject().put("telefono", telefono).put("token", codigo.trim())
    val session = sessionFrom(api.post("/auth/verify", body))
    store.save(session)
    return session
  }

  suspend fun perfil(): Usuario = usuarioFrom(http.get("/auth/me"))

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
}
