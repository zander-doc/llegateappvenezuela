package com.llegate.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.ServiceType
import com.llegate.model.TripHistoryItem
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import java.util.Locale

@Composable
fun TripHistoryScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    BackHandler {
        viewModel.navigateToHome()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Asphalt950)
    ) {
        // TOP APP BAR
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF000000), Asphalt950)
                    )
                )
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { viewModel.navigateToHome() },
                        modifier = Modifier
                            .size(40.dp)
                            .background(Asphalt900, CircleShape)
                            .border(1.dp, Asphalt700, CircleShape)
                            .testTag("history_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver a Inicio",
                            tint = Stone100
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Mi Historial",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = LlegateHeading,
                                color = Stone100
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            SpeedStripes()
                        }
                        Text(
                            text = "Tus carreras con panas en Aragua y la ARC",
                            fontSize = 11.sp,
                            color = NeonOrange400
                        )
                    }
                }

                // Trips counter badge
                Surface(
                    color = Asphalt900,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, RacingYellow500)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.History,
                            contentDescription = null,
                            tint = RacingYellow500,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${uiState.tripHistory.size} viajes",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = RacingYellow500
                        )
                    }
                }
            }
        }

        HorizontalDivider(thickness = 1.dp, color = Asphalt800)

        // CONTENT: LIST OF TRIPS OR EMPTY STATE
        if (uiState.tripHistory.isEmpty()) {
            EmptyHistoryView(onExploreRides = { viewModel.navigateToHome() })
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("trip_history_list"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    // Header reminder banner
                    Surface(
                        color = Asphalt900,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Asphalt700),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(RacingYellow500.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Replay,
                                    contentDescription = null,
                                    tint = RacingYellow500,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "¡Repite tu ruta en 1 toque, mi pana!",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100
                                )
                                Text(
                                    text = "Toca 'Repetir carrera' para precargar tu origen, destino y tarifa actualizada.",
                                    fontSize = 11.sp,
                                    color = Stone400,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }

                items(uiState.tripHistory, key = { it.id }) { item ->
                    TripHistoryCard(
                        item = item,
                        onRepeat = { viewModel.repeatTrip(item) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
fun TripHistoryCard(
    item: TripHistoryItem,
    onRepeat: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isMoto = item.serviceType == ServiceType.MOTO
    val accentColor = if (isMoto) RacingYellow500 else NeonOrange500

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("history_item_${item.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt700),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // CARD HEADER: DATE & SERVICE TYPE
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(accentColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isMoto) Icons.Default.TwoWheeler else Icons.Default.DirectionsCar,
                            contentDescription = item.serviceType.title,
                            tint = accentColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = item.serviceType.title,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AccessTime,
                                contentDescription = null,
                                tint = Stone400,
                                modifier = Modifier.size(11.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = item.date,
                                fontSize = 11.sp,
                                color = Stone400
                            )
                        }
                    }
                }

                // DUAL PRICE DISPLAY
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "$${String.format(Locale.US, "%.2f", item.priceUsd)}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = RacingYellow500
                    )
                    Text(
                        text = "${String.format(Locale.US, "%,.2f", item.priceBs)} Bs",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Stone300
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(thickness = 0.8.dp, color = Asphalt800)
            Spacer(modifier = Modifier.height(14.dp))

            // ROUTE TIMELINE: ORIGIN & DESTINATION
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Origin
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Emerald500)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = item.origin.title,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                        Text(
                            text = item.origin.subtitle,
                            fontSize = 11.sp,
                            color = Stone400
                        )
                    }
                }

                // Destination
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = NeonOrange400,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = item.destination.title,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                        Text(
                            text = item.destination.subtitle,
                            fontSize = 11.sp,
                            color = Stone400
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // DRIVER & PAYMENT INFO ROW
            Surface(
                color = Asphalt800,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, Asphalt700),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "${item.driverName} ${item.driverAlias}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Text(
                            text = "${item.driverVehicle} • Placa ${item.driverPlate}",
                            fontSize = 10.sp,
                            color = Stone400
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Rating stars
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = RacingYellow500,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = "${item.ratingGiven}.0",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = RacingYellow500
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        // Payment pill
                        Surface(
                            color = Asphalt900,
                            shape = RoundedCornerShape(6.dp),
                            border = BorderStroke(1.dp, Asphalt700)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Payment,
                                    contentDescription = null,
                                    tint = NeonOrange400,
                                    modifier = Modifier.size(10.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = item.paymentMethod.title,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Stone300
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // ACTION BUTTON: REPEAT TRIP WITH 1-TAP
            Button(
                onClick = onRepeat,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
                    .testTag("repeat_trip_button_${item.id}"),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isMoto) RacingYellow500 else NeonOrange500
                )
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Replay,
                        contentDescription = null,
                        tint = if (isMoto) Asphalt950 else Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Repetir esta carrera",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = if (isMoto) Asphalt950 else Color.White
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyHistoryView(
    onExploreRides: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(Asphalt900)
                .border(1.5.dp, Asphalt700, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.History,
                contentDescription = null,
                tint = RacingYellow500,
                modifier = Modifier.size(36.dp)
            )
        }

        Spacer(modifier = Modifier.height(18.dp))

        Text(
            text = "¡Aún no tienes carreras, mi pana!",
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = Stone100,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Cuando completes tus traslados en Maracay, Cagua o cualquier punto de Aragua, se guardarán aquí para repetirlos en un solo toque.",
            fontSize = 13.sp,
            color = Stone400,
            textAlign = TextAlign.Center,
            lineHeight = 18.sp
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onExploreRides,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = RacingYellow500),
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .height(46.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Navigation,
                    contentDescription = null,
                    tint = Asphalt950,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "¡Pedir mi primera cola!",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    color = Asphalt950
                )
            }
        }
    }
}
