package com.llegate.ui.components

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.llegate.R
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Stone100
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.mapbox.maps.extension.style.style
import com.mapbox.maps.plugin.animation.flyTo
import com.mapbox.maps.plugin.locationcomponent.OnIndicatorPositionChangedListener
import com.mapbox.maps.plugin.locationcomponent.location

@Composable
fun MapboxDarkMapScreen(modifier: Modifier = Modifier) {
    val accessToken = stringResource(R.string.mapbox_access_token)
    if (accessToken.isBlank()) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(Asphalt950),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Configura MAPBOX_ACCESS_TOKEN para cargar Mapbox.",
                color = Stone100,
                modifier = Modifier.padding(24.dp)
            )
        }
        return
    }

    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
        )
    }
    var hasCenteredOnUser by remember { mutableStateOf(false) }
    val mapViewState = remember { mutableStateOf<MapView?>(null) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission =
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    AndroidView(
        modifier = modifier,
        factory = {
            MapView(context).apply {
                mapViewState.value = this
                mapboxMap.setCamera(
                    CameraOptions.Builder()
                        .center(Point.fromLngLat(-67.4894, 10.0386))
                        .zoom(14.5)
                        .build()
                )
                mapboxMap.loadStyle(style(Style.DARK) {})
            }
        },
        update = {}
    )

    val mapView = mapViewState.value
    DisposableEffect(mapView, hasLocationPermission) {
        if (mapView == null || !hasLocationPermission) {
            onDispose {}
        } else {
            val positionListener = OnIndicatorPositionChangedListener { point ->
                if (!hasCenteredOnUser) {
                    mapView.mapboxMap.flyTo(
                        CameraOptions.Builder()
                            .center(point)
                            .zoom(16.0)
                            .build()
                    )
                    hasCenteredOnUser = true
                }
            }

            mapView.location.updateSettings {
                enabled = true
                pulsingEnabled = true
            }
            mapView.location.addOnIndicatorPositionChangedListener(positionListener)

            onDispose {
                mapView.location.removeOnIndicatorPositionChangedListener(positionListener)
            }
        }
    }

    DisposableEffect(mapView, lifecycle) {
        if (mapView == null) {
            onDispose {}
        } else {
            var isStarted = false
            var isDestroyed = false

            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_START -> if (!isStarted) {
                        mapView.onStart()
                        isStarted = true
                    }
                    Lifecycle.Event.ON_STOP -> if (isStarted) {
                        mapView.onStop()
                        isStarted = false
                    }
                    Lifecycle.Event.ON_DESTROY -> {
                        if (isStarted) mapView.onStop()
                        mapView.onDestroy()
                        isStarted = false
                        isDestroyed = true
                    }
                    else -> Unit
                }
            }

            lifecycle.addObserver(observer)
            onDispose {
                lifecycle.removeObserver(observer)
                if (isStarted) mapView.onStop()
                if (!isDestroyed) mapView.onDestroy()
            }
        }
    }
}
