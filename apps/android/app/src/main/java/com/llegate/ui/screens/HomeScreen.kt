package com.llegate.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AirportShuttle
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CardMembership
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Storefront
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.llegate.R
import com.llegate.model.CityInfo
import com.llegate.model.LocationPoint
import com.llegate.model.SafeMeetingPoint
import com.llegate.model.ServiceType
import com.llegate.model.StateRegion
import com.llegate.model.UpcomingService
import com.llegate.ui.components.CommunityAlertsSection
import com.llegate.ui.components.CommunityReportDialog
import com.llegate.ui.components.LeafletDarkMapView
import com.llegate.ui.components.SmartLocationSuggestionsSection
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.theme.Asphalt600
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.NeonOrange300
import com.llegate.ui.theme.NeonOrange400
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingRed500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone200
import com.llegate.ui.theme.Stone300
import com.llegate.ui.theme.Stone400
import com.llegate.ui.theme.Stone50
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var showLocationPickerModal by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.requestCurrentGpsLocation(context)
        }
    }

    // FULLSCREEN MAP MODE
    if (uiState.showFullMapExpanded) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Asphalt950)
        ) {
            LeafletDarkMapView(
                uiState = uiState,
                viewModel = viewModel,
                modifier = Modifier.fillMaxSize(),
                isExpanded = true,
                onExpandToggle = { viewModel.toggleFullMapExpanded(false) }
            )
            Surface(
                onClick = { viewModel.toggleFullMapExpanded(false) },
                shape = CircleShape,
                color = Asphalt900.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, Asphalt700),
                modifier = Modifier
                    .padding(16.dp)
                    .align(Alignment.TopStart)
                    .size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Volver al panel",
                        tint = Stone100,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }
        return
    }

    // MAIN SCREEN WITH LARGE LEAFLET DARK MATTER MAP AND FLOATING CONTROLS
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Asphalt950)
    ) {
        // 1. LARGE LIVE LEAFLET + CARTODB DARK MATTER MAP (Top half of the screen)
        LeafletDarkMapView(
            uiState = uiState,
            viewModel = viewModel,
            modifier = Modifier
                .fillMaxWidth()
                .height(410.dp),
            isExpanded = false,
            onExpandToggle = { viewModel.toggleFullMapExpanded(true) }
        )

        // 2. FLOATING TOP HEADER OVER THE MAP (MATCHING ATTACHED SCREENSHOT)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // LlégateApp Logo Container - Sleek rounded pill with new circular logo badge
                Surface(
                    shape = RoundedCornerShape(22.dp),
                    color = Asphalt950.copy(alpha = 0.94f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier
                        .height(42.dp)
                        .testTag("app_logo_pill")
                ) {
                    Row(
                        modifier = Modifier.padding(start = 5.dp, end = 12.dp, top = 3.dp, bottom = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_llegate_round_logo),
                            contentDescription = "Llégate App - Tu Carrera con Panas",
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.width(7.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "LLÉGATE",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp,
                                color = RacingYellow500
                            )
                            Text(
                                text = "APP",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 0.5.sp,
                                color = Color.White
                            )
                        }
                    }
                }

                // Mode Selector: Pasajero | Piloto (Matching pill height, shape & style)
                Surface(
                    shape = RoundedCornerShape(22.dp),
                    color = Asphalt950.copy(alpha = 0.94f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.height(42.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .padding(3.dp)
                            .fillMaxHeight(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Pasajero Pill
                        Surface(
                            onClick = { viewModel.toggleDriverMode(false) },
                            shape = RoundedCornerShape(18.dp),
                            color = if (!uiState.isDriverMode) RacingYellow500 else Color.Transparent,
                            modifier = Modifier
                                .fillMaxHeight()
                                .testTag("mode_passenger_toggle")
                        ) {
                            Box(
                                modifier = Modifier.padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Pasajero",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (!uiState.isDriverMode) Asphalt950 else Stone400
                                )
                            }
                        }

                        // Piloto Pill
                        Surface(
                            onClick = { viewModel.toggleDriverMode(true) },
                            shape = RoundedCornerShape(18.dp),
                            color = if (uiState.isDriverMode) RacingYellow500 else Color.Transparent,
                            modifier = Modifier
                                .fillMaxHeight()
                                .testTag("mode_driver_toggle")
                        ) {
                            Box(
                                modifier = Modifier.padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Piloto",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (uiState.isDriverMode) Asphalt950 else Stone400
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Sub-row: Ingresar Button, Sede/City selector & BCV rate
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Ingresar Button (From screenshot)
                Surface(
                    onClick = { viewModel.showSubscriptions(true) },
                    shape = RoundedCornerShape(16.dp),
                    color = Asphalt950.copy(alpha = 0.90f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.testTag("btn_ingresar_perfil")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Ingresar",
                            tint = Stone100,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Ingresar",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                    }
                }

                // Sede & City Selector Pill
                Surface(
                    onClick = { viewModel.showCitySelector(true) },
                    shape = RoundedCornerShape(16.dp),
                    color = Asphalt950.copy(alpha = 0.90f),
                    border = BorderStroke(1.dp, if (uiState.currentState.isLaunchHub) RacingYellow500 else Asphalt700),
                    modifier = Modifier
                        .weight(1f)
                        .testTag("city_selector_button")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationCity,
                            contentDescription = null,
                            tint = RacingYellow500,
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${uiState.currentState.name} • ${uiState.selectedCityName}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100,
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            tint = RacingYellow500,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                // BCV Rate Pill with Live Refresh
                Surface(
                    onClick = { viewModel.fetchBcvExchangeRate(showToast = true) },
                    shape = RoundedCornerShape(16.dp),
                    color = Asphalt950.copy(alpha = 0.90f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.testTag("bcv_rate_pill")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(RacingYellow500)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        if (uiState.isFetchingBcvRate) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(10.dp),
                                strokeWidth = 1.5.dp,
                                color = RacingYellow500
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        Text(
                            text = "BCV: ${String.format(java.util.Locale.US, "%.2f", uiState.bcvExchangeRate)}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = RacingYellow500
                        )
                    }
                }
            }
        }

        // 3. OVERLAPPING BOTTOM PANEL (MATCHING THE SCREENSHOT ATTACHED BY USER)
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 345.dp)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(Asphalt900)
                .border(
                    BorderStroke(1.dp, Asphalt700),
                    RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                ),
            contentPadding = PaddingValues(bottom = 36.dp)
        ) {
            // Drag Handle Indicator
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .width(42.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Asphalt600)
                    )
                }
            }

            // RECOGIDA & DESTINO CARD (FROM SCREENSHOT)
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clickable { showLocationPickerModal = true }
                        .testTag("destination_search_card"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Asphalt950),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            // Recogida Row (Yellow bullet)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(RacingYellow500)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Recogida: ",
                                    fontSize = 12.sp,
                                    color = Stone400,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = uiState.origin.title,
                                    fontSize = 13.sp,
                                    color = Stone100,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Destino Row (White square)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(Color.White)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Destino: ",
                                    fontSize = 12.sp,
                                    color = Stone400,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = uiState.destination.title,
                                    fontSize = 13.sp,
                                    color = Stone100,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                            }
                        }

                        // Search Icon button
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(Asphalt800),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Buscar destino",
                                tint = Stone300,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // ACCORDION: "TU VIAJE, A TU MEDIDA"
            item {
                Surface(
                    onClick = { viewModel.toggleTripCustomization() },
                    color = Color.Transparent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .testTag("accordion_trip_customization")
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = RacingYellow500,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Tu viaje, a tu medida",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = RacingYellow500
                            )
                        }
                        Icon(
                            imageVector = if (uiState.showTripCustomization) Icons.Default.ExpandLess else Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            tint = RacingYellow500,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                if (uiState.showTripCustomization) {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val tags = listOf(
                            "Aire Acondicionado Full",
                            "Casco Sanitizado",
                            "Pago Móvil Directo",
                            "Maletero Libre",
                            "Música al Gusto",
                            "Silencio Total"
                        )
                        items(tags) { tag ->
                            val isSelected = uiState.customizationPreferences.contains(tag)
                            Surface(
                                onClick = { viewModel.togglePreferenceTag(tag) },
                                shape = RoundedCornerShape(14.dp),
                                color = if (isSelected) RacingYellow500.copy(alpha = 0.15f) else Asphalt800,
                                border = BorderStroke(1.dp, if (isSelected) RacingYellow500 else Asphalt700)
                            ) {
                                Text(
                                    text = tag,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.SemiBold,
                                    color = if (isSelected) RacingYellow500 else Stone300,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }

            // PUNTO DE ENCUENTRO SEGURO CAROUSEL (FROM SCREENSHOT)
            item {
                Column(modifier = Modifier.padding(top = 6.dp)) {
                    Text(
                        text = "PUNTO DE ENCUENTRO SEGURO",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Stone400,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )

                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(uiState.currentSafeMeetingPoints) { smp ->
                            val isSelected = uiState.selectedSafeMeetingPointId == smp.id ||
                                uiState.origin.title.equals(smp.title, ignoreCase = true)
                            Surface(
                                onClick = { viewModel.selectSafeMeetingPoint(smp) },
                                shape = RoundedCornerShape(16.dp),
                                color = Asphalt950,
                                border = BorderStroke(
                                    if (isSelected) 1.5.dp else 1.dp,
                                    if (isSelected) RacingYellow500 else Asphalt700
                                ),
                                modifier = Modifier
                                    .widthIn(min = 160.dp)
                                    .testTag("safe_point_${smp.id}")
                            ) {
                                Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                                    Text(
                                        text = smp.title,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Stone100,
                                        maxLines = 1
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = smp.tag,
                                        fontSize = 11.sp,
                                        color = if (isSelected) RacingYellow500 else Stone400,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // THREE ACTIVE SERVICES (MOTOTAXI, TAXI PANA, DELIVERY EXPRESS)
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // 1. Mototaxi ($1.81 / Bs. 1.606)
                    val motoPriceUsd = uiState.motoEstimate?.priceUsd ?: 1.81
                    val motoPriceBs = uiState.motoEstimate?.priceBs ?: (1.81 * uiState.bcvExchangeRate)
                    CompactServiceRowCard(
                        title = "Mototaxi",
                        subtitle = "3–7 min · 1 pasajero",
                        priceUsd = motoPriceUsd,
                        priceBs = motoPriceBs,
                        icon = Icons.Default.TwoWheeler,
                        iconBgColor = RacingYellow500,
                        iconColor = Asphalt950,
                        isSelected = uiState.selectedService == ServiceType.MOTO,
                        onClick = { viewModel.selectService(ServiceType.MOTO) },
                        testTag = "service_card_moto"
                    )

                    // 2. Taxi Pana ($4.62 / Bs. 4.099)
                    val carPriceUsd = uiState.carEstimate?.priceUsd ?: 4.62
                    val carPriceBs = uiState.carEstimate?.priceBs ?: (4.62 * uiState.bcvExchangeRate)
                    CompactServiceRowCard(
                        title = "Taxi Pana",
                        subtitle = "5–10 min · Hasta 4",
                        priceUsd = carPriceUsd,
                        priceBs = carPriceBs,
                        icon = Icons.Default.DirectionsCar,
                        iconBgColor = Asphalt800,
                        iconColor = Stone100,
                        isSelected = uiState.selectedService == ServiceType.CAR,
                        onClick = { viewModel.selectService(ServiceType.CAR) },
                        testTag = "service_card_car"
                    )

                    // 3. Delivery Express ($1.94 / Bs. 1.721)
                    val deliveryPriceUsd = uiState.deliveryEstimate?.priceUsd ?: 1.94
                    val deliveryPriceBs = uiState.deliveryEstimate?.priceBs ?: (1.94 * uiState.bcvExchangeRate)
                    CompactServiceRowCard(
                        title = "Delivery Express",
                        subtitle = "20–45 min · Hasta 5 kg",
                        priceUsd = deliveryPriceUsd,
                        priceBs = deliveryPriceBs,
                        icon = Icons.Default.Inventory2,
                        iconBgColor = Asphalt800,
                        iconColor = Stone100,
                        isSelected = uiState.selectedService == ServiceType.DELIVERY,
                        onClick = { viewModel.selectService(ServiceType.DELIVERY) },
                        testTag = "service_card_delivery"
                    )
                }
            }

            // PRIMARY ACTION BUTTON (CONFIRMAR VIAJE / ¡LLÉGATE YA!)
            item {
                Button(
                    onClick = { viewModel.openBooking(uiState.selectedService) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .height(54.dp)
                        .testTag("confirm_trip_button"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RacingYellow500,
                        contentColor = Asphalt950
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                ) {
                    Text(
                        text = "¡Llégate ya! • ${uiState.selectedService.colloquialTitle}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // QUICK DESTINATIONS HORIZONTAL CHIPS
            item {
                Column(modifier = Modifier.padding(top = 10.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "DESTINOS EN ${uiState.currentState.name.uppercase()}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone400,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "Ver todos",
                            fontSize = 11.sp,
                            color = RacingYellow500,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.clickable { showLocationPickerModal = true }
                        )
                    }

                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.currentPopularLocations) { dest ->
                            Surface(
                                onClick = {
                                    viewModel.updateDestination(dest)
                                },
                                shape = RoundedCornerShape(20.dp),
                                color = Asphalt950,
                                border = BorderStroke(1.dp, Asphalt700)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = NeonOrange400,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = dest.title,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Stone100
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // SMART LOCATION SUGGESTIONS SECTION
            item {
                SmartLocationSuggestionsSection(
                    uiState = uiState,
                    viewModel = viewModel,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            // LIVE COMMUNITY ROAD INCIDENTS SECTION
            item {
                CommunityAlertsSection(
                    uiState = uiState,
                    viewModel = viewModel,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }

            // QUICK TRIP HISTORY BANNER (REPETIR RUTA EN 1 TOQUE)
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .clickable { viewModel.openTripHistory() }
                        .testTag("banner_trip_history"),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Asphalt950),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(NeonOrange500.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.History,
                                        contentDescription = "Mi Historial",
                                        tint = NeonOrange400,
                                        modifier = Modifier.size(17.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "MI HISTORIAL DE VIAJES",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Stone100
                                    )
                                    Text(
                                        text = "${uiState.tripHistory.size} carreras guardadas",
                                        fontSize = 11.sp,
                                        color = Stone400
                                    )
                                }
                            }

                            Surface(
                                color = Asphalt800,
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, Asphalt700)
                            ) {
                                Text(
                                    text = "Abrir Historial",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RacingYellow500,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        if (uiState.tripHistory.isNotEmpty()) {
                            val lastTrip = uiState.tripHistory.first()
                            Spacer(modifier = Modifier.height(10.dp))
                            HorizontalDivider(color = Asphalt800, thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Último: ${lastTrip.origin.title} → ${lastTrip.destination.title}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Stone200,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "${lastTrip.date} • ${lastTrip.driverName} (${lastTrip.driverAlias})",
                                        fontSize = 11.sp,
                                        color = Stone400
                                    )
                                }

                                Surface(
                                    onClick = { viewModel.repeatTrip(lastTrip) },
                                    shape = RoundedCornerShape(8.dp),
                                    color = RacingYellow500,
                                    modifier = Modifier.testTag("repeat_last_trip_btn")
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Replay,
                                            contentDescription = "Repetir",
                                            tint = Asphalt950,
                                            modifier = Modifier.size(13.dp)
                                        )
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(
                                            text = "Repetir",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Asphalt950
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // INACTIVE SERVICES PREVIEW (4 PRÓXIMAMENTE)
            item {
                Spacer(modifier = Modifier.height(6.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "RED INTEGRAL DE TRANSPORTE",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone400,
                            letterSpacing = 1.sp
                        )
                        Surface(
                            color = Asphalt800,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Asphalt700)
                        ) {
                            Text(
                                text = "Fase 2 de Expansión",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = RacingYellow500,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        UpcomingServiceItem(
                            service = uiState.upcomingServices[0], // Vans
                            icon = Icons.Default.AirportShuttle,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.showUpcomingDialog(uiState.upcomingServices[0]) }
                        )
                        UpcomingServiceItem(
                            service = uiState.upcomingServices[1], // Buses
                            icon = Icons.Default.DirectionsBus,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.showUpcomingDialog(uiState.upcomingServices[1]) }
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        UpcomingServiceItem(
                            service = uiState.upcomingServices[2], // Repuestos
                            icon = Icons.Default.Storefront,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.showUpcomingDialog(uiState.upcomingServices[2]) }
                        )
                        UpcomingServiceItem(
                            service = uiState.upcomingServices[3], // Grúas
                            icon = Icons.Default.DirectionsCar,
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.showUpcomingDialog(uiState.upcomingServices[3]) }
                        )
                    }
                }
            }
        }
    }

    // MODAL: STATE & CITY SELECTOR (ARAGUA HUB + CENTRAL REGION + 24 STATES EXPANSION)
    if (uiState.showStateSelectorModal || uiState.showCitySelectorModal) {
        AlertDialog(
            onDismissRequest = {
                viewModel.showStateSelector(false)
                viewModel.showCitySelector(false)
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = {
                    viewModel.showStateSelector(false)
                    viewModel.showCitySelector(false)
                }) {
                    Text("Cerrar", color = Stone400)
                }
            },
            containerColor = Asphalt900,
            title = {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Selector de Ciudad & Región",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Stone100
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        SpeedStripes()
                    }
                    Text(
                        text = "Piloto activo en Aragua (Sede) y Región Central 🇻🇪",
                        fontSize = 12.sp,
                        color = RacingYellow500
                    )
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text(
                            text = "ESTADOS ACTIVOS (SELECCIONA ESTADO Y CIUDAD):",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone400,
                            letterSpacing = 0.5.sp
                        )
                    }

                    items(uiState.availableStates) { state ->
                        val isSelected = uiState.selectedStateId == state.id
                        Card(
                            onClick = {
                                if (!isSelected) {
                                    viewModel.selectState(state.id)
                                }
                            },
                            colors = CardDefaults.cardColors(containerColor = if (isSelected) Asphalt800 else Asphalt900),
                            border = BorderStroke(
                                if (isSelected) 2.dp else 1.dp,
                                if (isSelected) RacingYellow500 else Asphalt700
                            ),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("state_card_${state.id}")
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = state.name,
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Black,
                                            color = if (isSelected) RacingYellow500 else Stone100
                                        )
                                        if (state.isLaunchHub) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Surface(
                                                color = RacingYellow500,
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = "SEDE",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = Asphalt950,
                                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                                )
                                            }
                                        }
                                    }

                                    if (isSelected) {
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = RacingYellow500,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = state.subtitle,
                                    fontSize = 11.sp,
                                    color = Stone400
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                // List of cities in this state
                                Text(
                                    text = "Ciudades y Municipios:",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Stone300
                                )

                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    items(state.cities) { city ->
                                        val isCitySelected = isSelected && uiState.selectedCityName.equals(city.name, ignoreCase = true)
                                        Surface(
                                            onClick = {
                                                if (!isSelected) {
                                                    viewModel.selectState(state.id)
                                                }
                                                viewModel.selectCity(city)
                                                viewModel.showCitySelector(false)
                                                viewModel.showStateSelector(false)
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            color = if (isCitySelected) RacingYellow500 else Asphalt700,
                                            modifier = Modifier.testTag("city_btn_${city.name}")
                                        ) {
                                            Text(
                                                text = city.name,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isCitySelected) Asphalt950 else Stone100,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "PRÓXIMA EXPANSIÓN (20 ESTADOS RESTANTES):",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone400,
                            letterSpacing = 0.5.sp
                        )
                    }

                    items(uiState.otherStatesRoadmap) { otherState ->
                        Card(
                            onClick = {
                                viewModel.requestStateExpansion(otherState)
                            },
                            colors = CardDefaults.cardColors(containerColor = Asphalt950),
                            border = BorderStroke(1.dp, Asphalt800),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = otherState,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Stone400
                                )
                                Text(
                                    text = "Votar por apertura 🇻🇪",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = NeonOrange400
                                )
                            }
                        }
                    }
                }
            }
        )
    }

    // MODAL: UPCOMING SERVICE INFO
    if (uiState.selectedUpcomingService != null) {
        val s = uiState.selectedUpcomingService
        AlertDialog(
            onDismissRequest = { viewModel.showUpcomingDialog(null) },
            confirmButton = {
                Button(
                    onClick = { viewModel.showUpcomingDialog(null) },
                    colors = ButtonDefaults.buttonColors(containerColor = RacingYellow500)
                ) {
                    Text("¡Entendido, mi pana!", color = Asphalt950, fontWeight = FontWeight.Black)
                }
            },
            containerColor = Asphalt900,
            title = {
                Column {
                    Surface(
                        color = Asphalt800,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.padding(bottom = 6.dp)
                    ) {
                        Text(
                            text = "PRÓXIMO LANZAMIENTO",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = RacingYellow500,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                    Text(
                        text = s.title,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = Stone100
                    )
                }
            },
            text = {
                Column {
                    Text(text = s.description, fontSize = 13.sp, color = Stone300, lineHeight = 18.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = Asphalt800,
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, Asphalt700),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = "⭐ ", fontSize = 14.sp)
                            Text(
                                text = s.highlightPerk,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = NeonOrange300
                            )
                        }
                    }
                }
            }
        )
    }

    // MODAL: SUSCRIPCIONES (CONDUCTORES Y CLUB VIP)
    if (uiState.showSubscriptionsModal) {
        AlertDialog(
            onDismissRequest = { viewModel.showSubscriptions(false) },
            confirmButton = {
                Button(
                    onClick = { viewModel.showSubscriptions(false) },
                    colors = ButtonDefaults.buttonColors(containerColor = RacingYellow500)
                ) {
                    Text("Cerrar", color = Asphalt950, fontWeight = FontWeight.Black)
                }
            },
            containerColor = Asphalt900,
            title = {
                Column {
                    Text(
                        text = "Club Llégate & Pilotos",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = Stone100
                    )
                    Text(
                        text = "0% comisión para conductores y beneficios VIP",
                        fontSize = 12.sp,
                        color = NeonOrange400
                    )
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(uiState.subscriptionPlans) { plan ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Asphalt800),
                            border = BorderStroke(1.dp, if (plan.isHighlighted) RacingYellow500 else Asphalt700),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = plan.title,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Stone100
                                    )
                                    Surface(
                                        color = if (plan.isHighlighted) RacingYellow500 else Asphalt700,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            text = plan.badge,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Black,
                                            color = if (plan.isHighlighted) Asphalt950 else Stone100,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = plan.subtitle,
                                    fontSize = 11.sp,
                                    color = Stone400
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = plan.price,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RacingYellow500
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                plan.benefits.forEach { b ->
                                    Text(text = "• $b", fontSize = 11.sp, color = Stone400)
                                }
                            }
                        }
                    }
                }
            }
        )
    }

    // MODAL: LOCATION SEARCH PICKER
    if (showLocationPickerModal) {
        AlertDialog(
            onDismissRequest = { showLocationPickerModal = false },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showLocationPickerModal = false }) {
                    Text("Cerrar", color = Stone400)
                }
            },
            containerColor = Asphalt900,
            title = {
                Text(
                    text = "¿Para dónde nos vamos en ${uiState.currentState.name}?",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    color = Stone100
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("location_search_input"),
                        placeholder = { Text("Buscar calle, plaza, centro comercial...", color = Stone400, fontSize = 12.sp) },
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null, tint = RacingYellow500)
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = RacingYellow500,
                            unfocusedBorderColor = Asphalt700,
                            focusedTextColor = Stone100,
                            unfocusedTextColor = Stone100
                        ),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "DESTINOS EN ${uiState.selectedCityName.uppercase()}:",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = Stone400
                    )

                    val filteredList = uiState.currentPopularLocations.filter {
                        it.title.contains(searchQuery, ignoreCase = true) ||
                                it.subtitle.contains(searchQuery, ignoreCase = true)
                    }

                    LazyColumn(
                        modifier = Modifier.height(240.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(filteredList) { point ->
                            Card(
                                onClick = {
                                    viewModel.updateDestination(point)
                                    showLocationPickerModal = false
                                },
                                colors = CardDefaults.cardColors(containerColor = Asphalt800),
                                border = BorderStroke(1.dp, Asphalt700),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = NeonOrange400,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            text = point.title,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Stone100
                                        )
                                        Text(
                                            text = point.subtitle,
                                            fontSize = 11.sp,
                                            color = Stone400
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        )
    }

    // MODAL: REPORT COMMUNITY ALERT
    CommunityReportDialog(
        isOpen = uiState.showReportDialog,
        onDismiss = { viewModel.showReportModal(false) },
        onSubmit = { type, note, loc ->
            viewModel.submitCommunityReport(type, note, loc)
        },
        defaultLocation = uiState.origin.title
    )
}

/**
 * Compact service card matching the user's uploaded reference screenshot:
 * Shows Icon in a circle, Title, Subtitle, Price in $ and Bs., and selected yellow glowing border.
 */
@Composable
fun CompactServiceRowCard(
    title: String,
    subtitle: String,
    priceUsd: Double,
    priceBs: Double,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBgColor: Color,
    iconColor: Color,
    isSelected: Boolean,
    onClick: () -> Unit,
    testTag: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .testTag(testTag),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt950),
        border = BorderStroke(
            width = if (isSelected) 1.8.dp else 1.dp,
            color = if (isSelected) RacingYellow500 else Asphalt700
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Service Icon Circle
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(if (isSelected) RacingYellow500 else iconBgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = if (isSelected) Asphalt950 else iconColor,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            // Service Title and Subtitle
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = Stone400
                )
            }

            // Dual Currency Pricing ($ and Bs.)
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$${String.format(java.util.Locale.US, "%.2f", priceUsd).replace('.', ',')}",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    color = Stone100
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Bs. ${String.format(java.util.Locale.US, "%,.0f", priceBs).replace(',', '.')}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Stone400
                )
            }
        }
    }
}

@Composable
fun UpcomingServiceItem(
    service: UpcomingService,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clickable { onClick() }
            .testTag("upcoming_service_${service.id}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt950),
        border = BorderStroke(1.dp, Asphalt700)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Asphalt800),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = service.title,
                        tint = NeonOrange400,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Surface(
                    color = Asphalt800,
                    shape = RoundedCornerShape(6.dp),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Text(
                        text = "Próximamente",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = RacingYellow500,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = service.title,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = Stone100,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = service.subtitle,
                fontSize = 10.sp,
                color = Stone400,
                lineHeight = 13.sp,
                maxLines = 2
            )
        }
    }
}
