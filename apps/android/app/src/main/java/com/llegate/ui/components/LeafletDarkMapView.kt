package com.llegate.ui.components

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.material.icons.filled.CompassCalibration
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
import androidx.compose.ui.viewinterop.AndroidView
import com.llegate.model.LocationPoint
import com.llegate.ui.theme.Asphalt700
import com.llegate.ui.theme.Asphalt800
import com.llegate.ui.theme.Asphalt900
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.CyanGlow
import com.llegate.ui.theme.NeonOrange500
import com.llegate.ui.theme.RacingYellow500
import com.llegate.ui.theme.Stone100
import com.llegate.ui.theme.Stone400
import com.llegate.viewmodel.LlegateUiState
import com.llegate.viewmodel.LlegateViewModel
import java.util.Locale

/**
 * Modern interactive live map powered by Leaflet.js + OpenStreetMap with CartoDB Dark Matter tiles.
 * Tailored for Llégate App's signature high-contrast dark asphalt and vibrant yellow aesthetic.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun LeafletDarkMapView(
    uiState: LlegateUiState,
    viewModel: LlegateViewModel,
    modifier: Modifier = Modifier,
    isExpanded: Boolean = false,
    onExpandToggle: (() -> Unit)? = null
) {
    val context = LocalContext.current
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var isMapLoaded by remember { mutableStateOf(false) }

    val origin = uiState.origin
    val destination = uiState.destination

    // Update map route when origin or destination changes
    LaunchedEffect(origin.lat, origin.lng, destination.lat, destination.lng, isMapLoaded) {
        if (isMapLoaded && webViewInstance != null) {
            val script = "if (window.updateRoute) { window.updateRoute(${origin.lat}, ${origin.lng}, ${destination.lat}, ${destination.lng}, '${origin.title.replace("'", "\\'")}', '${destination.title.replace("'", "\\'")}'); }"
            webViewInstance?.evaluateJavascript(script, null)
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
                        databaseEnabled = true
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

                    addJavascriptInterface(object : Any() {
                        @JavascriptInterface
                        fun onMapClicked(lat: Double, lng: Double) {
                            // User tapped on the map to set destination
                            val clickedPoint = LocationPoint(
                                title = "Punto en el Mapa (${String.format(Locale.US, "%.3f, %.3f", lat, lng)})",
                                subtitle = "${uiState.selectedCityName}, ${uiState.currentState.name}",
                                lat = lat,
                                lng = lng,
                                stateName = uiState.currentState.name,
                                cityName = uiState.selectedCityName
                            )
                            viewModel.updateDestination(clickedPoint)
                        }

                        @JavascriptInterface
                        fun onMarkerClicked(id: String) {
                            // Safe point or vehicle tapped
                        }
                    }, "AndroidBridge")

                    val htmlContent = generateLeafletHtml(
                        originLat = origin.lat,
                        originLng = origin.lng,
                        originTitle = origin.title,
                        destLat = destination.lat,
                        destLng = destination.lng,
                        destTitle = destination.title
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
                        text = "Conectando CartoDB Dark GPS...",
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
                    viewModel.requestCurrentGpsLocation(context)
                    webViewInstance?.evaluateJavascript(
                        "if (window.recenterMap) { window.recenterMap(${origin.lat}, ${origin.lng}); }",
                        null
                    )
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

        // Subtle live radar telemetry badge on bottom left of map
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Asphalt950.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, Asphalt700),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(10.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(RacingYellow500)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "CartoDB Dark • ${uiState.currentState.name}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Stone400
                )
            }
        }
    }
}

/**
 * Generates pristine HTML template embedding Leaflet 1.9.4 and CartoDB Dark Matter tiles.
 */
private fun generateLeafletHtml(
    originLat: Double,
    originLng: Double,
    originTitle: String,
    destLat: Double,
    destLng: Double,
    destTitle: String
): String {
    val escapedOrigin = originTitle.replace("'", "\\'")
    val escapedDest = destTitle.replace("'", "\\'")

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
            background: rgba(255, 210, 0, 0.4);
            animation: pulseAura 1.8s infinite ease-out;
        }
        .origin-core {
            position: relative;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #FFD200;
            border: 3px solid #07090C;
            box-shadow: 0 0 12px #FFD200;
        }
        /* Destination Square Marker */
        .dest-marker-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        .dest-core {
            width: 14px;
            height: 14px;
            border-radius: 3px;
            background: #FFFFFF;
            border: 3px solid #0D1017;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.9);
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
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        var map, routeGlow, routeLine, originMarker, destMarker, vehiclesLayer;
        var currentOrigin = [$originLat, $originLng];
        var currentDest = [$destLat, $destLng];

        function initMap() {
            map = L.map('map', {
                zoomControl: false,
                attributionControl: false,
                fadeAnimation: true,
                inertia: true
            }).setView(currentOrigin, 14);

            // CARTODB DARK MATTER TILES (High contrast dark mode)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 19,
                minZoom: 4
            }).addTo(map);

            vehiclesLayer = L.layerGroup().addTo(map);

            drawRoute(currentOrigin, currentDest, '$escapedOrigin', '$escapedDest');

            map.on('click', function(e) {
                if (window.AndroidBridge && window.AndroidBridge.onMapClicked) {
                    window.AndroidBridge.onMapClicked(e.latlng.lat, e.latlng.lng);
                }
            });
        }

        function createCurvedRoute(start, end) {
            var points = [];
            points.push(start);
            // Generate intermediate natural curved road points
            var midLat = (start[0] + end[0]) / 2;
            var midLng = (start[1] + end[1]) / 2;
            var offset = 0.003;
            var wp1 = [start[0] * 0.7 + end[0] * 0.3 + offset * 0.6, start[1] * 0.7 + end[1] * 0.3 - offset * 0.4];
            var wp2 = [midLat + offset, midLng + offset * 0.5];
            var wp3 = [start[0] * 0.3 + end[0] * 0.7 - offset * 0.4, start[1] * 0.3 + end[1] * 0.7 + offset * 0.6];
            points.push(wp1);
            points.push(wp2);
            points.push(wp3);
            points.push(end);
            return points;
        }

        function drawRoute(orig, dest, origTitle, destTitle) {
            if (routeGlow) map.removeLayer(routeGlow);
            if (routeLine) map.removeLayer(routeLine);
            if (originMarker) map.removeLayer(originMarker);
            if (destMarker) map.removeLayer(destMarker);

            var path = createCurvedRoute(orig, dest);

            // Glowing vibrant yellow route line
            routeGlow = L.polyline(path, {
                color: '#FFD200',
                weight: 10,
                opacity: 0.32,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);

            routeLine = L.polyline(path, {
                color: '#FFD200',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(map);

            // Origin marker (Yellow glowing circle)
            var originIcon = L.divIcon({
                className: 'origin-div-icon',
                html: '<div class="origin-marker-container"><div class="origin-pulse"></div><div class="origin-core"></div></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            originMarker = L.marker(orig, { icon: originIcon }).addTo(map);

            // Destination marker (White/Dark square)
            var destIcon = L.divIcon({
                className: 'dest-div-icon',
                html: '<div class="dest-marker-container"><div class="dest-core"></div></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            destMarker = L.marker(dest, { icon: destIcon }).addTo(map);

            // Fit bounds with padding so both origin & destination are visible
            var group = new L.featureGroup([originMarker, destMarker, routeLine]);
            map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
        }

        window.updateRoute = function(oLat, oLng, dLat, dLng, oTitle, dTitle) {
            currentOrigin = [oLat, oLng];
            currentDest = [dLat, dLng];
            drawRoute(currentOrigin, currentDest, oTitle, dTitle);
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
