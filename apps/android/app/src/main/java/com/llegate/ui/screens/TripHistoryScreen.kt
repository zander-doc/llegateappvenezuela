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
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Payment
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
import com.llegate.network.EstadoViaje
import com.llegate.network.Viaje
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.RacingRed400
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.util.bs
import com.llegate.util.usd
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

/**
 * El historial es exactamente `GET /trips`: el servidor guarda origen, destino, tarifa,
 * método de pago y el piloto asignado. No hay reseñas ni coordenadas, así que tampoco
 * se ofrece "repetir la ruta" con datos que la app no tiene.
 */
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
                            text = "Los viajes que pediste con tu cuenta",
                            fontSize = 11.sp,
                            color = NeonOrange400
                        )
                    }
                }

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
                            text = "${uiState.viajes.size} viajes",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = RacingYellow500
                        )
                    }
                }
            }
        }

        HorizontalDivider(thickness = 1.dp, color = Asphalt800)

        if (uiState.viajes.isEmpty()) {
            EmptyHistoryView(onExploreRides = { viewModel.navigateToHome() })
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("trip_history_list"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(uiState.viajes, key = { it.id }) { viaje ->
                    TripHistoryCard(viaje = viaje)
                }

                item {
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
fun TripHistoryCard(viaje: Viaje, modifier: Modifier = Modifier) {
    val colorEstado = when (viaje.estado) {
        EstadoViaje.FINALIZADO -> Emerald500
        EstadoViaje.CANCELADO -> RacingRed400
        else -> RacingYellow500
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("history_item_${viaje.id}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt700),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
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
                            .background(colorEstado.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccessTime,
                            contentDescription = null,
                            tint = colorEstado,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = viaje.fechaTexto.ifEmpty { "Sin fecha" },
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Text(
                            text = viaje.estadoTexto,
                            fontSize = 11.sp,
                            color = colorEstado
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = usd(viaje.precioUsd),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = RacingYellow500
                    )
                    viaje.precioBs?.let {
                        Text(
                            text = bs(it),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone300
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(thickness = 0.8.dp, color = Asphalt800)
            Spacer(modifier = Modifier.height(14.dp))

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Emerald500)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(text = viaje.origen, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Stone100)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = NeonOrange400,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(text = viaje.destino, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Stone100)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

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
                            text = viaje.conductor?.nombre ?: "Sin piloto asignado",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Text(
                            text = viaje.conductor?.let {
                                listOfNotNull(it.placa?.let { placa -> "Placa $placa" }, if (it.verificado) "Verificado" else null)
                                    .joinToString(" • ")
                            } ?: viaje.estadoTexto,
                            fontSize = 10.sp,
                            color = Stone400
                        )
                    }

                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Asphalt900)
                            .border(1.dp, Asphalt700, RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
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
                            text = viaje.metodoPagoTexto,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone300
                        )
                    }
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
            text = "Aquí se van a guardar los viajes que pidas con tu cuenta, con su tarifa, su estado y el piloto que te llevó.",
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
