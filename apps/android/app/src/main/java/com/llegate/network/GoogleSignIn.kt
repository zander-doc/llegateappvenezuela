package com.llegate.network

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

/** Resultado del selector de cuentas de Google. */
sealed interface ResultadoGoogle {
  data class Token(val idToken: String) : ResultadoGoogle
  /** La persona cerró el selector: no es un error. */
  data object Cancelado : ResultadoGoogle
  data class Falla(val mensaje: String) : ResultadoGoogle
}

/**
 * Abre el selector de cuentas de Google (sin elegir cuenta por la persona). `context`
 * debe ser el de la Activity. `serverClientId` es el ID de cliente **web** que
 * publica `/auth/google/config`: el ID token sale emitido para él y la API lo valida.
 */
suspend fun pedirTokenGoogle(context: Context, serverClientId: String): ResultadoGoogle {
  val opcion = GetSignInWithGoogleOption.Builder(serverClientId).build()
  val peticion = GetCredentialRequest.Builder().addCredentialOption(opcion).build()
  return try {
    val credencial = CredentialManager.create(context).getCredential(context, peticion).credential
    if (credencial is CustomCredential &&
      credencial.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
    ) {
      ResultadoGoogle.Token(GoogleIdTokenCredential.createFrom(credencial.data).idToken)
    } else {
      ResultadoGoogle.Falla("No pudimos leer la cuenta de Google. Intenta de nuevo.")
    }
  } catch (fallo: GetCredentialCancellationException) {
    ResultadoGoogle.Cancelado
  } catch (fallo: NoCredentialException) {
    ResultadoGoogle.Falla("No hay una cuenta de Google en este teléfono. Agrégala en Ajustes e inténtalo de nuevo.")
  } catch (fallo: GetCredentialException) {
    ResultadoGoogle.Falla("No pudimos abrir Google. Revisa tu conexión e inténtalo de nuevo.")
  }
}
