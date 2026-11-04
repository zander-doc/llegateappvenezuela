package com.llegate.data

import android.content.Context
import com.llegate.network.Session
import java.util.concurrent.TimeUnit

private const val PREFERENCES = "llegate_sesion"
private const val CLAVE_ACCESO = "access_token"
private const val CLAVE_REFRESCO = "refresh_token"
private const val CLAVE_VENCIMIENTO = "expires_at"

/** El access_token vive minutos; se renueva un poco antes para no cortar la acción del usuario. */
private val MARGEN_RENOVACION_SEGUNDOS = TimeUnit.MINUTES.toSeconds(1)

/** La sesión de este dispositivo; la web tiene la suya sobre la misma cuenta. */
class SessionStore(context: Context) {

  private val prefs = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  val tieneSesion: Boolean
    get() = !prefs.getString(CLAVE_REFRESCO, null).isNullOrBlank()

  fun accessToken(): String? = prefs.getString(CLAVE_ACCESO, null)

  fun refreshToken(): String? = prefs.getString(CLAVE_REFRESCO, null)

  fun accessTokenVigente(): String? {
    val token = accessToken()
    if (token.isNullOrBlank()) return null
    val vigente = prefs.getLong(CLAVE_VENCIMIENTO, 0L) - MARGEN_RENOVACION_SEGUNDOS > ahora()
    return token.takeIf { vigente }
  }

  fun save(session: Session) {
    prefs.edit()
      .putString(CLAVE_ACCESO, session.accessToken)
      .putString(CLAVE_REFRESCO, session.refreshToken)
      .putLong(CLAVE_VENCIMIENTO, session.expiresAt)
      .apply()
  }

  fun clear() {
    prefs.edit().clear().apply()
  }
}

private fun ahora(): Long = System.currentTimeMillis() / 1000
