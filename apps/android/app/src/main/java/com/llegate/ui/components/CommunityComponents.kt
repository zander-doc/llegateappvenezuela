package com.llegate.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAlert
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.CommunityAlert
import com.llegate.model.CommunityAlertType
import com.llegate.model.LocationSuggestion
import com.llegate.ui.theme.Asphalt600
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.CyanGlow
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

@Composable
fun SmartLocationSuggestionsSection(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.NearMe,
                    contentDescription = null,
                    tint = RacingYellow500,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "SUGERENCIAS INTELIGENTES (${uiState.currentState.name.uppercase()})",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100,
                    letterSpacing = 1.sp
                )
            }
            Text(
                text = "GPS en vivo",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Emerald500
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        LazyRow(
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(uiState.currentSuggestions) { suggestion ->
                SuggestionCard(
                    suggestion = suggestion,
                    bcvRate = uiState.bcvExchangeRate,
                    onClick = { viewModel.selectSuggestion(suggestion) }
                )
            }
        }
    }
}

@Composable
private fun SuggestionCard(
    suggestion: LocationSuggestion,
    bcvRate: Double,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(220.dp)
            .clickable(onClick = onClick)
            .testTag("suggestion_card_${suggestion.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt700),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = Asphalt800,
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Text(
                        text = suggestion.tag,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = RacingYellow500,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Text(
                    text = "${suggestion.distanceKm} km",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone400
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = suggestion.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = Stone100,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = suggestion.subtitle,
                fontSize = 11.sp,
                color = Stone400,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 14.sp
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.TwoWheeler,
                        contentDescription = null,
                        tint = RacingYellow500,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(3.dp))
                    Text(
                        text = "${suggestion.etaMinutes} min",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Stone300
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$${String.format(java.util.Locale.US, "%.2f", suggestion.priceEstimateUsd)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = RacingYellow500
                    )
                    Text(
                        text = "Bs. ${String.format(java.util.Locale.US, "%.0f", suggestion.priceEstimateUsd * bcvRate)}",
                        fontSize = 9.sp,
                        color = Stone400
                    )
                }
            }
        }
    }
}

@Composable
fun CommunityAlertsSection(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = null,
                    tint = NeonOrange400,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "ALERTAS DE LA COMUNIDAD EN VIVO",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100,
                    letterSpacing = 1.sp
                )
            }

            Surface(
                onClick = { viewModel.showReportModal(true) },
                shape = RoundedCornerShape(12.dp),
                color = NeonOrange500.copy(alpha = 0.15f),
                border = BorderStroke(1.dp, NeonOrange500)
            ) {
                Text(
                    text = "+ Reportar",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = NeonOrange400,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Categories horizontal filter chips
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            item {
                FilterChipPill(
                    label = "Todas (${uiState.communityAlerts.size})",
                    isSelected = uiState.filterAlertCategory == null,
                    onClick = { viewModel.filterAlertCategory(null) }
                )
            }
            items(CommunityAlertType.values()) { cat ->
                val count = uiState.communityAlerts.count { it.type == cat }
                FilterChipPill(
                    label = "${cat.emoji} ${cat.badgeLabel} ($count)",
                    isSelected = uiState.filterAlertCategory == cat,
                    onClick = { viewModel.filterAlertCategory(cat) }
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // List of alerts
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            uiState.filteredAlerts.forEach { alert ->
                CommunityAlertItemRow(
                    alert = alert,
                    onInspectOnMap = {
                        viewModel.selectMapAlert(alert)
                    },
                    onConfirm = { viewModel.confirmCommunityAlert(alert.id) }
                )
            }
        }
    }
}

@Composable
private fun FilterChipPill(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isSelected) RacingYellow500 else Asphalt900,
        border = BorderStroke(1.dp, if (isSelected) RacingYellow500 else Asphalt700)
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
            color = if (isSelected) Asphalt950 else Stone300,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun CommunityAlertItemRow(
    alert: CommunityAlert,
    onInspectOnMap: () -> Unit,
    onConfirm: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onInspectOnMap),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt800)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Asphalt800),
                contentAlignment = Alignment.Center
            ) {
                Text(text = alert.type.emoji, fontSize = 20.sp)
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = alert.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone100,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "${alert.locationName} • Hace ${alert.reportedMinutesAgo}m por ${alert.reportedBy}",
                    fontSize = 11.sp,
                    color = Stone400,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Surface(
                onClick = onConfirm,
                shape = RoundedCornerShape(10.dp),
                color = if (alert.userConfirmed) Emerald500 else Asphalt800,
                border = BorderStroke(1.dp, if (alert.userConfirmed) Emerald500 else Asphalt700)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.ThumbUp,
                        contentDescription = null,
                        tint = if (alert.userConfirmed) Asphalt950 else RacingYellow500,
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${alert.confirmations}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = if (alert.userConfirmed) Asphalt950 else Stone100
                    )
                }
            }
        }
    }
}

@Composable
fun CommunityReportDialog(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (type: CommunityAlertType, note: String, location: String) -> Unit,
    defaultLocation: String
) {
    if (!isOpen) return

    var selectedType by remember { mutableStateOf(CommunityAlertType.POLICE_CHECKPOINT) }
    var locationInput by remember { mutableStateOf(defaultLocation) }
    var noteInput by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Asphalt900,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AddAlert,
                    contentDescription = null,
                    tint = NeonOrange500,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Reportar en Vía con Panas",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100
                )
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Ayuda a los conductores y pasajeros de la zona compartiendo el estado actual de la vía:",
                    fontSize = 12.sp,
                    color = Stone400
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Tipo de Incidencia:",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone300
                )

                Spacer(modifier = Modifier.height(6.dp))

                // Type selector grid / list
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    CommunityAlertType.values().forEach { type ->
                        val isSelected = selectedType == type
                        Surface(
                            onClick = { selectedType = type },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) NeonOrange500.copy(alpha = 0.2f) else Asphalt800,
                            border = BorderStroke(1.dp, if (isSelected) NeonOrange500 else Asphalt700),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = type.emoji, fontSize = 18.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = type.title,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) Stone100 else Stone300,
                                    modifier = Modifier.weight(1f)
                                )
                                if (isSelected) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = NeonOrange400,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = locationInput,
                    onValueChange = { locationInput = it },
                    label = { Text("Lugar / Referencia") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Stone100,
                        unfocusedTextColor = Stone100,
                        focusedBorderColor = RacingYellow500,
                        unfocusedBorderColor = Asphalt700,
                        focusedContainerColor = Asphalt950,
                        unfocusedContainerColor = Asphalt950
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = noteInput,
                    onValueChange = { noteInput = it },
                    label = { Text("Detalle rápido (opcional)") },
                    placeholder = { Text("Ej: Sentido Maracay, canal rápido") },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Stone100,
                        unfocusedTextColor = Stone100,
                        focusedBorderColor = RacingYellow500,
                        unfocusedBorderColor = Asphalt700,
                        focusedContainerColor = Asphalt950,
                        unfocusedContainerColor = Asphalt950
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSubmit(selectedType, noteInput, locationInput)
                },
                colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.testTag("submit_community_report_button")
            ) {
                Text(
                    text = "¡Publicar para los panas!",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = Stone400)
            }
        }
    )
}
