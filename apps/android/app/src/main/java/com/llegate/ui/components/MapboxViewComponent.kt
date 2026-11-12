package com.llegate.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.llegate.R
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Stone100
import com.mapbox.maps.MapView
import com.mapbox.maps.Style

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
    val mapViewState = remember { mutableStateOf<MapView?>(null) }

    AndroidView(
        modifier = modifier,
        factory = {
            MapView(context).apply {
                mapViewState.value = this
                getMapboxMap().loadStyleUri(Style.DARK)
            }
        },
        update = {}
    )

    val mapView = mapViewState.value
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
