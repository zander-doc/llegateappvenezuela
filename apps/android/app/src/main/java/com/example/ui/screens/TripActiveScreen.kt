package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.example.R
import com.example.model.ServiceType
import com.example.model.TripStep
import com.example.ui.components.DriverAvatarBadge
import com.example.ui.components.DynamicGpsMap
import com.example.ui.components.LeafletDarkMapView
import com.example.ui.components.RouteCanvasMap
import com.example.ui.components.SpeedStripes
import com.example.ui.components.StarRatingBar
import com.example.ui.components.VenezuelanPlateBadge
import com.example.ui.theme.Asphalt700
import com.example.ui.theme.Asphalt800
import com.example.ui.theme.Asphalt900
import com.example.ui.theme.Asphalt950
import com.example.ui.theme.Emerald500
import com.example.ui.theme.Emerald900
import com.example.ui.theme.NeonOrange300
import com.example.ui.theme.NeonOrange400
import com.example.ui.theme.NeonOrange500
import com.example.ui.theme.RacingRed400
import com.example.ui.theme.RacingRed500
import com.example.ui.theme.RacingYellow500
import com.example.ui.theme.Stone100
import com.example.ui.theme.Stone300
import com.example.ui.theme.Stone400
import com.example.viewmodel.LlegateUiState
import com.example.viewmodel.LlegateViewModel
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripActiveScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val trip = uiState.activeTrip ?: return

    var showChatDialog by remember { mutableStateOf(false) }
    var chatMessage by remember { mutableStateOf("") }
    var sentQuickChat by remember { mutableStateOf<String?>(null) }

    BackHandler {
        if (trip.currentStep != TripStep.TRIP_COMPLETED) {
            viewModel.showCancelPrompt(true)
        } else {
            viewModel.closeRatingSheetAndFinish()
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
                            onClick = { viewModel.closeRatingSheetAndFinish() },
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
            // BRAND LOGO IN SIMULATION
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

            // 1. LIVE STATUS HEADER BANNER
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
                                    text = "Buscando al pana más cercano...",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Conectando con conductores activos en ${trip.origin.title}",
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
                                        text = "¡EL PANA VIENE EN CAMINO!",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Asphalt950,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "Llega en aprox. 2 minutos",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${trip.driver.name} ya aceptó tu carrera con panas",
                                    fontSize = 13.sp,
                                    color = Stone400
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
                                    text = "Esperamos hayas disfrutado tu carrera",
                                    fontSize = 13.sp,
                                    color = Stone300
                                )
                            }
                            else -> {}
                        }

                        // PROGRESS BAR IN NEON ORANGE
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

            // 2. LIVE LEAFLET + CARTODB DARK MATTER ROUTE MAP
            item {
                LeafletDarkMapView(
                    uiState = uiState,
                    viewModel = viewModel,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                )
            }

            // 3. VERIFIED DRIVER PROFILE & VEHICLE IDENTIFIER CARD
            if (trip.currentStep != TripStep.SEARCHING_DRIVER) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("driver_profile_card"),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Asphalt900),
                        border = BorderStroke(1.dp, Asphalt700),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            // Driver Top Row: Avatar, Name, Rating
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                DriverAvatarBadge(
                                    initials = trip.driver.name.split(" ").mapNotNull { it.firstOrNull() }.take(2).joinToString(""),
                                    rating = trip.driver.rating
                                )

                                Spacer(modifier = Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = trip.driver.name,
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Stone100
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = trip.driver.alias,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = RacingYellow500
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = null,
                                            tint = RacingYellow500,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = "${trip.driver.rating}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Stone100
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "• ${trip.driver.tripsCount} carreras",
                                            fontSize = 12.sp,
                                            color = Stone400
                                        )
                                    }
                                }

                                // Security PIN Badge
                                Surface(
                                    color = Asphalt800,
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(1.dp, NeonOrange500.copy(alpha = 0.5f))
                                ) {
                                    Column(
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Lock,
                                                contentDescription = null,
                                                tint = NeonOrange400,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Text(
                                                text = "PIN",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = NeonOrange400
                                            )
                                        }
                                        Text(
                                            text = trip.driver.pinCode,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Black,
                                            color = RacingYellow500
                                        )
                                    }
                                }
                            }

                            HorizontalDivider(
                                modifier = Modifier.padding(vertical = 14.dp),
                                color = Asphalt800
                            )

                            // Vehicle Identifier & Plate Row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = if (trip.serviceType == ServiceType.MOTO) Icons.Default.TwoWheeler else Icons.Default.DirectionsCar,
                                            contentDescription = null,
                                            tint = NeonOrange400,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = trip.driver.vehicleModel,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Stone100
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Color: ${trip.driver.vehicleColor}",
                                        fontSize = 12.sp,
                                        color = Stone400
                                    )
                                }

                                VenezuelanPlateBadge(plate = trip.driver.plate)
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Action buttons: Call, Chat, Share trip
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Button(
                                    onClick = { viewModel.makeCall(context, trip.driver.phone) },
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
                                    onClick = { showChatDialog = true },
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

                            // Feedback if message sent
                            AnimatedVisibility(visible = sentQuickChat != null) {
                                Surface(
                                    color = Emerald900.copy(alpha = 0.5f),
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, Emerald500),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 10.dp)
                                ) {
                                    Text(
                                        text = "Mensaje enviado al pana: \"$sentQuickChat\"",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Emerald500,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 4. TARIFA CLARA SUMMARY CARD
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
                                text = trip.paymentMethod.title,
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
                                    text = "Ref. $${String.format(Locale.US, "%.2f", trip.priceEstimate.priceUsd)}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = RacingYellow500
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "(${String.format(Locale.US, "%,.2f", trip.priceEstimate.priceBs)} Bs.)",
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

    // MODAL: QUICK CHAT WITH DRIVER
    if (showChatDialog) {
        AlertDialog(
            onDismissRequest = { showChatDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        if (chatMessage.isNotBlank()) {
                            sentQuickChat = chatMessage
                            chatMessage = ""
                        }
                        showChatDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500)
                ) {
                    Text("Enviar al pana", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showChatDialog = false }) {
                    Text("Cancelar", color = Stone400)
                }
            },
            containerColor = Asphalt900,
            title = {
                Text(
                    text = "Mensaje a ${trip.driver.name}",
                    fontWeight = FontWeight.Black,
                    fontSize = 17.sp,
                    color = Stone100
                )
            },
            text = {
                Column {
                    Text(
                        text = "Mensajes rápidos:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Stone400
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    val quickMessages = listOf(
                        "¡Ya voy bajando!",
                        "Estoy frente a la panadería.",
                        "Voy de camisa azul.",
                        "Espérame 2 minuticos por fa."
                    )

                    quickMessages.forEach { qm ->
                        Surface(
                            onClick = {
                                sentQuickChat = qm
                                showChatDialog = false
                            },
                            shape = RoundedCornerShape(8.dp),
                            color = Asphalt800,
                            border = BorderStroke(1.dp, Asphalt700),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                        ) {
                            Text(
                                text = "💬 \"$qm\"",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Stone100,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = chatMessage,
                        onValueChange = { chatMessage = it },
                        label = { Text("Escribir mensaje propio") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonOrange500,
                            unfocusedBorderColor = Asphalt700,
                            focusedTextColor = Stone100,
                            unfocusedTextColor = Stone100,
                            focusedContainerColor = Asphalt800,
                            unfocusedContainerColor = Asphalt800
                        )
                    )
                }
            }
        )
    }

    // MODAL: CANCEL TRIP CONFIRMATION
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
                    onClick = { viewModel.cancelTrip(selectedCancelReason) },
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
                        text = "El pana ${trip.driver.name} ya está en ruta para buscarte. Cuéntanos por qué cancelas:",
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

    // TRIP RATING & REVIEW BOTTOM SHEET
    if (uiState.showTripRatingSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { viewModel.closeRatingSheetAndFinish() },
            sheetState = sheetState,
            containerColor = Asphalt900
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    color = Emerald900,
                    shape = CircleShape,
                    modifier = Modifier.size(56.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Emerald500,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "¡Llegaste fino a ${trip.destination.title}!",
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "¿Cómo estuvo tu carrera con ${trip.driver.name}?",
                    fontSize = 13.sp,
                    color = Stone400,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                StarRatingBar(
                    rating = uiState.tripRating,
                    onRatingChanged = { viewModel.setTripRating(it) },
                    modifier = Modifier.testTag("rating_stars_bar")
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "¿Quieres dejarle algo pal refresco al pana?",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone300
                )
                Spacer(modifier = Modifier.height(8.dp))

                val tipOptions = listOf(0.0 to "Sin propina", 0.50 to "+$0.50", 1.0 to "+$1.00", 2.0 to "+$2.00")
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    tipOptions.forEach { (tipAmount, label) ->
                        val isSelected = uiState.selectedTipUsd == tipAmount
                        Surface(
                            onClick = { viewModel.setTipUsd(tipAmount) },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) NeonOrange500 else Asphalt800,
                            border = BorderStroke(1.dp, if (isSelected) NeonOrange500 else Asphalt700),
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else Stone300
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { viewModel.closeRatingSheetAndFinish() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("submit_rating_button"),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500)
                ) {
                    Text(
                        text = "Finalizar y calificar carrera",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}
