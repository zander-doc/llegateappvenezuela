package com.llegate.data

import android.content.Context
import com.llegate.network.Session

private const val PREFERENCES = "llegate_sesion"
private const val CLAVE_ACCESO = "access_token"
private const val CLAVE_REFRESCO = "refresh_token"

/** Guarda la sesión de este dispositivo. La web y la app son sesiones separadas sobre la misma cuenta. */
class SessionStore(context: Context) {

  private val prefs = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  val tieneSesion: Boolean
    get() = !prefs.getString(CLAVE_ACCESO, null).isNullOrBlank()

  fun accessToken(): String? = prefs.getString(CLAVE_ACCESO, null)

  fun refreshToken(): String? = prefs.getString(CLAVE_REFRESCO, null)

  fun save(session: Session) {
    prefs.edit()
      .putString(CLAVE_ACCESO, session.accessToken)
      .putString(CLAVE_REFRESCO, session.refreshToken)
      .apply()
  }

  fun clear() {
    prefs.edit().clear().apply()
  }
}
