package com.llegate.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.util.bs
import com.llegate.util.usd
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReferralsScreen(uiState: LlegateUiState, viewModel: LlegateViewModel) {
  BackHandler { viewModel.navigateToHome() }
  val clipboard = LocalClipboardManager.current
  val context = LocalContext.current
  val summary = uiState.referralSummary
  Scaffold(
    containerColor = Asphalt950,
    topBar = {
      TopAppBar(
        title = { Text("Invita a tus panas", color = Stone100, fontWeight = FontWeight.Black) },
        navigationIcon = {
          IconButton(onClick = { viewModel.navigateToHome() }) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Stone100)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Asphalt950)
      )
    }
  ) { padding ->
    Column(
      modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
      Card(
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        shape = RoundedCornerShape(18.dp)
      ) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
          Text("TU CÓDIGO", color = NeonOrange400, fontSize = 12.sp, fontWeight = FontWeight.Black)
          Spacer(Modifier.height(8.dp))
          Text(
            summary?.code ?: "Cargando…",
            color = RacingYellow500,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier.testTag("referral_code")
          )
          Spacer(Modifier.height(12.dp))
          Button(
            onClick = {
              summary?.code?.let { clipboard.setText(AnnotatedString(it)) }
            },
            enabled = !summary?.code.isNullOrBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Asphalt800),
            modifier = Modifier.fillMaxWidth().testTag("copy_referral_code")
          ) {
            Icon(Icons.Default.ContentCopy, null, tint = Stone100)
            Text("  Copiar código", color = Stone100)
          }
          Spacer(Modifier.height(8.dp))
          Button(
            onClick = { viewModel.compartirCodigoReferido(context) },
            enabled = !summary?.code.isNullOrBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
            modifier = Modifier.fillMaxWidth().testTag("share_referral_whatsapp")
          ) {
            Text("Compartir por WhatsApp", color = Asphalt950, fontWeight = FontWeight.Black)
          }
        }
      }

      Card(
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        shape = RoundedCornerShape(18.dp)
      ) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Text("INVITACIONES", color = NeonOrange400, fontSize = 12.sp, fontWeight = FontWeight.Black)
          Text("Panas invitados: ${summary?.invitedCount ?: "—"}", color = Stone100)
          Text("Carreras completadas: ${summary?.rewardedCount ?: "—"}", color = Stone100)
          Text(
            "Saldo acumulado: ${summary?.let { usd(it.accruedUsd) } ?: "—"} • ${summary?.let { bs(it.accruedUsd * uiState.bcvExchangeRate) } ?: "—"}",
            color = RacingYellow500,
            fontWeight = FontWeight.Bold
          )
          Text("Cada persona recibe $5 al completarse la primera carrera válida del invitado.", color = Stone400, fontSize = 12.sp)
        }
      }

      Text("¿Te invitaron? Aplica el código antes de tu primera carrera.", color = Stone300, fontSize = 13.sp)
      OutlinedTextField(
        value = uiState.referralCodeInput,
        onValueChange = viewModel::onReferralCodeInput,
        label = { Text("Código de tu pana") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
        modifier = Modifier.fillMaxWidth().testTag("apply_referral_code_input")
      )
      Button(
        onClick = viewModel::aplicarCodigoReferido,
        enabled = !uiState.favoriteRequestInProgress,
        colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
        modifier = Modifier.fillMaxWidth().testTag("apply_referral_code")
      ) {
        Text("Aplicar código", color = Asphalt950, fontWeight = FontWeight.Black)
      }
      Text("El bono no se adelanta: se acredita en la billetera al finalizar la primera carrera válida.", color = Stone400, fontSize = 11.sp)
    }
  }
}
