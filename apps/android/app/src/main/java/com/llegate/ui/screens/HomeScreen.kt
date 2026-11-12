package com.llegate.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import android.widget.Toast
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AirportShuttle
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.LocationCity
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.llegate.R
import com.llegate.BuildConfig
import com.llegate.model.CityInfo
import com.llegate.model.LocationPoint
import com.llegate.model.SafeMeetingPoint
import com.llegate.model.ServiceType
import com.llegate.model.StateRegion
import com.llegate.model.UpcomingService
import com.llegate.network.EstadoPago
import com.llegate.network.Movimiento
import com.llegate.network.PaqueteRecarga
import com.llegate.ui.components.CommunityAlertsSection
import com.llegate.ui.components.MapboxDarkMapScreen
import com.llegate.ui.components.MapDestinationCard
import com.llegate.ui.components.SmartLocationSuggestionsSection
import com.llegate.ui.components.SpeedStripes
import com.llegate.ui.components.UpdateDialog
import com.llegate.ui.components.VehicleCategorySelector
import com.llegate.ui.theme.Asphalt600
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.LlegateBody
import com.llegate.ui.theme.LlegateHeading
import com.llegate.ui.theme.LlegateMono
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
import com.llegate.util.bs
import com.llegate.util.enmascararTelefono
import com.llegate.util.usd
import com.llegate.util.usdConSigno
import com.llegate.utils.UpdateInfo
import com.llegate.utils.UpdateManager
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import com.llegate.viewmodel.PasoRecarga
import org.json.JSONException
import java.io.IOException
import kotlin.math.roundToInt

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
    var showMapVehicleSelector by remember { mutableStateOf(false) }
    var updateInfo by remember { mutableStateOf<UpdateInfo?>(null) }

    LaunchedEffect(Unit) {
        try {
            updateInfo = UpdateManager.checkForUpdates(BuildConfig.VERSION_CODE)
        } catch (exception: IOException) {
            Log.e("HomeScreen", "No se pudo consultar si hay actualizaciones.", exception)
        } catch (exception: JSONException) {
            Log.e("HomeScreen", "La respuesta de actualización no contiene JSON válido.", exception)
        } catch (exception: IllegalArgumentException) {
            Log.e("HomeScreen", "La respuesta de actualización contiene datos inválidos.", exception)
        }
    }

    updateInfo?.let { update ->
        UpdateDialog(
            versionName = update.versionName,
            isMandatory = update.isMandatory,
            onUpdateClick = {
                try {
                    val downloadId = UpdateManager.downloadAndInstallApk(context, update.apkUrl)
                    Log.i("HomeScreen", "Descarga de actualización iniciada: $downloadId")
                    Toast.makeText(
                        context,
                        "Descarga de actualización iniciada.",
                        Toast.LENGTH_LONG
                    ).show()
                    updateInfo = null
                } catch (exception: IllegalArgumentException) {
                    Log.e("HomeScreen", "La URL del APK de actualización no es válida.", exception)
                    Toast.makeText(
                        context,
                        "No se pudo iniciar la actualización.",
                        Toast.LENGTH_LONG
                    ).show()
                } catch (exception: SecurityException) {
                    Log.e("HomeScreen", "No se permitió iniciar la descarga de actualización.", exception)
                    Toast.makeText(
                        context,
                        "No se pudo iniciar la actualización.",
                        Toast.LENGTH_LONG
                    ).show()
                } catch (exception: IllegalStateException) {
                    Log.e("HomeScreen", "El servicio de descargas no está disponible.", exception)
                    Toast.makeText(
                        context,
                        "No se pudo iniciar la actualización.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            },
            onDismiss = { updateInfo = null }
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) {
        viewModel.requestCurrentGpsLocation(context)
    }

    LaunchedEffect(Unit) {
        viewModel.clearDestination()
        val hasFineLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFineLocation || hasCoarseLocation) {
            viewModel.requestCurrentGpsLocation(context)
        } else {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    // FULLSCREEN MAP MODE
    if (uiState.showFullMapExpanded) {
        val selectedEstimate = uiState.selectedEstimate
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Asphalt950)
        ) {
            MapboxDarkMapScreen(modifier = Modifier.fillMaxSize())
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
            if (showMapVehicleSelector) {
                Surface(
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                    color = Asphalt950.copy(alpha = 0.98f),
                    border = BorderStroke(1.dp, Asphalt700),
                    shadowElevation = 16.dp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .heightIn(max = 620.dp)
                        .padding(start = 16.dp, end = 16.dp, bottom = 38.dp)
                        .testTag("map_vehicle_category_selector")
                ) {
                    Column(
                        modifier = Modifier
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        TextButton(onClick = { showMapVehicleSelector = false }) {
                            Text("← Cambiar destino", color = RacingYellow500)
                        }
                        VehicleCategorySelector(
                            selectedCategoryId = uiState.selectedVehicleCategoryId,
                            bcvExchangeRate = uiState.bcvExchangeRate,
                            onCategorySelected = viewModel::selectVehicleCategory,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Button(
                            onClick = { viewModel.openBooking(ServiceType.CAR) },
                            enabled = uiState.selectedVehicleCategoryId != null,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(54.dp)
                                .testTag("map_continue_to_booking"),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = RacingYellow500,
                                contentColor = Asphalt950,
                                disabledContainerColor = Asphalt700,
                                disabledContentColor = Stone400
                            )
                        ) {
                            Text("Continuar con esta categoría", fontWeight = FontWeight.Black)
                        }
                    }
                }
            } else {
                MapDestinationCard(
                    streetName = uiState.destination.title
                            .takeUnless {
                                it.isBlank() ||
                                    it == "Destino en el mapa" ||
                                    it == "Buscando dirección…"
                            }
                        ?: "Destino seleccionado",
                    sectorName = uiState.destination.subtitle
                        .takeUnless { it.isBlank() || it.contains(Regex("-?\\d+\\.\\d+")) }
                        ?: "${uiState.destination.cityName}, ${uiState.destination.stateName}",
                    distanceText = uiState.routeDistanceKm?.let {
                        "Ruta por calles: ${String.format(java.util.Locale.US, "%.1f", it)} km"
                    } ?: "Calculando distancia por calles…",
                    estimatedPriceUsd = selectedEstimate?.priceUsd ?: 0.0,
                    confirmEnabled = selectedEstimate != null,
                    onConfirmClick = {
                        viewModel.selectService(ServiceType.CAR)
                        showMapVehicleSelector = true
                    },
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(start = 16.dp, end = 16.dp, bottom = 38.dp)
                        .testTag("map_destination_confirmation")
                )
            }
        }
        return
    }

    // Main screen with the interactive dark map and floating controls.
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Asphalt950)
    ) {
        if (!uiState.isDriverMode) {
            HomeDashboardScreen(
                userName = uiState.cuenta?.nombre.orEmpty(),
                userBalance = uiState.billetera?.disponibleUsd
                    ?: uiState.cuenta?.saldoBilletera
                    ?: 0.0,
                partners = uiState.automotivePartners,
                showDriverMode = uiState.cuenta?.rol == "conductor",
                onServiceClick = { service ->
                    when (service) {
                        "car" -> {
                            viewModel.selectService(ServiceType.CAR)
                            viewModel.toggleFullMapExpanded(true)
                        }
                        "moto" -> {
                            viewModel.selectService(ServiceType.MOTO)
                            viewModel.toggleFullMapExpanded(true)
                        }
                        "delivery" -> {
                            viewModel.selectService(ServiceType.DELIVERY)
                            viewModel.toggleFullMapExpanded(true)
                        }
                        "schedule", "other" -> viewModel.toggleFullMapExpanded(true)
                        "all" -> viewModel.showCitySelector(true)
                    }
                },
                onSearchClick = { viewModel.toggleFullMapExpanded(true) },
                onRechargeClick = { viewModel.mostrarRecarga(true) },
                onAccountClick = { viewModel.mostrarCuenta(true) },
                onDriverModeClick = { viewModel.toggleDriverMode(true) },
                onTabSelected = { tab ->
                    when (tab) {
                        "inicio" -> viewModel.navigateToHome()
                        "recargas" -> viewModel.mostrarRecarga(true)
                        "historial" -> viewModel.openTripHistory()
                        "perfil" -> viewModel.openProfile()
                    }
                }
            )
        } else {
        // 1. Dark Mapbox map behind the floating HomeScreen controls.
        MapboxDarkMapScreen(
            modifier = Modifier
                .fillMaxWidth()
                .height(410.dp)
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
                // Botón de cuenta: abre la hoja con el saldo real y el cierre de sesión
                Surface(
                    onClick = { viewModel.mostrarCuenta(true) },
                    shape = RoundedCornerShape(16.dp),
                    color = Asphalt950.copy(alpha = 0.90f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.testTag("btn_abrir_cuenta")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Mi cuenta",
                            tint = Stone100,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = uiState.cuenta?.nombre?.trim()?.substringBefore(' ')?.takeIf { it.isNotBlank() }
                                ?: "Mi cuenta",
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
                                    text = uiState.destination.title.ifBlank { "¿A dónde vas?" },
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

            // SERVICE OPTIONS
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "Elige tu servicio",
                        color = Stone100,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val motoPriceUsd = uiState.motoEstimate?.priceUsd ?: 1.81
                        val motoPriceBs = uiState.motoEstimate?.priceBs ?: (1.81 * uiState.bcvExchangeRate)
                        ServiceCard(
                            title = "Moto",
                            priceUsd = motoPriceUsd,
                            priceBs = motoPriceBs,
                            icon = Icons.Default.TwoWheeler,
                            isSelected = uiState.selectedService == ServiceType.MOTO,
                            onClick = { viewModel.selectService(ServiceType.MOTO) },
                            modifier = Modifier.weight(1f),
                            testTag = "service_card_moto"
                        )

                        val carPriceUsd = uiState.carEstimate?.priceUsd ?: 4.62
                        val carPriceBs = uiState.carEstimate?.priceBs ?: (4.62 * uiState.bcvExchangeRate)
                        ServiceCard(
                            title = "Carro",
                            priceUsd = carPriceUsd,
                            priceBs = carPriceBs,
                            icon = Icons.Default.DirectionsCar,
                            isSelected = uiState.selectedService == ServiceType.CAR,
                            onClick = { viewModel.selectService(ServiceType.CAR) },
                            modifier = Modifier.weight(1f),
                            testTag = "service_card_car"
                        )

                        val deliveryPriceUsd = uiState.deliveryEstimate?.priceUsd ?: 1.94
                        val deliveryPriceBs = uiState.deliveryEstimate?.priceBs ?: (1.94 * uiState.bcvExchangeRate)
                        ServiceCard(
                            title = "Envíos",
                            priceUsd = deliveryPriceUsd,
                            priceBs = deliveryPriceBs,
                            icon = Icons.Default.Inventory2,
                            isSelected = uiState.selectedService == ServiceType.DELIVERY,
                            onClick = { viewModel.selectService(ServiceType.DELIVERY) },
                            modifier = Modifier.weight(1f),
                            testTag = "service_card_delivery"
                        )
                    }
                }
            }

            if (uiState.selectedService == ServiceType.MOTO || uiState.selectedService == ServiceType.CAR) {
                item {
                    VehicleCategorySelector(
                        selectedCategoryId = uiState.selectedVehicleCategoryId,
                        bcvExchangeRate = uiState.bcvExchangeRate,
                        onCategorySelected = viewModel::selectVehicleCategory,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }

            // PRIMARY ACTION BUTTON (CONFIRMAR VIAJE / ¡LLÉGATE YA!)
            item {
                Button(
                    onClick = {
                        if (uiState.destination.tieneCoordenadas) {
                            viewModel.openBooking(uiState.selectedService)
                        } else {
                            showLocationPickerModal = true
                        }
                    },
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
                        text = if (uiState.destination.tieneCoordenadas) {
                            "¡Llégate ya! • ${uiState.selectedService.colloquialTitle}"
                        } else {
                            "Elige tu destino"
                        },
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

            // ALERTAS DE LA COMUNIDAD (AÚN SIN ENDPOINT: SE ANUNCIA, NO SE INVENTA)
            item {
                CommunityAlertsSection(modifier = Modifier.padding(top = 6.dp))
            }

            // RESUMEN DE LOS VIAJES QUE CONTESTA GET /trips
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
                                        text = "${uiState.viajes.size} viajes en tu historial",
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

                        uiState.viajes.firstOrNull()?.let { ultimo ->
                            Spacer(modifier = Modifier.height(10.dp))
                            HorizontalDivider(color = Asphalt800, thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))

                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "Último: ${ultimo.origen} → ${ultimo.destino}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Stone200,
                                    maxLines = 1
                                )
                                Text(
                                    text = listOfNotNull(
                                        ultimo.fechaTexto.takeIf { it.isNotEmpty() },
                                        ultimo.estadoTexto,
                                        ultimo.conductor?.nombre?.let { "piloto $it" }
                                    ).joinToString(" • "),
                                    fontSize = 11.sp,
                                    color = Stone400
                                )
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

    // HOJA DE CUENTA: datos reales de /auth/me y /wallet/billetera
    if (uiState.showCuentaModal) {
        val cuenta = uiState.cuenta
        val piloto = cuenta?.conductor
        val billetera = uiState.billetera
        val disponible = billetera?.disponibleUsd ?: cuenta?.saldoBilletera ?: 0.0
        AlertDialog(
            onDismissRequest = { viewModel.mostrarCuenta(false) },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { viewModel.mostrarRecarga(true) },
                        colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
                        modifier = Modifier.testTag("btn_abrir_recarga")
                    ) {
                        Text("Recargar", color = Asphalt950, fontWeight = FontWeight.Black)
                    }
                    Button(
                        onClick = { viewModel.cerrarSesion() },
                        colors = ButtonDefaults.buttonColors(containerColor = RacingRed500),
                        modifier = Modifier.testTag("btn_cerrar_sesion")
                    ) {
                        Text("Cerrar sesión", color = Stone100, fontWeight = FontWeight.Black)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.mostrarCuenta(false) }) {
                    Text("Volver", color = Stone400)
                }
            },
            containerColor = Asphalt900,
            title = {
                Column {
                    Text(
                        text = cuenta?.nombre?.takeIf { it.isNotBlank() } ?: "Mi cuenta",
                        fontWeight = FontWeight.Black,
                        fontFamily = LlegateHeading,
                        fontSize = 18.sp,
                        color = Stone100
                    )
                    Text(
                        text = if (cuenta?.rol == "conductor") "Piloto Llégate" else "Pasajero Llégate",
                        fontSize = 12.sp,
                        color = NeonOrange400
                    )
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    FilaCuenta(etiqueta = "Saldo disponible", valor = usd(disponible), destacado = true, numero = true)
                    if (billetera != null && billetera.reservadoUsd > 0.0) {
                        FilaCuenta(
                            etiqueta = "Reservado por comisiones",
                            valor = usd(billetera.reservadoUsd),
                            numero = true
                        )
                    }
                    if (billetera != null && billetera.estado != "activo") {
                        Text(
                            text = when (billetera.estado) {
                                "saldo_bajo" -> "Te queda poco saldo: recarga antes de pedir un viaje con Saldo Llégate."
                                else -> "Sin saldo disponible. Recarga para pagar viajes desde la app."
                            },
                            fontSize = 11.sp,
                            color = RacingRed500
                        )
                    }
                    if (cuenta?.rol == "cliente") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(
                                onClick = { viewModel.openProfile() },
                                modifier = Modifier.testTag("open_profile")
                            ) {
                                Text("Favoritos", color = NeonOrange400)
                            }
                            TextButton(
                                onClick = { viewModel.openReferrals() },
                                modifier = Modifier.testTag("open_referrals")
                            ) {
                                Text("Invita a tus panas", color = NeonOrange400)
                            }
                        }
                    }
                    Text(
                        text = "La comisión del ${comisionTexto(uiState)} se descuenta del saldo al completar cada viaje. " +
                            "No hay mensualidad. Las recargas empiezan en ${usd(recargaMinimaUi(uiState))} " +
                            "y se aprueban en unos ${slaMinutosUi(uiState)} minutos.",
                        fontSize = 11.sp,
                        color = Stone400
                    )
                    HorizontalDivider(color = Asphalt700)
                    if (billetera != null) {
                        val recientes = uiState.movimientos.take(3)
                        Text(
                            text = if (recientes.isEmpty()) "Aún no hay movimientos." else "Últimos movimientos",
                            fontSize = 11.sp,
                            fontFamily = LlegateBody,
                            color = Stone400
                        )
                        recientes.forEach { FilaMovimiento(it) }
                        HorizontalDivider(color = Asphalt700)
                    }
                    FilaCuenta(
                        etiqueta = "Teléfono",
                        valor = enmascararTelefono(cuenta?.telefono),
                        numero = true
                    )
                    if (piloto != null) {
                        val estadoPiloto = when (piloto.verificacion) {
                            "aprobado" -> "Aprobado y activo"
                            "rechazado" -> "Rechazado"
                            else -> "Por revisar"
                        }
                        FilaCuenta(
                            etiqueta = "Verificación piloto",
                            valor = if (piloto.aprobado) estadoPiloto else "$estadoPiloto • envía tus documentos para conducir"
                        )
                        val vehiculo = listOf(piloto.tipoVehiculo, piloto.placa)
                            .filter { !it.isNullOrBlank() }
                            .joinToString(" • ")
                        if (vehiculo.isNotBlank()) {
                            FilaCuenta(etiqueta = "Vehículo", valor = vehiculo)
                        }
                        if (!piloto.aprobado && !piloto.motivoRechazo.isNullOrBlank()) {
                            Text(
                                text = "Motivo: ${piloto.motivoRechazo}",
                                fontSize = 11.sp,
                                color = RacingRed500
                            )
                        }
                    }
                }
            }
        )
    }

    // HOJA DE RECARGA: /payments/intents + reporte de referencia, igual que la web
    if (uiState.showRecargaModal) {
        RecargaSheet(uiState = uiState, viewModel = viewModel)
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

}

@Composable
fun ServiceCard(
    title: String,
    priceUsd: Double,
    priceBs: Double,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    testTag: String
) {
    Surface(
        onClick = onClick,
        color = if (isSelected) Asphalt800 else Asphalt950,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(
            width = if (isSelected) 1.5.dp else 1.dp,
            color = if (isSelected) RacingYellow500 else Asphalt700
        ),
        modifier = modifier
            .height(112.dp)
            .testTag(testTag)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = if (isSelected) RacingYellow500 else Stone300,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.height(5.dp))
            Text(
                text = title,
                color = Stone100,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1
            )
            Text(
                text = "$${String.format(java.util.Locale.US, "%.2f", priceUsd)}",
                color = if (isSelected) RacingYellow500 else Stone100,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                maxLines = 1
            )
            Text(
                text = "Bs. ${String.format(java.util.Locale.US, "%,.0f", priceBs).replace(',', '.')}",
                color = Stone400,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
        }
    }
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

@Composable
private fun FilaMovimiento(movimiento: Movimiento) {
    val detalle = listOfNotNull(movimiento.fechaTexto.ifBlank { null }, movimiento.estadoTexto)
        .joinToString(" · ")
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.padding(end = 12.dp)) {
            Text(
                text = movimiento.etiqueta,
                fontSize = 12.sp,
                fontFamily = LlegateBody,
                fontWeight = FontWeight.Bold,
                color = Stone100
            )
            if (detalle.isNotBlank()) {
                Text(text = detalle, fontSize = 11.sp, fontFamily = LlegateBody, color = Stone400)
            }
        }
        Text(
            text = usdConSigno(movimiento.montoUsd),
            fontSize = 13.sp,
            fontFamily = LlegateMono,
            fontWeight = FontWeight.Bold,
            color = when {
                movimiento.estadoTexto != null -> RacingYellow500
                movimiento.montoUsd < 0 -> Stone300
                else -> Emerald500
            }
        )
    }
}

@Composable
private fun FilaCuenta(
    etiqueta: String,
    valor: String,
    destacado: Boolean = false,
    numero: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = etiqueta,
            fontSize = 12.sp,
            fontFamily = LlegateBody,
            color = Stone400
        )
        Text(
            text = valor,
            fontFamily = if (numero) LlegateMono else LlegateBody,
            fontSize = if (destacado) 18.sp else 12.sp,
            fontWeight = if (destacado) FontWeight.Black else FontWeight.Bold,
            color = when {
                destacado -> RacingYellow500
                else -> Stone100
            },
            textAlign = TextAlign.End,
            modifier = Modifier.padding(start = 12.dp)
        )
    }
}

/** Las reglas viven en `/config/app`; `/wallet/billetera` trae los mismos números. */
private fun comisionTexto(uiState: LlegateUiState): String {
    val ratio = uiState.config?.walletRules?.commissionRate
        ?: uiState.billetera?.limites?.comisionPorcentaje
        ?: 0.1
    return "${(ratio * 100).roundToInt()}%"
}

private fun recargaMinimaUi(uiState: LlegateUiState): Double =
    uiState.config?.walletRules?.minRechargeUsd
        ?: uiState.billetera?.limites?.recargaMinimaUsd
        ?: 5.0

private fun recargaMaximaUi(uiState: LlegateUiState): Double =
    uiState.config?.walletRules?.maxRechargeUsd
        ?: uiState.billetera?.limites?.recargaMaximaUsd
        ?: 50.0

private fun slaMinutosUi(uiState: LlegateUiState): Int =
    uiState.config?.walletRules?.approvalSlaMinutes
        ?: uiState.billetera?.limites?.slaAprobacionMinutos
        ?: 15

/** Los paquetes los publica la API; si no llegan, se arman con los límites vigentes. */
private fun paquetesDeRecarga(uiState: LlegateUiState): List<PaqueteRecarga> {
    val deLaApi = uiState.config?.rechargePacks.orEmpty()
    if (deLaApi.isNotEmpty()) return deLaApi
    val minima = recargaMinimaUi(uiState)
    return listOf(minima, minima * 2, minima * 4, recargaMaximaUi(uiState))
        .distinct()
        .sorted()
        .map { monto -> PaqueteRecarga(amountUsd = monto, name = usd(monto), note = "", recomendado = false) }
}

@Composable
private fun RecargaSheet(uiState: LlegateUiState, viewModel: LlegateViewModel) {
    val contexto = LocalContext.current
    val pago = uiState.pagoEnCurso
    val paquetes = paquetesDeRecarga(uiState)
    val metodos = uiState.metodosRecarga
    val metodoElegido = metodos.firstOrNull { it.id == uiState.recargaMetodo }
    val sePuedeSeguir = !uiState.enviandoRecarga &&
        metodos.isNotEmpty() &&
        (metodoElegido?.disponible ?: uiState.recargaMetodo == "pago_movil")

    AlertDialog(
        onDismissRequest = { viewModel.mostrarRecarga(false) },
        confirmButton = {
            when (uiState.pasoRecarga) {
                PasoRecarga.MONTO -> Button(
                    onClick = { viewModel.iniciarRecarga() },
                    enabled = sePuedeSeguir,
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
                    modifier = Modifier.testTag("btn_continuar_recarga")
                ) {
                    Text(
                        text = when {
                            uiState.enviandoRecarga -> "Creando el pago..."
                            metodos.isEmpty() -> "Cargando métodos..."
                            metodoElegido != null && !metodoElegido.disponible -> "Método no disponible"
                            else -> "Continuar"
                        },
                        color = if (sePuedeSeguir) Asphalt950 else Stone400,
                        fontWeight = FontWeight.Black
                    )
                }

                PasoRecarga.INSTRUCCIONES -> Button(
                    onClick = { viewModel.irAReportarRecarga() },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
                    modifier = Modifier.testTag("btn_ya_pague")
                ) {
                    Text("Ya pagé", color = Asphalt950, fontWeight = FontWeight.Black)
                }

                PasoRecarga.REPORTAR -> Button(
                    onClick = { viewModel.confirmarRecarga() },
                    enabled = !uiState.enviandoRecarga,
                    colors = ButtonDefaults.buttonColors(containerColor = RacingYellow500),
                    modifier = Modifier.testTag("btn_reportar_recarga")
                ) {
                    Text(
                        text = if (uiState.enviandoRecarga) "Enviando..." else "Reportar recarga",
                        color = Asphalt950,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { viewModel.mostrarRecarga(false) }) {
                Text("Volver", color = Stone400)
            }
        },
        containerColor = Asphalt900,
        title = {
            Column {
                Text(
                    text = "Recargar saldo Llégate",
                    fontWeight = FontWeight.Black,
                    fontFamily = LlegateHeading,
                    fontSize = 18.sp,
                    color = Stone100
                )
                Text(
                    text = when (uiState.pasoRecarga) {
                        PasoRecarga.MONTO -> "De ${usd(recargaMinimaUi(uiState))} a ${usd(recargaMaximaUi(uiState))} por recarga"
                        PasoRecarga.INSTRUCCIONES -> "Paga en tu banco y vuelve con la referencia"
                        PasoRecarga.REPORTAR -> "Escribe la referencia que te dio tu banco"
                    },
                    fontSize = 12.sp,
                    color = NeonOrange400
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                when (uiState.pasoRecarga) {
                    PasoRecarga.MONTO -> {
                        Text("Monto en dólares", fontSize = 12.sp, color = Stone400)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(paquetes, key = { it.amountUsd }) { paquete ->
                                val elegido = paquete.amountUsd == uiState.recargaMontoUsd
                                Surface(
                                    onClick = { viewModel.seleccionarMontoRecarga(paquete.amountUsd) },
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (elegido) RacingYellow500 else Asphalt800,
                                    border = BorderStroke(1.dp, if (elegido) RacingYellow500 else Asphalt700),
                                    modifier = Modifier.testTag("paquete_${paquete.amountUsd.toInt()}")
                                ) {
                                    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                                        Text(
                                            text = usd(paquete.amountUsd),
                                            fontWeight = FontWeight.Bold,
                                            fontFamily = LlegateMono,
                                            fontSize = 15.sp,
                                            color = if (elegido) Asphalt950 else Stone100
                                        )
                                        Text(
                                            text = paquete.name,
                                            fontSize = 11.sp,
                                            color = if (elegido) Asphalt600 else Stone400
                                        )
                                    }
                                }
                            }
                        }

                        Text("Cómo vas a pagar", fontSize = 12.sp, color = Stone400)
                        if (metodos.isEmpty()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(color = RacingYellow500, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Consultando los métodos de la API...", fontSize = 11.sp, color = Stone400)
                            }
                        }
                        metodos.forEach { metodo ->
                            val elegido = metodo.id == uiState.recargaMetodo
                            Surface(
                                onClick = { if (metodo.disponible) viewModel.seleccionarMetodoRecarga(metodo.id) },
                                shape = RoundedCornerShape(12.dp),
                                color = if (elegido) Asphalt800 else Asphalt950,
                                border = BorderStroke(1.dp, if (elegido) NeonOrange500 else Asphalt700),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("metodo_${metodo.id}")
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = when (metodo.id) {
                                            "pago_movil" -> "Pago Móvil"
                                            "binance_pay" -> "Binance Pay"
                                            else -> metodo.id
                                        },
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (metodo.disponible) Stone100 else Stone400
                                    )
                                    Text(
                                        text = when {
                                            !metodo.disponible -> "No disponible ahora"
                                            metodo.revision == "automatica" -> "Se acredita solo"
                                            else -> "Un pana lo revisa (~${slaMinutosUi(uiState)} min)"
                                        },
                                        fontSize = 11.sp,
                                        color = if (metodo.disponible) NeonOrange400 else Stone400
                                    )
                                }
                            }
                        }

                        val pendientes = uiState.pagos.count { it.estado == EstadoPago.PENDIENTE || it.estado == EstadoPago.EN_REVISION }
                        if (pendientes > 0) {
                            Text(
                                text = "Tienes $pendientes recarga(s) en curso. Retomar la última te lleva a donde la dejaste.",
                                fontSize = 11.sp,
                                color = Stone400
                            )
                        }
                    }

                    PasoRecarga.INSTRUCCIONES -> {
                        if (pago == null) {
                            Text("No pudimos abrir la hoja. Toca Volver e inténtalo de nuevo.", fontSize = 12.sp, color = RacingRed500)
                        } else {
                            FilaCuenta(etiqueta = "Código del pago", valor = pago.codigo, destacado = true, numero = true)
                            FilaCuenta(etiqueta = "Monto en dólares", valor = usd(pago.montoUsd), numero = true)
                            if (pago.montoBs != null) {
                                FilaCuenta(etiqueta = "Monto en bolívares", valor = bs(pago.montoBs), numero = true)
                            }
                            if (pago.tasaBs != null) {
                                FilaCuenta(etiqueta = "Tasa del día", valor = "${bs(pago.tasaBs)} por dólar", numero = true)
                            }
                            HorizontalDivider(color = Asphalt700)

                            if (!pago.checkoutUrl.isNullOrBlank()) {
                                Button(
                                    onClick = { viewModel.abrirCheckout(contexto) },
                                    colors = ButtonDefaults.buttonColors(containerColor = RacingYellow500),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("btn_abrir_checkout")
                                ) {
                                    Text("Abrir Binance Pay", color = Asphalt950, fontWeight = FontWeight.Black)
                                }
                                Text(
                                    text = "Cuando el pago se confirme, el saldo entra solo. Si te sales, puedes volver a esta hoja.",
                                    fontSize = 11.sp,
                                    color = Stone400
                                )
                            } else {
                                pago.instrucciones.banco?.let { FilaCuenta(etiqueta = "Banco", valor = it) }
                                pago.instrucciones.telefono?.let { FilaCuenta(etiqueta = "Teléfono", valor = it, numero = true) }
                                pago.instrucciones.cedula?.let { FilaCuenta(etiqueta = "Cédula", valor = it, numero = true) }
                                pago.instrucciones.titular?.let { FilaCuenta(etiqueta = "Titular", valor = it) }
                                Text(
                                    text = pago.instrucciones.nota
                                        ?: "Paga el monto exacto en bolívares y reporta la referencia que te da tu banco.",
                                    fontSize = 11.sp,
                                    color = Stone400
                                )
                            }

                            Text(
                                text = "Vence en unos minutos; si se pasa, pide la recarga de nuevo.",
                                fontSize = 11.sp,
                                color = Stone400
                            )
                            TextButton(
                                onClick = { viewModel.descartarRecarga() },
                                modifier = Modifier.testTag("btn_anular_pago")
                            ) {
                                Text("Anular este pago", color = RacingRed500, fontSize = 12.sp)
                            }
                        }
                    }

                    PasoRecarga.REPORTAR -> {
                        OutlinedTextField(
                            value = uiState.recargaReferencia,
                            onValueChange = { viewModel.onRecargaReferencia(it) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("campo_referencia"),
                            label = { Text("Referencia del Pago Móvil", color = Stone400, fontSize = 12.sp) },
                            textStyle = TextStyle(
                                fontFamily = LlegateMono,
                                fontSize = 18.sp,
                                letterSpacing = 3.sp
                            ),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = RacingYellow500,
                                unfocusedBorderColor = Asphalt700,
                                focusedTextColor = Stone100,
                                unfocusedTextColor = Stone100
                            ),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                        Text(
                            text = "Son 6 a 12 dígitos. Con eso un pana de Llégate verifica el pago en el sistema del banco " +
                                "y te monta el saldo en la billetera.",
                            fontSize = 11.sp,
                            color = Stone400
                        )
                        pago?.let {
                            FilaCuenta(etiqueta = "Recarga", valor = "${usd(it.montoUsd)} • código ${it.codigo}", numero = true)
                        }
                        TextButton(
                            onClick = { viewModel.volverALosDatosDeRecarga() },
                            modifier = Modifier.testTag("btn_volver_datos")
                        ) {
                            Text("Corregir los datos del pago", color = Stone400, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    )
}
