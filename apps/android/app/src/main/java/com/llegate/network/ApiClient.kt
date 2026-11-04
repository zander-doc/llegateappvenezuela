package com.llegate.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiConfig {
  const val BASE_URL: String = "https://llegate-app-api.onrender.com"
  const val USER_AGENT: String = "LlegateApp-Android/1.0"
  internal val JSON: okhttp3.MediaType = "application/json; charset=utf-8".toMediaType()
}

/**
 * `code` es el `error` que publica la API; las acciones que fallan por el estado del
 * recurso responden `motivo`, así que también se usa como código. `httpStatus` vale
 * 0 cuando no hubo conexión y `body` conserva el JSON completo de la respuesta.
 */
class ApiException(
  val httpStatus: Int,
  val code: String,
  override val message: String,
  val body: JSONObject = JSONObject()
) : Exception(message)

class ApiClient(
  private val baseUrl: String = ApiConfig.BASE_URL,
  private val client: OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(15, TimeUnit.SECONDS)
    .build()
) {

  suspend fun get(path: String, accessToken: String? = null): JSONObject =
    request(path, null, accessToken)

  suspend fun post(path: String, body: JSONObject, accessToken: String? = null): JSONObject =
    request(path, body, accessToken)

  private suspend fun request(
    path: String,
    body: JSONObject?,
    accessToken: String?
  ): JSONObject = withContext(Dispatchers.IO) {
    val builder = Request.Builder()
      .url(baseUrl + path)
      .header("User-Agent", ApiConfig.USER_AGENT)
      .header("Accept", "application/json")
    accessToken?.let { builder.header("Authorization", "Bearer $it") }
    if (body != null) builder.post(body.toString().toRequestBody(ApiConfig.JSON))

    try {
      client.newCall(builder.build()).execute().use { response ->
        val text = response.body?.string().orEmpty()
        val json = readJson(text, response.code)
        if (!response.isSuccessful) {
          throw ApiException(
            httpStatus = response.code,
            code = json.stringOrNull("error")
              ?: json.stringOrNull("motivo")
              ?: if (response.code >= 500) "servidor_no_disponible" else "error",
            message = json.optString("mensaje", mensajeSegunEstado(response.code)),
            body = json
          )
        }
        json
      }
    } catch (e: IOException) {
      throw ApiException(0, "sin_conexion", NO_HAY_CONEXION)
    }
  }

  private fun readJson(text: String, httpStatus: Int): JSONObject =
    if (text.isBlank()) JSONObject()
    else runCatching { JSONObject(text) }.getOrElse {
      throw ApiException(httpStatus, "respuesta_invalida", "La API devolvió algo que no pudimos leer.")
    }

  private fun mensajeSegunEstado(httpStatus: Int): String = when {
    httpStatus >= 500 -> "Llégate está fallando ahora mismo. Intenta en un momento."
    else -> "No pudimos completar esa acción."
  }
}

private const val NO_HAY_CONEXION: String =
  "No pudimos conectar con Llégate. Revisa tu internet e inténtalo de nuevo."

// Los `numeric(12,2)` de Postgres pueden llegar como número o como texto ("2.00")
// según la ruta, así que todo número se lee convirtiendo su representación.
internal fun JSONObject?.doubleOr(key: String, fallback: Double = 0.0): Double =
  this?.opt(key)?.toString()?.toDoubleOrNull() ?: fallback

/** Para las columnas nullable (`distancia_km`, `comision_usd`): null solo si la API no manda valor. */
internal fun JSONObject?.doubleOrNull(key: String): Double? =
  if (this == null || isNull(key)) null else opt(key)?.toString()?.toDoubleOrNull()

internal fun JSONObject?.intOr(key: String, fallback: Int = 0): Int =
  this?.opt(key)?.toString()?.toIntOrNull() ?: fallback

internal fun JSONObject?.longOr(key: String, fallback: Long = 0L): Long =
  this?.opt(key)?.toString()?.toLongOrNull() ?: fallback

internal fun JSONObject?.boolOr(key: String, fallback: Boolean = false): Boolean =
  when (val value = this?.opt(key)) {
    is Boolean -> value
    null, JSONObject.NULL -> fallback
    else -> value.toString().toBooleanStrictOrNull() ?: fallback
  }

internal fun JSONObject?.stringOrNull(key: String): String? {
  val value = this?.opt(key)
  return if (value == null || value == JSONObject.NULL) null else value.toString()
}

internal fun JSONObject?.stringOr(key: String, fallback: String = ""): String =
  stringOrNull(key) ?: fallback

internal inline fun <T> JSONArray?.listar(transformar: (JSONObject) -> T): List<T> =
  if (this == null) emptyList() else List(length()) { transformar(getJSONObject(it)) }
