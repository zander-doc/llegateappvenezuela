package com.llegate.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(uiState: LlegateUiState, viewModel: LlegateViewModel) {
  BackHandler { viewModel.navigateToHome() }
  Scaffold(
    containerColor = Asphalt950,
    topBar = {
      TopAppBar(
        title = { Text("Mi perfil", color = Stone100, fontWeight = FontWeight.Black) },
        navigationIcon = {
          IconButton(onClick = { viewModel.navigateToHome() }) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Stone100)
          }
        },
        actions = {
          IconButton(onClick = { viewModel.refrescarFavoritos() }) {
            Icon(Icons.Default.Refresh, "Actualizar favoritos", tint = NeonOrange400)
          }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = Asphalt950)
      )
    }
  ) { padding ->
    LazyColumn(
      modifier = Modifier.fillMaxSize().padding(padding),
      contentPadding = PaddingValues(16.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
      item {
        Text("DIRECCIONES FAVORITAS", color = NeonOrange400, fontWeight = FontWeight.Black, fontSize = 12.sp)
        Spacer(Modifier.height(6.dp))
        Text(
          "Guarda un destino desde la búsqueda del viaje; aquí puedes revisar y eliminar tus direcciones.",
          color = Stone400,
          fontSize = 12.sp
        )
      }
      if (uiState.favoriteAddresses.isEmpty()) {
        item {
          TextoVacio(
            if (uiState.loadingFavorites) "Cargando tus direcciones…"
            else "Todavía no guardaste direcciones."
          )
        }
      } else {
        items(uiState.favoriteAddresses, key = { it.id }) { address ->
          Card(
            colors = CardDefaults.cardColors(containerColor = Asphalt900),
            shape = RoundedCornerShape(14.dp)
          ) {
            Row(
              modifier = Modifier.fillMaxWidth().padding(14.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Column(Modifier.weight(1f)) {
                Text(address.label, color = Stone100, fontWeight = FontWeight.Bold)
                Text(address.address, color = Stone300, fontSize = 12.sp)
              }
              IconButton(
                onClick = { viewModel.borrarDireccionFavorita(address.id) },
                enabled = !uiState.favoriteRequestInProgress,
                modifier = Modifier.testTag("delete_address_${address.id}")
              ) {
                Icon(Icons.Default.Delete, "Eliminar ${address.label}", tint = NeonOrange400)
              }
            }
          }
        }
      }

      item {
        Spacer(Modifier.height(8.dp))
        Text("PILOTOS FAVORITOS", color = NeonOrange400, fontWeight = FontWeight.Black, fontSize = 12.sp)
        Spacer(Modifier.height(6.dp))
      }
      if (uiState.favoriteDrivers.isEmpty()) {
        item {
          TextoVacio(
            if (uiState.loadingFavorites) "Cargando tus pilotos…"
            else "Aún no tienes pilotos favoritos. Puedes marcar a un piloto al finalizar un viaje."
          )
        }
      } else {
        items(uiState.favoriteDrivers, key = { it.id }) { driver ->
          Card(
            colors = CardDefaults.cardColors(containerColor = Asphalt900),
            shape = RoundedCornerShape(14.dp)
          ) {
            Row(
              modifier = Modifier.fillMaxWidth().padding(14.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Column(Modifier.weight(1f)) {
                Text(driver.name, color = Stone100, fontWeight = FontWeight.Bold)
                Text(
                  listOfNotNull(driver.vehicle, driver.vehicleType, driver.plate).joinToString(" • "),
                  color = Stone300,
                  fontSize = 12.sp
                )
              }
              Button(
                onClick = { viewModel.cambiarConductorFavorito(driver.id) },
                enabled = !uiState.favoriteRequestInProgress,
                colors = ButtonDefaults.buttonColors(containerColor = Asphalt800),
                modifier = Modifier.testTag("remove_favorite_driver_${driver.id}")
              ) {
                Text("Quitar", color = Stone100)
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun TextoVacio(text: String) {
  Text(
    text = text,
    color = Stone400,
    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
  )
}
