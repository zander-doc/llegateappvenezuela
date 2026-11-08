package com.llegate.ui.components

import android.annotation.SuppressLint
import android.Manifest
import android.content.pm.PackageManager
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.compose.ui.viewinterop.AndroidView
import com.llegate.model.LocationPoint
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Emerald500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel

/**
 * Leaflet map with Esri dark/imagery layers, visible attribution and real road geometry
 * from OSRM. Destination selection is disabled while displaying a completed trip.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun LeafletDarkMapView(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier,
    isExpanded: Boolean = false,
    onExpandToggle: (() -> Unit)? = null,
    enableDestinationSelection: Boolean = true
) {
    val context = LocalContext.current
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var isMapLoaded by remember { mutableStateOf(false) }
    var isSatellite by remember { mutableStateOf(false) }
    var routeStatus by remember { mutableStateOf("Calculando ruta vial…") }

    val origin = uiState.origin
    val destination = uiState.destination
    // Update map route when origin or destination changes
    LaunchedEffect(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
        isMapLoaded
    ) {
        if (isMapLoaded && webViewInstance != null) {
            val script = "if (window.updateRoute) { window.updateRoute(${origin.lat}, ${origin.lng}, ${destination.lat}, ${destination.lng}); }"
            webViewInstance?.evaluateJavascript(script, null)
        }
    }

    LaunchedEffect(enableDestinationSelection, isMapLoaded) {
        if (isMapLoaded) {
            webViewInstance?.evaluateJavascript(
                "window.setDestinationSelectionEnabled($enableDestinationSelection);",
                null
            )
        }
    }

    val gpsPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.any { it }) {
            viewModel.requestCurrentGpsLocation(context) { point ->
                webViewInstance?.evaluateJavascript("window.recenterMap(${point.lat}, ${point.lng});", null)
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webViewInstance?.apply {
                stopLoading()
                removeJavascriptInterface("AndroidBridge")
                destroy()
            }
            webViewInstance = null
            isMapLoaded = false
        }
    }

    Box(
        modifier = modifier
            .clip(if (isExpanded) RoundedCornerShape(0.dp) else RoundedCornerShape(18.dp))
            .background(Asphalt950)
            .border(
                1.dp,
                if (isExpanded) Color.Transparent else Asphalt700,
                if (isExpanded) RoundedCornerShape(0.dp) else RoundedCornerShape(18.dp)
            )
            .testTag("leaflet_dark_map_container")
    ) {
        // Embedded Leaflet WebView
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(0xFF07090C.toInt())
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        loadWithOverviewMode = true
                        useWideViewPort = true
                        displayZoomControls = false
                        builtInZoomControls = false
                        allowFileAccess = false
                    }
                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isMapLoaded = true
                        }
                    }

                    val mapView = this
                    addJavascriptInterface(
                        MapDestinationBridge(
                            onMapClicked = { lat, lng ->
                                mapView.post {
                                    viewModel.updateDestinationFromMap(context, lat, lng)
                                }
                            },
                            onRouteDistance = { distanceKm ->
                                mapView.post { viewModel.updateRoadRouteDistance(distanceKm) }
                            },
                            onRouteStatus = { status ->
                                mapView.post { routeStatus = status }
                            }
                        ),
                        "AndroidBridge"
                    )

                    val htmlContent = generateLeafletHtml(
                        originLat = origin.lat,
                        originLng = origin.lng,
                        destLat = destination.lat,
                        destLng = destination.lng,
                        isExpanded = isExpanded,
                        enableDestinationSelection = enableDestinationSelection
                    )
                    // El HTML es propio y todos sus recursos usan URL absolutas, así que no necesita dominio base.
                    loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
                    webViewInstance = this
                }
            },
            update = { view ->
                webViewInstance = view
            }
        )

        // Loading overlay until tiles initialize
        AnimatedVisibility(
            visible = !isMapLoaded,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Surface(
                color = Asphalt900.copy(alpha = 0.85f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Asphalt700)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = RacingYellow500
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Cargando mapa…",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Stone100
                    )
                }
            }
        }

        // FLOATING MAP CONTROLS ON THE RIGHT (AS SHOWN IN ATTACHED SCREENSHOT)
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(end = 16.dp, top = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // ZOOM IN BUTTON (+)
            Surface(
                onClick = {
                    webViewInstance?.evaluateJavascript("if (window.zoomInMap) { window.zoomInMap(); }", null)
                },
                shape = RoundedCornerShape(10.dp),
                color = Asphalt900.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, Asphalt700),
                modifier = Modifier
                    .size(40.dp)
                    .testTag("map_zoom_in_button")
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Acercar mapa",
                        tint = Stone100,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // ZOOM OUT BUTTON (-)
            Surface(
                onClick = {
                    webViewInstance?.evaluateJavascript("if (window.zoomOutMap) { window.zoomOutMap(); }", null)
                },
                shape = RoundedCornerShape(10.dp),
                color = Asphalt900.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, Asphalt700),
                modifier = Modifier
                    .size(40.dp)
                    .testTag("map_zoom_out_button")
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Remove,
                        contentDescription = "Alejar mapa",
                        tint = Stone100,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // RECENTER TO CURRENT GPS LOCATION (TARGET RETICLE)
            Surface(
                onClick = {
                    val hasFine = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    val hasCoarse = ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    val recenter: (LocationPoint) -> Unit = { point ->
                        webViewInstance?.evaluateJavascript("window.recenterMap(${point.lat}, ${point.lng});", null)
                    }
                    if (hasFine || hasCoarse) {
                        viewModel.requestCurrentGpsLocation(context, recenter)
                    } else {
                        gpsPermissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                },
                shape = RoundedCornerShape(10.dp),
                color = Asphalt900.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, RacingYellow500),
                modifier = Modifier
                    .size(40.dp)
                    .testTag("map_recenter_gps_button")
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.MyLocation,
                        contentDescription = "Mi ubicación GPS",
                        tint = RacingYellow500,
                        modifier = Modifier.size(19.dp)
                    )
                }
            }

            Surface(
                onClick = {
                    isSatellite = !isSatellite
                    webViewInstance?.evaluateJavascript("window.setSatelliteLayer($isSatellite);", null)
                },
                shape = RoundedCornerShape(10.dp),
                color = Asphalt900.copy(alpha = 0.92f),
                border = BorderStroke(1.dp, Asphalt700),
                modifier = Modifier.size(40.dp).testTag("map_toggle_layer_button")
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Layers,
                        contentDescription = if (isSatellite) "Mostrar mapa nocturno" else "Mostrar satélite",
                        tint = if (isSatellite) Emerald500 else Stone100,
                        modifier = Modifier.size(19.dp)
                    )
                }
            }

            // FULLSCREEN TOGGLE BUTTON
            if (onExpandToggle != null) {
                Surface(
                    onClick = onExpandToggle,
                    shape = RoundedCornerShape(10.dp),
                    color = Asphalt900.copy(alpha = 0.92f),
                    border = BorderStroke(1.dp, Asphalt700),
                    modifier = Modifier
                        .size(40.dp)
                        .testTag("map_expand_button")
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                            contentDescription = if (isExpanded) "Minimizar mapa" else "Maximizar mapa",
                            tint = Stone100,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }

        // The destination is visibly editable, and required map attribution stays visible.
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Asphalt950.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, Asphalt700),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 10.dp, bottom = 38.dp)
        ) {
            Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                Text(
                    text = uiState.destination.title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone100,
                    maxLines = 1
                )
                Text(
                    text = if (enableDestinationSelection) "Toca el mapa o arrastra el pin para cambiar destino" else routeStatus,
                    fontSize = 9.sp,
                    color = if (enableDestinationSelection) Emerald500 else Stone400,
                    maxLines = 1
                )
            }
        }
    }
}

/**
 * Generates the Leaflet map. Street geometry and distance come from OSRM; no
 * straight-line route is drawn when routing is unavailable.
 */
private fun generateLeafletHtml(
    originLat: Double,
    originLng: Double,
    destLat: Double,
    destLng: Double,
    isExpanded: Boolean,
    enableDestinationSelection: Boolean
): String {
    val expandedMapBottomPadding = if (isExpanded) 260 else 72

    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        * { box-sizing: border-box; }
        html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #07090C;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
        }
        /* Custom Pulse Origin Marker */
        .origin-marker-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            position: relative;
        }
        .origin-pulse {
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(0, 209, 157, 0.4);
            animation: pulseAura 1.8s infinite ease-out;
        }
        .origin-core {
            position: relative;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #00D19D;
            border: 3px solid #07090C;
            box-shadow: 0 0 12px #00D19D;
        }
        /* Destination pin with a bright, high-contrast accent. */
        .dest-marker-container {
            width: 28px;
            height: 36px;
            display: flex;
            justify-content: center;
        }
        .dest-core {
            width: 22px;
            height: 22px;
            margin-top: 2px;
            border: 3px solid #F7F9FC;
            border-radius: 50% 50% 50% 4px;
            background: #FF3B69;
            box-shadow: 0 2px 12px rgba(255, 59, 105, .6);
            transform: rotate(-45deg);
        }
        /* Vehicle Markers */
        .vehicle-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #0D1017;
            border: 2px solid #FFD200;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
            color: #FFD200;
            font-size: 13px;
            font-weight: bold;
            transition: transform 0.6s ease;
        }
        .vehicle-marker.car {
            border-color: #FF6B00;
            color: #FF6B00;
        }
        @keyframes pulseAura {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
        }
        .leaflet-container {
            background-color: #07090C !important;
        }
        .leaflet-control-attribution {
            background: rgba(8, 12, 20, .84) !important;
            color: #D7DEE8 !important;
            font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #71DCC0 !important; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map, routeGlow, routeLine, originMarker, destMarker, vehiclesLayer;
        var darkLayer, satelliteLayer, imageryReference, darkReference;
        var routeRequestTimer, routeTimeoutTimer, routeController, routeSequence = 0;
        var destinationSelectionEnabled = $enableDestinationSelection;
        var firstRoute = true;
        var currentOrigin = [$originLat, $originLng];
        var currentDest = [$destLat, $destLng];

        function initMap() {
            map = L.map('map', {
                zoomControl: false,
                attributionControl: true,
                fadeAnimation: true,
                inertia: true
            }).setView(currentOrigin, 14);

            darkLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 19,
                    attribution: 'Tiles © Esri — Sources: Esri, HERE, Garmin, OpenStreetMap contributors'
                }
            );
            darkReference = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
                { maxZoom: 19, attribution: '' }
            );
            satelliteLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 19,
                    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics and GIS User Community'
                }
            );
            imageryReference = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                { maxZoom: 19, attribution: '' }
            );
            darkLayer.addTo(map);
            darkReference.addTo(map);
            vehiclesLayer = L.layerGroup().addTo(map);
            drawRoute(currentOrigin, currentDest);

            map.on('click', function(e) {
                if (destinationSelectionEnabled) {
                    selectDestination(e.latlng);
                }
            });
        }

        function selectDestination(point) {
            if (window.AndroidBridge && window.AndroidBridge.onMapClicked) {
                window.AndroidBridge.onMapClicked(point.lat, point.lng);
            }
        }

        function ensureMarkers(orig, dest) {
            var originIcon = L.divIcon({
                className: 'origin-div-icon',
                html: '<div class="origin-marker-container"><div class="origin-pulse"></div><div class="origin-core"></div></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            var destIcon = L.divIcon({
                className: 'dest-div-icon',
                html: '<div class="dest-marker-container"><div class="dest-core"></div></div>',
                iconSize: [28, 36],
                iconAnchor: [14, 34]
            });

            if (!originMarker) originMarker = L.marker(orig, { icon: originIcon }).addTo(map);
            else originMarker.setLatLng(orig).setIcon(originIcon);
            if (!destMarker) {
                destMarker = L.marker(dest, {
                    icon: destIcon,
                    draggable: destinationSelectionEnabled,
                    autoPan: true
                }).addTo(map);
                destMarker.on('dragend', function() {
                    if (destinationSelectionEnabled) selectDestination(destMarker.getLatLng());
                });
            } else {
                destMarker.setLatLng(dest).setIcon(destIcon);
                if (destinationSelectionEnabled) destMarker.dragging.enable();
                else destMarker.dragging.disable();
            }
        }

        function clearRoute() {
            if (routeGlow) map.removeLayer(routeGlow);
            if (routeLine) map.removeLayer(routeLine);
            routeGlow = null;
            routeLine = null;
        }

        function updateRouteGeometry() {
            if (routeController) routeController.abort();
            var requestSequence = ++routeSequence;
            clearRoute();
            if (window.AndroidBridge && window.AndroidBridge.onRouteStatus) {
                window.AndroidBridge.onRouteStatus('Calculando ruta vial…');
            }
            if (!(currentOrigin[0] || currentOrigin[1]) || !(currentDest[0] || currentDest[1])) return;

            routeController = new AbortController();
            var routeTimedOut = false;
            clearTimeout(routeTimeoutTimer);
            routeTimeoutTimer = setTimeout(function() {
                routeTimedOut = true;
                routeController.abort();
            }, 12000);
            var url = 'https://router.project-osrm.org/route/v1/driving/' +
                currentOrigin[1] + ',' + currentOrigin[0] + ';' +
                currentDest[1] + ',' + currentDest[0] +
                '?overview=full&geometries=geojson&steps=false';
            fetch(url, { signal: routeController.signal })
                .then(function(response) {
                    if (!response.ok) throw new Error('route_http_' + response.status);
                    return response.json();
                })
                .then(function(data) {
                    if (requestSequence !== routeSequence) return;
                    clearTimeout(routeTimeoutTimer);
                    if (!data.routes || !data.routes.length || data.routes[0].geometry.coordinates.length < 2) {
                        throw new Error('route_not_found');
                    }
                    var route = data.routes[0];
                    var points = route.geometry.coordinates.map(function(point) {
                        return [point[1], point[0]];
                    });
                    routeGlow = L.polyline(points, {
                        color: '#00D19D', weight: 11, opacity: .28,
                        lineCap: 'round', lineJoin: 'round'
                    }).addTo(map);
                    routeLine = L.polyline(points, {
                        color: '#42E6B8', weight: 5, opacity: .96,
                        lineCap: 'round', lineJoin: 'round'
                    }).addTo(map);
                    if (window.AndroidBridge && window.AndroidBridge.onRouteDistance) {
                        window.AndroidBridge.onRouteDistance(route.distance / 1000);
                    }
                    if (window.AndroidBridge && window.AndroidBridge.onRouteStatus) {
                        window.AndroidBridge.onRouteStatus('Ruta por calles');
                    }
                })
                .catch(function(error) {
                    if (requestSequence !== routeSequence) return;
                    clearTimeout(routeTimeoutTimer);
                    if (error.name === 'AbortError' && !routeTimedOut) return;
                    if (window.AndroidBridge && window.AndroidBridge.onRouteDistance) {
                        window.AndroidBridge.onRouteUnavailable();
                    }
                    if (window.AndroidBridge && window.AndroidBridge.onRouteStatus) {
                        window.AndroidBridge.onRouteStatus('Ruta vial no disponible');
                    }
                });
        }

        function drawRoute(orig, dest) {
            ensureMarkers(orig, dest);
            if (routeRequestTimer) clearTimeout(routeRequestTimer);
            routeRequestTimer = setTimeout(updateRouteGeometry, 300);
            if (firstRoute) {
                map.fitBounds(L.latLngBounds([orig, dest]), {
                    paddingTopLeft: [72, 72],
                    paddingBottomRight: [72, $expandedMapBottomPadding],
                    maxZoom: 15
                });
                firstRoute = false;
            }
        }

        window.updateRoute = function(oLat, oLng, dLat, dLng) {
            currentOrigin = [oLat, oLng];
            currentDest = [dLat, dLng];
            drawRoute(currentOrigin, currentDest);
        };

        window.setDestinationSelectionEnabled = function(enabled) {
            destinationSelectionEnabled = !!enabled;
            if (destMarker) {
                if (destinationSelectionEnabled) destMarker.dragging.enable();
                else destMarker.dragging.disable();
            }
        };

        window.setSatelliteLayer = function(enabled) {
            if (!map) return;
            if (enabled) {
                map.removeLayer(darkLayer);
                map.removeLayer(darkReference);
                satelliteLayer.addTo(map);
                imageryReference.addTo(map);
            } else {
                map.removeLayer(satelliteLayer);
                map.removeLayer(imageryReference);
                darkLayer.addTo(map);
                darkReference.addTo(map);
            }
        };

        window.updateVehicles = function(vehicles) {
            if (!vehiclesLayer) return;
            vehiclesLayer.clearLayers();
            vehicles.forEach(function(v) {
                var isMoto = v.type === 'moto';
                var iconHtml = '<div class="vehicle-marker ' + (isMoto ? 'moto' : 'car') + '" style="transform: rotate(' + (v.bearing || 0) + 'deg);">' + (isMoto ? '🛵' : '🚗') + '</div>';
                var vIcon = L.divIcon({
                    className: 'v-icon',
                    html: iconHtml,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });
                var m = L.marker([v.lat, v.lng], { icon: vIcon });
                vehiclesLayer.addLayer(m);
            });
        };

        window.zoomInMap = function() {
            if (map) map.zoomIn();
        };

        window.zoomOutMap = function() {
            if (map) map.zoomOut();
        };

        window.recenterMap = function(lat, lng) {
            if (map) {
                map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
            }
        };

        window.onload = initMap;
    </script>
</body>
</html>
    """.trimIndent()
}

private class MapDestinationBridge(
    private val onMapClicked: (Double, Double) -> Unit,
    private val onRouteDistance: (Double?) -> Unit,
    private val onRouteStatus: (String) -> Unit
) {
    @JavascriptInterface
    fun onMapClicked(lat: Double, lng: Double) {
        if (lat.isFinite() && lng.isFinite() && lat in -90.0..90.0 && lng in -180.0..180.0) {
            onMapClicked.invoke(lat, lng)
        }
    }

    @JavascriptInterface
    fun onRouteDistance(distanceKm: Double) {
        if (distanceKm.isFinite() && distanceKm > 0.0) onRouteDistance.invoke(distanceKm)
    }

    @JavascriptInterface
    fun onRouteUnavailable() {
        onRouteDistance.invoke(null)
    }

    @JavascriptInterface
    fun onRouteStatus(status: String) {
        val safeStatus = when (status) {
            "Calculando ruta vial…", "Ruta por calles", "Ruta vial no disponible" -> status
            else -> "Ruta vial"
        }
        onRouteStatus.invoke(safeStatus)
    }
}
