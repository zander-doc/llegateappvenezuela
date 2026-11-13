package com.llegate.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.llegate.network.Session
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.util.concurrent.TimeUnit

private const val PREFERENCES = "llegate_sesion"
private const val KEY_ALIAS = "llegate_sesion_v1"
private const val CIPHER_PREFIX = "enc:v1:"
private const val CLAVE_ACCESO = "access_token"
private const val CLAVE_REFRESCO = "refresh_token"
private const val CLAVE_VENCIMIENTO = "expires_at"

/** El access_token vive minutos; se renueva un poco antes para no cortar la acción del usuario. */
private val MARGEN_RENOVACION_SEGUNDOS = TimeUnit.MINUTES.toSeconds(1)

/** La sesión de este dispositivo; la web tiene la suya sobre la misma cuenta. */
class SessionStore(context: Context) {

  private val prefs = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  val tieneSesion: Boolean
    get() = !readToken(CLAVE_REFRESCO).isNullOrBlank()

  fun accessToken(): String? = readToken(CLAVE_ACCESO)

  fun refreshToken(): String? = readToken(CLAVE_REFRESCO)

  fun accessTokenVigente(): String? {
    val token = accessToken()
    if (token.isNullOrBlank()) return null
    val vigente = prefs.getLong(CLAVE_VENCIMIENTO, 0L) - MARGEN_RENOVACION_SEGUNDOS > ahora()
    return token.takeIf { vigente }
  }

  fun save(session: Session) {
    prefs.edit()
      .putString(CLAVE_ACCESO, encrypt(session.accessToken))
      .putString(CLAVE_REFRESCO, encrypt(session.refreshToken))
      .putLong(CLAVE_VENCIMIENTO, session.expiresAt)
      .apply()
  }

  fun clear() {
    if (!prefs.edit().clear().commit()) {
      throw IllegalStateException("No se pudo borrar la sesión local")
    }
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
    } catch (error: Exception) {
      throw IllegalStateException("No se pudo eliminar la clave de sesión", error)
    }
  }

  private fun readToken(key: String): String? {
    val stored = prefs.getString(key, null) ?: return null
    if (stored.startsWith(CIPHER_PREFIX)) return decrypt(stored)

    val encrypted = encrypt(stored)
    if (!prefs.edit().putString(key, encrypted).commit()) {
      throw IllegalStateException("No se pudo proteger la sesión guardada")
    }
    return stored
  }

  private fun encrypt(value: String): String {
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, sessionKey())
      val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
      val payload = cipher.iv + encrypted
      return CIPHER_PREFIX + Base64.encodeToString(payload, Base64.NO_WRAP)
    } catch (error: Exception) {
      throw IllegalStateException("No se pudo cifrar la sesión", error)
    }
  }

  private fun decrypt(value: String): String {
    try {
      val payload = Base64.decode(value.removePrefix(CIPHER_PREFIX), Base64.NO_WRAP)
      val ivLength = 12
      if (payload.size <= ivLength) throw IllegalArgumentException("Payload cifrado inválido")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(
        Cipher.DECRYPT_MODE,
        sessionKey(),
        GCMParameterSpec(128, payload.copyOfRange(0, ivLength))
      )
      return cipher.doFinal(payload.copyOfRange(ivLength, payload.size)).toString(Charsets.UTF_8)
    } catch (error: Exception) {
      throw IllegalStateException("No se pudo descifrar la sesión guardada", error)
    }
  }

  private fun sessionKey(): SecretKey {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      val existing = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
      if (existing != null) return existing

      return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
        init(
          KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
          )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        )
        generateKey()
      }
    } catch (error: Exception) {
      throw IllegalStateException("No se pudo acceder a la clave segura de sesión", error)
    }
  }
}

private fun ahora(): Long = System.currentTimeMillis() / 1000
