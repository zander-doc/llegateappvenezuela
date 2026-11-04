package com.llegate.network

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class BcvRateService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    /** `null` cuando no hay respuesta: la app mantiene la última tasa que sí conoció. */
    suspend fun fetchOfficialRate(): Double? = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("https://ve.dolarapi.com/v1/dolares/oficial")
            .header("User-Agent", "LlegateApp-Android/1.0")
            .header("Accept", "application/json")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body?.string() ?: return@withContext null
                JSONObject(body).optDouble("promedio", 0.0).takeIf { it > 0 }
            }
        } catch (fallo: Exception) {
            if (fallo is CancellationException) throw fallo
            null
        }
    }
}
