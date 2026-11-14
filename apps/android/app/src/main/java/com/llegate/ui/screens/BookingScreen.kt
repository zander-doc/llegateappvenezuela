package com.llegate.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.llegate.R
import com.llegate.model.LocationPoint
import com.llegate.model.PaymentMethod
import com.llegate.model.PriceEstimate
import com.llegate.model.ServiceType
import com.llegate.ui.components.LeafletDarkMapView
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.theme.Asphalt600
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.CyanGlow
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateMono
import com.llegate.ui.theme.NeonOrange300
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.util.usd
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import java.util.Locale

/**
 * Dedicated 'Request Ride' / 'Solicitar Viaje' screen.
 * Allows users to specify origin (current location via GPS or custom search),
 * set their destination, view upfront fare and live Leaflet route, and send the
 * trip request directly to nearby drivers.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestRideScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    BackHandler {
        viewModel.navigateToHome()
    }

    var originInputText by remember(uiState.origin.title) { mutableStateOf(uiState.origin.title) }
    var destInputText by remember(uiState.destination.title) { mutableStateOf(uiState.destination.title) }
    var showSaveFavoriteDialog by remember { mutableStateOf(false) }
    var favoriteAddressLabel by remember { mutableStateOf("") }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.requestCurrentGpsLocation(context)
        }
    }

    val currentEstimate = uiState.selectedEstimate ?: when (uiState.selectedService) {
        ServiceType.MOTO -> uiState.motoEstimate ?: PriceEstimate(ServiceType.MOTO, 3.2, 7, 1.81, 1606.0)
        ServiceType.CAR -> uiState.carEstimate ?: PriceEstimate(ServiceType.CAR, 3.2, 14, 4.62, 4099.0)
        ServiceType.DELIVERY -> uiState.deliveryEstimate ?: PriceEstimate(ServiceType.DELIVERY, 3.2, 8, 1.94, 1721.0)
    }

    Scaffold(
        containerColor = Asphalt950,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_llegate_round_logo),
                            contentDescription = "Llégate",
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Solicitar Viaje",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone100
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                SpeedStripes(stripeWidth = 8, stripeHeight = 5)
                            }
                            Text(
                                text = "Pilotos cercanos en ${uiState.currentState.name}",
                                fontSize = 11.sp,
                                color = RacingYellow500
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = { viewModel.navigateToHome() },
                        modifier = Modifier.testTag("booking_back_button")
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = Stone100
                        )
                    }
                },
                actions = {
                    Surface(
                        color = Asphalt900,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Asphalt700),
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Text(
                            text = "${uiState.selectedCityName} 🇻🇪",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone300,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Asphalt950)
            )
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Asphalt900,
                border = BorderStroke(1.dp, Asphalt700),
                shadowElevation = 16.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                ) {
                    // Summary price & ETA
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Tarifa Clara (${uiState.selectedService.colloquialTitle}):",
                                fontSize = 12.sp,
                                color = Stone400,
                                fontWeight = FontWeight.Medium
                            )
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "$${String.format(Locale.US, "%.2f", currentEstimate.priceUsd).replace('.', ',')}",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = LlegateMono,
                                    color = RacingYellow500
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "~ ${String.format(Locale.US, "%,.0f", currentEstimate.priceBs).replace(',', '.')} Bs.",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Stone300,
                                    modifier = Modifier.padding(bottom = 2.dp)
                                )
                            }
                        }

                        Surface(
                            color = Asphalt800,
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Asphalt700)
                        ) {
                            Text(
                                text = uiState.selectedPaymentMethod.title,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeonOrange400,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // THE PRIMARY ACTION BUTTON: SEND REQUEST TO NEARBY DRIVERS
                    Button(
                        onClick = { viewModel.pedirViaje() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .testTag("send_request_button")
                            .testTag("confirm_trip_button"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = RacingYellow500,
                            contentColor = Asphalt950
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = null,
                                tint = Asphalt950,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "Pedir este viaje • 0% Regateo",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Asphalt950
                                )
                                Text(
                                    text = "Se registra en Llégate y un piloto de la zona lo acepta",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF2A2000)
                                )
                            }
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
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. INTERACTIVE ORIGIN & DESTINATION SPECIFICATION CARD
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("route_specification_card"),
                    shape = RoundedCornerShape(20.dp),
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
                                Text(
                                    text = "ESPECIFICA TU RUTA",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Stone400,
                                    letterSpacing = 1.sp
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                SpeedStripes(stripeWidth = 6, stripeHeight = 4)
                            }

                            // Quick Invert / Swap Button
                            Surface(
                                onClick = {
                                    viewModel.swapOriginAndDestination()
                                    originInputText = uiState.destination.title
                                    destInputText = uiState.origin.title
                                },
                                shape = CircleShape,
                                color = Asphalt800,
                                border = BorderStroke(1.dp, Asphalt700),
                                modifier = Modifier
                                    .size(32.dp)
                                    .testTag("swap_route_button")
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.SwapVert,
                                        contentDescription = "Invertir ruta",
                                        tint = RacingYellow500,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // CURRENT LOCATION / ORIGIN INPUT FIELD
                        OutlinedTextField(
                            value = originInputText,
                            onValueChange = { newText ->
                                originInputText = newText
                                val updatedPoint = LocationPoint(
                                    title = newText,
                                    subtitle = "Punto de recogida especificado",
                                    lat = uiState.origin.lat,
                                    lng = uiState.origin.lng,
                                    stateName = uiState.currentState.name,
                                    cityName = uiState.selectedCityName
                                )
                                viewModel.updateOrigin(updatedPoint)
                            },
                            label = { Text("Tu Ubicación Actual (Recogida)", color = Emerald500, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            leadingIcon = {
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .clip(CircleShape)
                                        .background(Emerald500)
                                )
                            },
                            trailingIcon = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (originInputText.isNotEmpty()) {
                                        IconButton(onClick = { originInputText = "" }) {
                                            Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = Stone400, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    // GPS Location Button Shortcut
                                    IconButton(
                                        onClick = {
                                            val hasPermission = ContextCompat.checkSelfPermission(
                                                context,
                                                Manifest.permission.ACCESS_FINE_LOCATION
                                            ) == PackageManager.PERMISSION_GRANTED
                                            if (hasPermission) {
                                                viewModel.requestCurrentGpsLocation(context)
                                            } else {
                                                permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                                            }
                                        },
                                        modifier = Modifier.testTag("gps_origin_shortcut")
                                    ) {
                                        if (uiState.isFetchingGps) {
                                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = NeonOrange400)
                                        } else {
                                            Icon(
                                                imageVector = Icons.Default.MyLocation,
                                                contentDescription = "GPS Actual",
                                                tint = RacingYellow500,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("origin_location_input"),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Emerald500,
                                unfocusedBorderColor = Asphalt700,
                                focusedTextColor = Stone100,
                                unfocusedTextColor = Stone100,
                                focusedContainerColor = Asphalt950,
                                unfocusedContainerColor = Asphalt950
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // DESTINATION INPUT FIELD
                        OutlinedTextField(
                            value = destInputText,
                            onValueChange = { newText ->
                                destInputText = newText
                                val updatedPoint = LocationPoint(
                                    title = newText,
                                    subtitle = "Destino seleccionado por el usuario",
                                    lat = 0.0,
                                    lng = 0.0,
                                    stateName = uiState.currentState.name,
                                    cityName = uiState.selectedCityName
                                )
                                viewModel.updateDestination(updatedPoint)
                            },
                            label = { Text("Destino (¿Para dónde nos vamos?)", color = RacingYellow500, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            leadingIcon = {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(RacingYellow500)
                                )
                            },
                            trailingIcon = {
                                if (destInputText.isNotEmpty()) {
                                    IconButton(onClick = { destInputText = "" }) {
                                        Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = Stone400, modifier = Modifier.size(16.dp))
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("destination_location_input"),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = RacingYellow500,
                                unfocusedBorderColor = Asphalt700,
                                focusedTextColor = Stone100,
                                unfocusedTextColor = Stone100,
                                focusedContainerColor = Asphalt950,
                                unfocusedContainerColor = Asphalt950
                            )
                        )

                        if (uiState.favoriteAddresses.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("TUS DIRECCIONES", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Stone400)
                            Spacer(modifier = Modifier.height(6.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(uiState.favoriteAddresses, key = { it.id }) { address ->
                                    Surface(
                                        onClick = {
                                            val point = address.asLocationPoint()
                                            destInputText = point.title
                                            viewModel.updateDestination(point)
                                        },
                                        shape = RoundedCornerShape(14.dp),
                                        color = Asphalt800,
                                        border = BorderStroke(1.dp, RacingYellow500),
                                        modifier = Modifier.testTag("favorite_address_${address.id}")
                                    ) {
                                        Text(
                                            address.label,
                                            color = RacingYellow500,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                                        )
                                    }
                                }
                            }
                        }
                        TextButton(
                            onClick = {
                                favoriteAddressLabel = ""
                                showSaveFavoriteDialog = true
                            },
                            enabled = uiState.destination.tieneCoordenadas &&
                                destInputText == uiState.destination.title,
                            modifier = Modifier.testTag("save_favorite_destination")
                        ) {
                            Text("Guardar este destino como favorito", color = NeonOrange400, fontSize = 12.sp)
                        }

                        // QUICK SUGGESTION CHIPS FOR DESTINATION
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "SUGERENCIAS RÁPIDAS EN ${uiState.selectedCityName.uppercase()}:",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone400
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(uiState.currentPopularLocations) { point ->
                                Surface(
                                    onClick = {
                                        destInputText = point.title
                                        viewModel.updateDestination(point)
                                    },
                                    shape = RoundedCornerShape(14.dp),
                                    color = Asphalt800,
                                    border = BorderStroke(1.dp, Asphalt700)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.LocationOn,
                                            contentDescription = null,
                                            tint = RacingYellow500,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = point.title,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Stone100
                                        )
                                    }
                                }

                            }
                        }
                    }

                }
            }

            // 2. Live dark map with road route and destination selection.
            item {
                Column {
                    LeafletDarkMapView(
                        uiState = uiState,
                        viewModel = viewModel,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(240.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Distancia calculada: ~${currentEstimate.distanceKm} km",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Stone400
                        )
                        Text(
                            text = "Tiempo estimado: ~${currentEstimate.etaMinutes} min",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = RacingYellow500
                        )
                    }
                }
            }

            // 3. LO QUE PASA DESPUÉS DE PEDIR EL VIAJE
            item {
                Surface(
                    color = Asphalt900,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, NeonOrange500.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(NeonOrange500)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "El viaje se registra y un piloto de la zona lo acepta",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = Stone100
                            )
                            Text(
                                text = "Verás su nombre, su placa y su teléfono en la pantalla del viaje. El radar de panas cercanos es una fase próxima.",
                                fontSize = 11.sp,
                                color = Stone400
                            )
                        }
                    }
                }
            }

            // 4. VEHICLE TYPE SELECTION: MOTO VS CARRO VS DELIVERY
            item {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SELECCIONA TIPO DE SERVICIO",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone400,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "BCV: ${String.format(Locale.US, "%.2f", uiState.bcvExchangeRate)} Bs/$",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = RacingYellow500
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Mototaxi
                        ServiceChoiceCard(
                            serviceType = ServiceType.MOTO,
                            isSelected = uiState.selectedService == ServiceType.MOTO,
                            estimate = uiState.motoEstimate,
                            icon = Icons.Default.TwoWheeler,
                            modifier = Modifier.weight(1f),
                            testTag = "select_option_moto",
                            onSelect = { viewModel.selectService(ServiceType.MOTO) }
                        )

                        // Taxi Pana
                        ServiceChoiceCard(
                            serviceType = ServiceType.CAR,
                            isSelected = uiState.selectedService == ServiceType.CAR,
                            estimate = uiState.carEstimate,
                            icon = Icons.Default.DirectionsCar,
                            modifier = Modifier.weight(1f),
                            testTag = "select_option_car",
                            onSelect = { viewModel.selectService(ServiceType.CAR) }
                        )

                        // Delivery Express
                        ServiceChoiceCard(
                            serviceType = ServiceType.DELIVERY,
                            isSelected = uiState.selectedService == ServiceType.DELIVERY,
                            estimate = uiState.deliveryEstimate,
                            icon = Icons.Default.Inventory2,
                            modifier = Modifier.weight(1f),
                            testTag = "select_option_delivery",
                            onSelect = { viewModel.selectService(ServiceType.DELIVERY) }
                        )
                    }
                }
            }

            // 6. PAYMENT METHODS
            item {
                Column {
                    Text(
                        text = "MÉTODO DE PAGO EN VENEZUELA",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Stone100,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        PaymentMethodRow(
                            method = PaymentMethod.PAGO_MOVIL,
                            icon = Icons.Default.PhoneAndroid,
                            isSelected = uiState.selectedPaymentMethod == PaymentMethod.PAGO_MOVIL,
                            onSelect = { viewModel.selectPaymentMethod(PaymentMethod.PAGO_MOVIL) }
                        )

                        PaymentMethodRow(
                            method = PaymentMethod.EFECTIVO_USD,
                            icon = Icons.Default.AttachMoney,
                            isSelected = uiState.selectedPaymentMethod == PaymentMethod.EFECTIVO_USD,
                            onSelect = { viewModel.selectPaymentMethod(PaymentMethod.EFECTIVO_USD) }
                        )

                        PaymentMethodRow(
                            method = PaymentMethod.SALDO_LLEGATE,
                            icon = Icons.Default.AccountBalanceWallet,
                            subtitle = "Billetera prepaga (${usd(uiState.cuenta?.saldoBilletera ?: 0.0)} disponible)",
                            isSelected = uiState.selectedPaymentMethod == PaymentMethod.SALDO_LLEGATE,
                            onSelect = { viewModel.selectPaymentMethod(PaymentMethod.SALDO_LLEGATE) }
                        )
                    }
                }
            }

        }
    }

    if (showSaveFavoriteDialog) {
        AlertDialog(
            onDismissRequest = { showSaveFavoriteDialog = false },
            title = { Text("Guardar dirección favorita") },
            text = {
                OutlinedTextField(
                    value = favoriteAddressLabel,
                    onValueChange = { favoriteAddressLabel = it },
                    label = { Text("Etiqueta, por ejemplo Casa") },
                    singleLine = true,
                    modifier = Modifier.testTag("favorite_address_label")
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.guardarDireccionFavorita(favoriteAddressLabel, uiState.destination)
                        showSaveFavoriteDialog = false
                    },
                    enabled = favoriteAddressLabel.isNotBlank()
                ) { Text("Guardar") }
            },
            dismissButton = {
                TextButton(onClick = { showSaveFavoriteDialog = false }) { Text("Cancelar") }
            }
        )
    }
}

/**
 * Service choice option card showing icon, colloquial title, upfront fare in $ and Bs.
 */
@Composable
fun ServiceChoiceCard(
    serviceType: ServiceType,
    isSelected: Boolean,
    estimate: PriceEstimate?,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    testTag: String,
    onSelect: () -> Unit
) {
    val borderColor = if (isSelected) RacingYellow500 else Asphalt700
    val bgColor = if (isSelected) Asphalt800 else Asphalt900
    val borderWidth = if (isSelected) 2.dp else 1.dp

    Card(
        modifier = modifier
            .clickable { onSelect() }
            .testTag(testTag),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        border = BorderStroke(borderWidth, borderColor)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (isSelected) RacingYellow500 else Asphalt700),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = serviceType.title,
                    tint = if (isSelected) Asphalt950 else Stone100,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = serviceType.colloquialTitle,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = if (isSelected) RacingYellow500 else Stone100,
                maxLines = 1
            )

            Text(
                text = "~${estimate?.etaMinutes ?: 5} min",
                fontSize = 10.sp,
                color = Stone400
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "$${String.format(Locale.US, "%.2f", estimate?.priceUsd ?: 1.81).replace('.', ',')}",
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = if (isSelected) RacingYellow500 else Color.White
            )

            Text(
                text = "${String.format(Locale.US, "%,.0f", estimate?.priceBs ?: 1600.0).replace(',', '.')} Bs.",
                fontSize = 9.sp,
                color = Stone400
            )
        }
    }
}

@Composable
fun PaymentMethodRow(
    method: PaymentMethod,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    subtitle: String = method.subtitle,
    onSelect: () -> Unit
) {
    Surface(
        onClick = onSelect,
        shape = RoundedCornerShape(12.dp),
        color = if (isSelected) Asphalt800 else Asphalt900,
        border = BorderStroke(
            if (isSelected) 1.5.dp else 1.dp,
            if (isSelected) RacingYellow500 else Asphalt700
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) RacingYellow500 else Stone400,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = method.title,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) Stone100 else Stone300
                )
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = Stone400
                )
            }
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "Seleccionado",
                    tint = RacingYellow500,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

/**
 * Backward compatibility alias so any callers of BookingScreen continue to work seamlessly.
 */
@Composable
fun BookingScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    RequestRideScreen(uiState = uiState, viewModel = viewModel, modifier = modifier)
}
