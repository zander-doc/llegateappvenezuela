package com.llegate.ui.screens

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.R
import com.llegate.model.ActiveTrip
import com.llegate.model.DriverProfile
import com.llegate.model.TripStep
import com.llegate.ui.components.DriverAvatarBadge
import com.llegate.ui.components.LeafletDarkMapView
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.components.VenezuelanPlateBadge
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.Emerald900
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed400
import com.llegate.ui.theme.RacingRed500
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
fun TripActiveScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val trip = uiState.activeTrip ?: return
    val pana = trip.driver

    BackHandler {
        if (trip.currentStep == TripStep.TRIP_COMPLETED) {
            viewModel.cerrarViaje()
        } else {
            viewModel.showCancelPrompt(true)
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "radar")
    val radarScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "radarScale"
    )

    Scaffold(
        containerColor = Asphalt950,
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Asphalt900,
                border = BorderStroke(1.dp, Asphalt700),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    if (trip.currentStep != TripStep.TRIP_COMPLETED) {
                        OutlinedButton(
                            onClick = { viewModel.showCancelPrompt(true) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .testTag("cancel_trip_button"),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.5.dp, RacingRed500),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = RacingRed400)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Cancel,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Cancelar Viaje",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    } else {
                        Button(
                            onClick = { viewModel.cerrarViaje() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp)
                                .testTag("finish_trip_button"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Emerald500)
                        ) {
                            Text(
                                text = "¡Listo, volver al inicio!",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = Asphalt950
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .background(Asphalt950)
                .padding(innerPadding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_llegate_official_logo),
                        contentDescription = "Llégate",
                        modifier = Modifier.height(52.dp),
                        contentScale = ContentScale.Fit
                    )
                    SpeedStripes()
                }
            }

            // 1. ESTADO DEL VIAJE: lo que contesta GET /trips/:id, nada simulado
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = when (trip.currentStep) {
                            TripStep.SEARCHING_DRIVER -> Asphalt900
                            TripStep.DRIVER_EN_ROUTE -> Asphalt800
                            TripStep.TRIP_IN_PROGRESS -> Color(0xFF0F1B2A)
                            TripStep.TRIP_COMPLETED -> Emerald900
                            else -> Asphalt900
                        }
                    ),
                    border = BorderStroke(1.dp, Asphalt700),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        when (trip.currentStep) {
                            TripStep.SEARCHING_DRIVER -> {
                                Box(
                                    modifier = Modifier
                                        .size(64.dp)
                                        .scale(radarScale)
                                        .clip(CircleShape)
                                        .background(NeonOrange500.copy(alpha = 0.25f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        color = NeonOrange500,
                                        modifier = Modifier.size(38.dp),
                                        strokeWidth = 3.dp
                                    )
                                }
                                Spacer(modifier = Modifier.height(14.dp))
                                Text(
                                    text = "Buscando piloto en ${trip.origin.title}...",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Tu viaje ya está pedido. En cuanto un pana lo acepte, aparece aquí.",
                                    fontSize = 13.sp,
                                    color = Stone400,
                                    textAlign = TextAlign.Center
                                )
                            }
                            TripStep.DRIVER_EN_ROUTE -> {
                                Surface(
                                    color = RacingYellow500,
                                    shape = RoundedCornerShape(20.dp)
                                ) {
                                    Text(
                                        text = "¡EL PANA ACEPTÓ TU VIAJE!",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Asphalt950,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "Viene buscarte a ${trip.origin.title}",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = LlegateHeading,
                                    color = Stone100,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = pana?.name
                                        ?.let { "$it ya tiene tu viaje. Marcalo para coordinar dónde los encuentran." }
                                        ?: "Un piloto aceptó tu viaje.",
                                    fontSize = 13.sp,
                                    color = Stone400,
                                    textAlign = TextAlign.Center
                                )
                            }
                            TripStep.TRIP_IN_PROGRESS -> {
                                Surface(
                                    color = NeonOrange500,
                                    shape = RoundedCornerShape(20.dp)
                                ) {
                                    Text(
                                        text = "EN VIAJE RUMBO AL DESTINO",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "Vas seguro con Llégate 🇻🇪",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Destino: ${trip.destination.title}",
                                    fontSize = 13.sp,
                                    color = Stone400
                                )
                            }
                            TripStep.TRIP_COMPLETED -> {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(Emerald500),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Asphalt950,
                                        modifier = Modifier.size(32.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "¡Llegaste fino, mi pana! 🎉",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "El piloto cerró el viaje. Ya quedó en tu historial.",
                                    fontSize = 13.sp,
                                    color = Stone300
                                )
                            }
                            else -> {}
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        LinearProgressIndicator(
                            progress = { trip.progressFraction },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = NeonOrange500,
                            trackColor = Asphalt700
                        )
                    }
                }
            }

            // 2. LA RUTA: mapa si hay coordenadas, texto si la API solo guardó nombres
            if (trip.origin.tieneCoordenadas && trip.destination.tieneCoordenadas) {
                item {
                    LeafletDarkMapView(
                        uiState = uiState,
                        viewModel = viewModel,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp)
                    )
                }
            } else {
                item {
                    TarjetaRutaTexto(trip)
                }
            }

            // 3. EL PILOTO QUE LA API ASIGNÓ (o el aviso de que aún no hay)
            if (pana != null) {
                item {
                    TarjetaPiloto(trip = trip, pana = pana, viewModel = viewModel, context = context)
                }
            } else {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("sin_piloto_card"),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Asphalt900),
                        border = BorderStroke(1.dp, Asphalt700)
                    ) {
                        Text(
                            text = "Todavía no hay piloto asignado. La app pregunta al servidor cada 5 segundos " +
                                "y aquí mismo aparece en cuanto alguno acepte.",
                            fontSize = 13.sp,
                            color = Stone300,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }

            // 4. TARIFA CLARA
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Asphalt900),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "MÉTODO DE PAGO",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Stone400
                            )
                            Text(
                                text = trip.metodoPagoTexto,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Stone100
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "TARIFA CLARA (SIN REGATEO)",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Stone400
                            )
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "Ref. ${usd(trip.precioUsd)}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = RacingYellow500
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "(${bs(trip.precioBs)})",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Stone300
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // MODAL: CANCELAR EL VIAJE EN EL SERVIDOR
    if (uiState.showCancelDialog) {
        var selectedCancelReason by remember { mutableStateOf("El pana tardó mucho") }
        val cancelReasons = listOf(
            "El pana tardó mucho en llegar",
            "Cambié de planes / ya no voy",
            "Pedí el servicio por error",
            "Conseguí otra cola"
        )

        AlertDialog(
            onDismissRequest = { viewModel.showCancelPrompt(false) },
            confirmButton = {
                Button(
                    onClick = { viewModel.cancelarViaje(selectedCancelReason) },
                    colors = ButtonDefaults.buttonColors(containerColor = RacingRed500),
                    modifier = Modifier.testTag("confirm_cancel_button")
                ) {
                    Text("Sí, Cancelar Carrera", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.showCancelPrompt(false) }) {
                    Text("Seguir Esperando", color = Stone400)
                }
            },
            containerColor = Asphalt900,
            title = {
                Text(
                    text = "¿Seguro que deseas cancelar?",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = Stone100
                )
            },
            text = {
                Column {
                    Text(
                        text = pana?.name?.let { "El pana $it ya tiene tu viaje. Cuéntanos por qué cancelas:" }
                            ?: "El viaje ya está pedido. Cuéntanos por qué cancelas:",
                        fontSize = 13.sp,
                        color = Stone400
                    )
                    Spacer(modifier = Modifier.height(10.dp))

                    cancelReasons.forEach { reason ->
                        Surface(
                            onClick = { selectedCancelReason = reason },
                            shape = RoundedCornerShape(8.dp),
                            color = if (selectedCancelReason == reason) RacingRed500.copy(alpha = 0.2f) else Asphalt800,
                            border = BorderStroke(
                                1.dp,
                                if (selectedCancelReason == reason) RacingRed500 else Asphalt700
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                        ) {
                            Text(
                                text = reason,
                                fontSize = 12.sp,
                                fontWeight = if (selectedCancelReason == reason) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedCancelReason == reason) RacingRed400 else Stone100,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        )
    }
}

/**
 * Un viaje reanudado solo tiene los nombres de la ruta: la base guarda `origen` y
 * `destino` como texto, sin coordenadas, así que no se puede dibujar sin mentir.
 */
@Composable
private fun TarjetaRutaTexto(trip: ActiveTrip, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("ruta_sin_coordenadas_card"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt700)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(Emerald500)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(text = trip.origin.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Stone100)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = NeonOrange400,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = trip.destination.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Stone100)
            }
            Text(
                text = "Este viaje se reanudó desde tu historial: Llégate guarda la ruta como texto, " +
                    "así que el mapa aparece cuando pidas un viaje nuevo.",
                fontSize = 11.sp,
                color = Stone400
            )
        }
    }
}

/**
 * La ficha del piloto con lo único que la API guarda de él: nombre, teléfono, vehículo,
 * placa y si su verificación está aprobada. No hay reseñas, PIN ni color que inventar.
 */
@Composable
private fun TarjetaPiloto(
    trip: ActiveTrip,
    pana: DriverProfile,
    viewModel: LlegateViewModel,
    context: Context,
    modifier: Modifier = Modifier
) {
    val iniciales = pana.name.split(" ").mapNotNull { it.firstOrNull() }.take(2).joinToString("")
    val esMoto = pana.tipoVehiculo?.contains("moto", true) ?: false

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("driver_profile_card"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.dp, Asphalt700),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                DriverAvatarBadge(initials = iniciales, isVerified = pana.verified)
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = pana.name, fontSize = 17.sp, fontWeight = FontWeight.Black, color = Stone100)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (esMoto) Icons.Default.TwoWheeler else Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = NeonOrange400,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = pana.vehicleModel ?: "Vehículo sin modelo cargado",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = if (pana.verified) "Verificado por Llégate" else "Verificación pendiente",
                        fontSize = 12.sp,
                        color = if (pana.verified) Emerald500 else RacingYellow500
                    )
                }
                pana.plate?.let { VenezuelanPlateBadge(plate = it) }
            }

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 14.dp),
                color = Asphalt800
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                val telefono = pana.phone
                if (telefono != null) {
                    Button(
                        onClick = { viewModel.makeCall(context, telefono) },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("call_driver_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Asphalt800),
                        border = BorderStroke(1.dp, Asphalt700)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Call,
                            contentDescription = "Llamar",
                            tint = Stone100,
                            modifier = Modifier.size(17.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Llamar", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Stone100)
                    }

                    Button(
                        onClick = {
                            viewModel.enviarWhatsApp(
                                context,
                                telefono,
                                "Hola ${pana.name}, soy tu pana de Llégate por el viaje de ${trip.origin.title} a ${trip.destination.title}."
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("chat_driver_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Asphalt800),
                        border = BorderStroke(1.dp, Asphalt700)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Message,
                            contentDescription = "Mensaje",
                            tint = Stone100,
                            modifier = Modifier.size(17.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Mensaje", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Stone100)
                    }
                }

                Button(
                    onClick = { viewModel.shareTrip(context) },
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .testTag("share_trip_button"),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Compartir",
                        tint = Color.White,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "Compartir", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                }
            }

            if (pana.phone == null) {
                Text(
                    text = "El piloto no tiene teléfono cargado: puedes seguir el viaje desde el historial.",
                    fontSize = 11.sp,
                    color = Stone400,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }
        }
    }
}
