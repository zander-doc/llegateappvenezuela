package com.llegate.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CompassCalibration
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.llegate.model.CommunityAlert
import com.llegate.model.CommunityAlertType
import com.llegate.model.LocationPoint
import com.llegate.model.MapDisplayMode
import com.llegate.model.NearbyVehicle
import com.llegate.model.ServiceType
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
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun DynamicGpsMap(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier,
    isExpandedMap: Boolean = false,
    onExpandToggle: (() -> Unit)? = null
) {
    var zoomScale by remember { mutableFloatStateOf(1.0f) }
    var panOffset by remember { mutableStateOf(Offset.Zero) }

    // Pulse animations for GPS aura and radar sweep
    val infiniteTransition = rememberInfiniteTransition(label = "mapAnimations")
    val pulseRadius by infiniteTransition.animateFloat(
        initialValue = 10f,
        targetValue = 28f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "gpsPulseRadius"
    )
    val radarAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "radarAngle"
    )

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(if (isExpandedMap) 0.dp else 20.dp))
            .border(
                BorderStroke(1.dp, if (isExpandedMap) Color.Transparent else Asphalt700),
                RoundedCornerShape(if (isExpandedMap) 0.dp else 20.dp)
            ),
        color = Asphalt950
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        zoomScale = (zoomScale * zoom).coerceIn(0.75f, 2.8f)
                        panOffset = Offset(
                            x = (panOffset.x + pan.x).coerceIn(-400f, 400f),
                            y = (panOffset.y + pan.y).coerceIn(-300f, 300f)
                        )
                    }
                }
        ) {
            // THE NATIVE CUSTOM VECTOR/GRID CANVAS
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(uiState.nearbyVehicles, uiState.communityAlerts) {
                        detectTapGestures { tapOffset ->
                            // Check if tapped near an alert
                            val w = size.width
                            val h = size.height
                            var alertFound: CommunityAlert? = null
                            for (alert in uiState.filteredAlerts) {
                                val ax = (alert.xRatio * w * zoomScale) + panOffset.x + (w * (1 - zoomScale) / 2)
                                val ay = (alert.yRatio * h * zoomScale) + panOffset.y + (h * (1 - zoomScale) / 2)
                                val dist = (tapOffset - Offset(ax, ay)).getDistance()
                                if (dist < 40.dp.toPx()) {
                                    alertFound = alert
                                    break
                                }
                            }
                            if (alertFound != null) {
                                viewModel.selectMapAlert(alertFound)
                                return@detectTapGestures
                            }

                            // Check if tapped near a vehicle
                            var vehicleFound: NearbyVehicle? = null
                            for (vehicle in uiState.nearbyVehicles) {
                                val vx = (vehicle.xRatio * w * zoomScale) + panOffset.x + (w * (1 - zoomScale) / 2)
                                val vy = (vehicle.yRatio * h * zoomScale) + panOffset.y + (h * (1 - zoomScale) / 2)
                                val dist = (tapOffset - Offset(vx, vy)).getDistance()
                                if (dist < 40.dp.toPx()) {
                                    vehicleFound = vehicle
                                    break
                                }
                            }
                            if (vehicleFound != null) {
                                viewModel.selectVehicle(vehicleFound)
                            } else {
                                // Clear selections
                                viewModel.selectMapAlert(null)
                                viewModel.selectVehicle(null)
                            }
                        }
                    }
            ) {
                val w = size.width
                val h = size.height

                // Draw Background according to MapDisplayMode
                drawMapBackground(
                    mode = uiState.mapDisplayMode,
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset,
                    radarAngle = radarAngle
                )

                // Draw Venezuelan Urban Arterial Road Network (e.g. ARC, Av. Bolívar, Av. Las Delicias)
                drawRoadNetwork(
                    mode = uiState.mapDisplayMode,
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset
                )

                // Draw Active Trip Route Path (Connecting Origin to Destination)
                drawActiveTripRoute(
                    origin = uiState.origin,
                    destination = uiState.destination,
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset
                )

                // Draw Community Road Incident Alerts
                drawCommunityAlerts(
                    alerts = uiState.filteredAlerts,
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset,
                    selectedAlert = uiState.selectedMapAlert
                )

                // Draw Nearby Moving Motos and Taxis
                drawNearbyVehicles(
                    vehicles = uiState.nearbyVehicles,
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset,
                    selectedVehicle = uiState.selectedVehicle
                )

                // Draw User Current GPS Location Marker with Aura
                drawUserLocation(
                    w = w,
                    h = h,
                    zoom = zoomScale,
                    pan = panOffset,
                    pulseRadius = pulseRadius,
                    bearing = uiState.gpsTelemetry.bearingDegrees
                )
            }

            // TOP FLOATING TELEMETRY & MODE SWITCHER HUD
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                // Glassmorphic Telemetry Bar
                Surface(
                    color = Asphalt900.copy(alpha = 0.92f),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Asphalt700),
                    shadowElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // GPS Accuracy & Satellites Badge
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Emerald500)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "GPS DUAL-BAND • ±${uiState.gpsTelemetry.accuracyMeters}m",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Emerald500
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "(${uiState.gpsTelemetry.satellitesCount} Sats)",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Stone400
                                )
                            }

                            // Compass & City Badge
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.CompassCalibration,
                                    contentDescription = "Rumbo",
                                    tint = RacingYellow500,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${uiState.gpsTelemetry.bearingDegrees.toInt()}° NE",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = RacingYellow500
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "• ${uiState.currentState.name}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Stone300
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Interactive Map Mode Selector Chips
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            MapDisplayMode.values().forEach { mode ->
                                val isSelected = uiState.mapDisplayMode == mode
                                Surface(
                                    onClick = { viewModel.setMapDisplayMode(mode) },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) RacingYellow500 else Asphalt800,
                                    border = BorderStroke(1.dp, if (isSelected) RacingYellow500 else Asphalt700),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        text = mode.shortLabel,
                                        fontSize = 10.sp,
                                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                                        color = if (isSelected) Asphalt950 else Stone300,
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // RIGHT FLOATING MAP CONTROLS (ZOOM, RECENTER, FULLSCREEN)
            Column(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Zoom In
                Surface(
                    onClick = { zoomScale = (zoomScale + 0.25f).coerceAtMost(2.8f) },
                    shape = CircleShape,
                    color = Asphalt900.copy(alpha = 0.9f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.size(38.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Add, "Acercar", tint = Stone100, modifier = Modifier.size(18.dp))
                    }
                }

                // Zoom Out
                Surface(
                    onClick = { zoomScale = (zoomScale - 0.25f).coerceAtLeast(0.75f) },
                    shape = CircleShape,
                    color = Asphalt900.copy(alpha = 0.9f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier.size(38.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Remove, "Alejar", tint = Stone100, modifier = Modifier.size(18.dp))
                    }
                }

                // Recenter on user
                Surface(
                    onClick = {
                        panOffset = Offset.Zero
                        zoomScale = 1.0f
                        viewModel.recenterMapOnUser()
                    },
                    shape = CircleShape,
                    color = RacingYellow500,
                    modifier = Modifier
                        .size(38.dp)
                        .testTag("recenter_map_button")
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.MyLocation, "Centrar", tint = Asphalt950, modifier = Modifier.size(20.dp))
                    }
                }

                // Fullscreen expand toggle
                if (onExpandToggle != null) {
                    Surface(
                        onClick = onExpandToggle,
                        shape = CircleShape,
                        color = Asphalt900.copy(alpha = 0.9f),
                        border = BorderStroke(1.dp, Asphalt700),
                        modifier = Modifier.size(38.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                if (isExpandedMap) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                "Expandir mapa",
                                tint = Stone100,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // BOTTOM FLOATING HUD: QUICK COMMUNITY REPORT & LIVE FLEET PILL
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Live active vehicles badge
                Surface(
                    color = Asphalt900.copy(alpha = 0.92f),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Asphalt700)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.TwoWheeler,
                            contentDescription = null,
                            tint = RacingYellow500,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${uiState.nearbyVehicles.count { it.serviceType == ServiceType.MOTO }} motos",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "•", color = Asphalt600)
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = NeonOrange400,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${uiState.nearbyVehicles.count { it.serviceType == ServiceType.CAR }} carros",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone100
                        )
                    }
                }

                // 1-TAP "REPORTAR EN VÍA" COMMUNITY BUTTON
                Button(
                    onClick = { viewModel.showReportModal(true) },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonOrange500),
                    shape = RoundedCornerShape(16.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                    modifier = Modifier.testTag("report_road_incident_button")
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Reportar en vía",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                }
            }

            // POPUP OVERLAY: SELECTED VEHICLE DETAILS
            AnimatedVisibility(
                visible = uiState.selectedVehicle != null,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(12.dp)
            ) {
                uiState.selectedVehicle?.let { vehicle ->
                    SelectedVehicleCard(
                        vehicle = vehicle,
                        onClose = { viewModel.selectVehicle(null) },
                        onBook = {
                            viewModel.openBooking(vehicle.serviceType)
                        }
                    )
                }
            }

            // POPUP OVERLAY: SELECTED COMMUNITY ALERT DETAILS
            AnimatedVisibility(
                visible = uiState.selectedMapAlert != null,
                enter = slideInVertically { it } + fadeIn(),
                exit = slideOutVertically { it } + fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(12.dp)
            ) {
                uiState.selectedMapAlert?.let { alert ->
                    SelectedCommunityAlertCard(
                        alert = alert,
                        onClose = { viewModel.selectMapAlert(null) },
                        onConfirm = { viewModel.confirmCommunityAlert(alert.id) },
                        onDismiss = { viewModel.dismissCommunityAlert(alert.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun SelectedVehicleCard(
    vehicle: NearbyVehicle,
    onClose: () -> Unit,
    onBook: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.5.dp, if (vehicle.serviceType == ServiceType.MOTO) RacingYellow500 else NeonOrange500),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
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
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                if (vehicle.serviceType == ServiceType.MOTO) RacingYellow500 else NeonOrange500
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (vehicle.serviceType == ServiceType.MOTO) Icons.Default.TwoWheeler else Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = if (vehicle.serviceType == ServiceType.MOTO) Asphalt950 else Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "${vehicle.driverName} • ${vehicle.vehicleModel}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Text(
                            text = "Placa: ${vehicle.plate} • A ${vehicle.etaMinutes} min de ti",
                            fontSize = 11.sp,
                            color = Stone400
                        )
                    }
                }
                IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Stone400)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Button(
                onClick = onBook,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (vehicle.serviceType == ServiceType.MOTO) RacingYellow500 else NeonOrange500
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "¡Pedir viaje con este pana!",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = if (vehicle.serviceType == ServiceType.MOTO) Asphalt950 else Color.White
                )
            }
        }
    }
}

@Composable
private fun SelectedCommunityAlertCard(
    alert: CommunityAlert,
    onClose: () -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Asphalt900),
        border = BorderStroke(1.5.dp, RacingRed500),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = alert.type.emoji, fontSize = 22.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = alert.title,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Stone100
                        )
                        Text(
                            text = "${alert.locationName} • Hace ${alert.reportedMinutesAgo} min",
                            fontSize = 11.sp,
                            color = Stone400
                        )
                    }
                }
                IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Stone400)
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = alert.description,
                fontSize = 12.sp,
                color = Stone300,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Confirmado por ${alert.confirmations} panas",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (alert.userConfirmed) Emerald500 else RacingYellow500
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onConfirm,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (alert.userConfirmed) Emerald500 else Asphalt800
                        ),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.ThumbUp,
                                null,
                                tint = if (alert.userConfirmed) Asphalt950 else Stone100,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (alert.userConfirmed) "Confirmado" else "¡Sigue ahí!",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (alert.userConfirmed) Asphalt950 else Stone100
                            )
                        }
                    }

                    Button(
                        onClick = onDismiss,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Asphalt800),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text(
                            text = "Ya se despejó",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Stone300
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------
// DRAWING ENGINE ON CANVAS (HIGH PERFORMANCE 60 FPS)
// -------------------------------------------------------------

private fun DrawScope.drawMapBackground(
    mode: MapDisplayMode,
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset,
    radarAngle: Float
) {
    // Solid deep asphalt canvas background
    drawRect(color = Color(0xFF090D14))

    // City grid blocks / districts
    val gridColor = when (mode) {
        MapDisplayMode.LIVE_TRAFFIC -> Color(0xFF131A26)
        MapDisplayMode.RADAR_SCAN -> Color(0xFF0C191B)
        MapDisplayMode.URBAN_NIGHT -> Color(0xFF0D121F)
        MapDisplayMode.SATELLITE_HYBRID -> Color(0xFF111E2E)
    }

    val stepX = 70f * zoom
    val stepY = 55f * zoom
    val startX = (pan.x % stepX)
    val startY = (pan.y % stepY)

    var x = startX - stepX
    while (x < w + stepX) {
        drawLine(
            color = gridColor,
            start = Offset(x, 0f),
            end = Offset(x, h),
            strokeWidth = 1f
        )
        x += stepX
    }

    var y = startY - stepY
    while (y < h + stepY) {
        drawLine(
            color = gridColor,
            start = Offset(0f, y),
            end = Offset(w, y),
            strokeWidth = 1f
        )
        y += stepY
    }

    // Specific Mode Accents:
    if (mode == MapDisplayMode.RADAR_SCAN) {
        val cx = w / 2 + pan.x
        val cy = h / 2 + pan.y
        val maxR = (w.coerceAtLeast(h)) * 0.8f * zoom

        // Draw concentric radar rings
        for (r in listOf(0.25f, 0.5f, 0.75f, 1f)) {
            drawCircle(
                color = Emerald500.copy(alpha = 0.2f),
                radius = maxR * r,
                center = Offset(cx, cy),
                style = Stroke(width = 1.5f)
            )
        }

        // Draw sweeping radar beam line
        val rad = Math.toRadians(radarAngle.toDouble())
        val beamX = cx + (maxR * cos(rad)).toFloat()
        val beamY = cy + (maxR * sin(rad)).toFloat()
        drawLine(
            brush = Brush.linearGradient(
                listOf(Emerald500.copy(alpha = 0.8f), Emerald500.copy(alpha = 0.05f)),
                start = Offset(cx, cy),
                end = Offset(beamX, beamY)
            ),
            start = Offset(cx, cy),
            end = Offset(beamX, beamY),
            strokeWidth = 2.5f
        )
    } else if (mode == MapDisplayMode.SATELLITE_HYBRID) {
        // Satellite target reticles
        val cx = w / 2 + pan.x
        val cy = h / 2 + pan.y
        drawCircle(
            color = CyanGlow.copy(alpha = 0.25f),
            radius = 120f * zoom,
            center = Offset(cx, cy),
            style = Stroke(width = 1f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f), 0f))
        )
        drawLine(CyanGlow.copy(alpha = 0.3f), Offset(cx - 30f, cy), Offset(cx + 30f, cy), 1.5f)
        drawLine(CyanGlow.copy(alpha = 0.3f), Offset(cx, cy - 30f), Offset(cx, cy + 30f), 1.5f)
    }
}

private fun DrawScope.drawRoadNetwork(
    mode: MapDisplayMode,
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset
) {
    // Transform coordinates
    fun tx(xRatio: Float) = (xRatio * w * zoom) + pan.x + (w * (1 - zoom) / 2)
    fun ty(yRatio: Float) = (yRatio * h * zoom) + pan.y + (h * (1 - zoom) / 2)

    val arterialWidth = 8.dp.toPx() * zoom.coerceIn(0.8f, 1.6f)
    val secondaryWidth = 4.dp.toPx() * zoom.coerceIn(0.8f, 1.4f)

    // Arterial 1: Autopista Regional del Centro (Diagonal Expressway)
    val pArc1 = Offset(tx(0.05f), ty(0.20f))
    val pArc2 = Offset(tx(0.50f), ty(0.35f))
    val pArc3 = Offset(tx(0.95f), ty(0.30f))

    val arcPath = Path().apply {
        moveTo(pArc1.x, pArc1.y)
        quadraticTo(pArc2.x, pArc2.y, pArc3.x, pArc3.y)
    }

    // Arterial 2: Av. Bolívar (Main East-West corridor)
    val pBol1 = Offset(tx(0.10f), ty(0.55f))
    val pBol2 = Offset(tx(0.55f), ty(0.58f))
    val pBol3 = Offset(tx(0.90f), ty(0.52f))

    val bolivarPath = Path().apply {
        moveTo(pBol1.x, pBol1.y)
        quadraticTo(pBol2.x, pBol2.y, pBol3.x, pBol3.y)
    }

    // Arterial 3: Av. Las Delicias (North-South avenue)
    val pDel1 = Offset(tx(0.35f), ty(0.08f))
    val pDel2 = Offset(tx(0.40f), ty(0.52f))
    val pDel3 = Offset(tx(0.42f), ty(0.92f))

    val deliciasPath = Path().apply {
        moveTo(pDel1.x, pDel1.y)
        quadraticTo(pDel2.x, pDel2.y, pDel3.x, pDel3.y)
    }

    // Arterial 4: Av. Constitución (Parallel south corridor)
    val pCon1 = Offset(tx(0.15f), ty(0.72f))
    val pCon2 = Offset(tx(0.85f), ty(0.75f))

    // Base road asphalt foundation
    drawPath(arcPath, Asphalt800, style = Stroke(width = arterialWidth + 4f))
    drawPath(bolivarPath, Asphalt800, style = Stroke(width = arterialWidth + 4f))
    drawPath(deliciasPath, Asphalt800, style = Stroke(width = arterialWidth + 4f))
    drawLine(Asphalt800, pCon1, pCon2, strokeWidth = secondaryWidth + 4f)

    // Mode-specific road colors: LIVE_TRAFFIC highlights segments with traffic heat
    if (mode == MapDisplayMode.LIVE_TRAFFIC) {
        // Fast flow segment on ARC (Emerald)
        drawPath(arcPath, Emerald500.copy(alpha = 0.85f), style = Stroke(width = arterialWidth))

        // Moderate traffic on Av. Las Delicias (Racing Yellow)
        drawPath(deliciasPath, RacingYellow500.copy(alpha = 0.85f), style = Stroke(width = arterialWidth))

        // Heavy traffic / Cola on Av. Bolívar near center (Racing Red)
        drawPath(bolivarPath, RacingRed500.copy(alpha = 0.85f), style = Stroke(width = arterialWidth))

        // Moderate on Constitución
        drawLine(RacingYellow500.copy(alpha = 0.7f), pCon1, pCon2, strokeWidth = secondaryWidth)
    } else {
        // Subtle clean arterial outline
        val roadColor = Color(0xFF263345)
        drawPath(arcPath, roadColor, style = Stroke(width = arterialWidth))
        drawPath(bolivarPath, roadColor, style = Stroke(width = arterialWidth))
        drawPath(deliciasPath, roadColor, style = Stroke(width = arterialWidth))
        drawLine(roadColor, pCon1, pCon2, strokeWidth = secondaryWidth)
    }
}

private fun DrawScope.drawActiveTripRoute(
    origin: LocationPoint,
    destination: LocationPoint,
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset
) {
    fun tx(xRatio: Float) = (xRatio * w * zoom) + pan.x + (w * (1 - zoom) / 2)
    fun ty(yRatio: Float) = (yRatio * h * zoom) + pan.y + (h * (1 - zoom) / 2)

    val pOrig = Offset(tx(0.48f), ty(0.55f))
    val pMid = Offset(tx(0.60f), ty(0.45f))
    val pDest = Offset(tx(0.70f), ty(0.38f))

    val routePath = Path().apply {
        moveTo(pOrig.x, pOrig.y)
        quadraticTo(pMid.x, pMid.y, pDest.x, pDest.y)
    }

    // Glowing road corridor
    drawPath(
        path = routePath,
        color = NeonOrange500.copy(alpha = 0.25f),
        style = Stroke(width = 14f * zoom.coerceIn(0.8f, 1.5f))
    )
    drawPath(
        path = routePath,
        color = NeonOrange500,
        style = Stroke(width = 5f * zoom.coerceIn(0.8f, 1.5f))
    )

    // Destination Pin
    drawCircle(RacingYellow500.copy(alpha = 0.35f), radius = 16f, center = pDest)
    drawCircle(RacingYellow500, radius = 9f, center = pDest)
    drawCircle(Asphalt950, radius = 4f, center = pDest)
}

private fun DrawScope.drawCommunityAlerts(
    alerts: List<CommunityAlert>,
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset,
    selectedAlert: CommunityAlert?
) {
    fun tx(xRatio: Float) = (xRatio * w * zoom) + pan.x + (w * (1 - zoom) / 2)
    fun ty(yRatio: Float) = (yRatio * h * zoom) + pan.y + (h * (1 - zoom) / 2)

    for (alert in alerts) {
        val pos = Offset(tx(alert.xRatio), ty(alert.yRatio))
        val isSelected = selectedAlert?.id == alert.id

        val alertColor = when (alert.type) {
            CommunityAlertType.POLICE_CHECKPOINT -> Color(0xFF3B82F6) // Blue
            CommunityAlertType.POTHOLE -> NeonOrange500
            CommunityAlertType.TRAFFIC_JAM -> RacingRed500
            CommunityAlertType.GAS_STATION -> Emerald500
            CommunityAlertType.HEAVY_RAIN -> CyanGlow
        }

        // Pulse aura
        drawCircle(
            color = alertColor.copy(alpha = if (isSelected) 0.5f else 0.25f),
            radius = if (isSelected) 22f else 16f,
            center = pos
        )

        // Main Pin Circle
        drawCircle(
            color = Asphalt950,
            radius = if (isSelected) 14f else 11f,
            center = pos
        )
        drawCircle(
            color = alertColor,
            radius = if (isSelected) 12f else 9f,
            center = pos
        )
        drawCircle(
            color = Color.White,
            radius = 3.5f,
            center = pos
        )
    }
}

private fun DrawScope.drawNearbyVehicles(
    vehicles: List<NearbyVehicle>,
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset,
    selectedVehicle: NearbyVehicle?
) {
    fun tx(xRatio: Float) = (xRatio * w * zoom) + pan.x + (w * (1 - zoom) / 2)
    fun ty(yRatio: Float) = (yRatio * h * zoom) + pan.y + (h * (1 - zoom) / 2)

    for (vehicle in vehicles) {
        val pos = Offset(tx(vehicle.xRatio), ty(vehicle.yRatio))
        val isSelected = selectedVehicle?.id == vehicle.id

        val vehicleColor = if (vehicle.serviceType == ServiceType.MOTO) RacingYellow500 else NeonOrange500

        // Highlight ring if selected
        if (isSelected) {
            drawCircle(
                color = vehicleColor.copy(alpha = 0.4f),
                radius = 24f,
                center = pos
            )
        }

        // Vehicle badge
        drawCircle(
            color = Asphalt950,
            radius = if (isSelected) 14f else 10f,
            center = pos
        )
        drawCircle(
            color = vehicleColor,
            radius = if (isSelected) 11f else 8f,
            center = pos
        )

        // Heading directional arrow pointer
        rotate(degrees = vehicle.bearingDegrees, pivot = pos) {
            val arrowPath = Path().apply {
                moveTo(pos.x, pos.y - 14f)
                lineTo(pos.x + 5f, pos.y - 7f)
                lineTo(pos.x - 5f, pos.y - 7f)
                close()
            }
            drawPath(arrowPath, color = vehicleColor)
        }
    }
}

private fun DrawScope.drawUserLocation(
    w: Float,
    h: Float,
    zoom: Float,
    pan: Offset,
    pulseRadius: Float,
    bearing: Float
) {
    fun tx(xRatio: Float) = (xRatio * w * zoom) + pan.x + (w * (1 - zoom) / 2)
    fun ty(yRatio: Float) = (yRatio * h * zoom) + pan.y + (h * (1 - zoom) / 2)

    // User is located around (0.48f, 0.55f) on the map canvas
    val center = Offset(tx(0.48f), ty(0.55f))

    // Directional heading cone (flashlight effect)
    rotate(degrees = bearing, pivot = center) {
        val conePath = Path().apply {
            moveTo(center.x, center.y)
            lineTo(center.x - 30f, center.y - 65f)
            lineTo(center.x + 30f, center.y - 65f)
            close()
        }
        drawPath(
            path = conePath,
            brush = Brush.verticalGradient(
                listOf(CyanGlow.copy(alpha = 0.35f), CyanGlow.copy(alpha = 0.0f)),
                startY = center.y,
                endY = center.y - 65f
            )
        )
    }

    // Dynamic pulsating GPS accuracy aura ring
    drawCircle(
        color = CyanGlow.copy(alpha = 0.2f),
        radius = pulseRadius * zoom.coerceIn(0.8f, 1.4f),
        center = center
    )

    // Outer white halo
    drawCircle(
        color = Color.White,
        radius = 12f,
        center = center
    )

    // Inner bright Cyan / Emerald Core
    drawCircle(
        color = CyanGlow,
        radius = 9f,
        center = center
    )

    // Center focal point
    drawCircle(
        color = Asphalt950,
        radius = 3.5f,
        center = center
    )
}
