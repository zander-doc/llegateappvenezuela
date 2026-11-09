package com.llegate.utils

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object UpdateManager {
    private const val VERSION_URL = "https://llegateappvenezuela.pages.dev/version.json"
    private const val APK_MIME_TYPE = "application/vnd.android.package-archive"

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Returns update metadata when the remote version is newer, or null when the
     * installed version is current.
     *
     * The JSON must contain versionCode, versionName, apkUrl, and isMandatory.
     * Network and malformed-response errors are propagated to the caller.
     */
    suspend fun checkForUpdates(currentVersionCode: Int): UpdateInfo? = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(VERSION_URL)
            .header("Accept", "application/json")
            .get()
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("Update check failed with HTTP ${response.code}.")
            }

            val responseBody = response.body?.string()
                ?: throw IOException("Update check returned an empty response.")
            val json = JSONObject(responseBody)
            val versionCode = json.getInt("versionCode")
            val versionName = json.getString("versionName").takeIf(String::isNotBlank)
                ?: throw IllegalArgumentException("The update versionName is empty.")
            val apkUrl = json.getString("apkUrl").takeIf(String::isNotBlank)
                ?: throw IllegalArgumentException("The update apkUrl is empty.")
            val mandatory = json.getBoolean("isMandatory")

            if (versionCode <= currentVersionCode) {
                null
            } else {
                validateHttpsUrl(apkUrl)
                UpdateInfo(
                    versionCode = versionCode,
                    versionName = versionName,
                    apkUrl = apkUrl,
                    isMandatory = mandatory
                )
            }
        }
    }

    /**
     * Enqueues the APK download. The system notification lets the user open and
     * confirm installation when the download finishes.
     */
    fun downloadAndInstallApk(context: Context, apkUrl: String): Long {
        validateHttpsUrl(apkUrl)
        val request = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("Actualizando LlégateApp")
            .setDescription("Descargando la nueva versión...")
            .setMimeType(APK_MIME_TYPE)
            .setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            )
            .setDestinationInExternalFilesDir(
                context,
                Environment.DIRECTORY_DOWNLOADS,
                "llegate_update.apk"
            )

        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        return downloadManager.enqueue(request)
    }

    private fun validateHttpsUrl(value: String) {
        val uri = Uri.parse(value)
        require(uri.scheme.equals("https", ignoreCase = true) && !uri.host.isNullOrBlank()) {
            "Update URLs must use HTTPS and include a valid host."
        }
    }
}

data class UpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val isMandatory: Boolean
)
