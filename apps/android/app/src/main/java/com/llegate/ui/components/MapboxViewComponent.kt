package com.llegate.ui.components

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
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
import androidx.compose.runtime.rememberUpdatedState
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
import com.llegate.model.LocationPoint
import com.llegate.ui.theme.Asphalt950
import com.llegate.ui.theme.Stone100
import com.mapbox.android.gestures.MoveGestureDetector
import com.mapbox.geojson.Feature
import com.mapbox.geojson.FeatureCollection
import com.mapbox.geojson.LineString
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.EdgeInsets
import com.mapbox.maps.MapboxMap
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.mapbox.maps.extension.style.layers.addLayer
import com.mapbox.maps.extension.style.layers.generated.lineLayer
import com.mapbox.maps.extension.style.layers.properties.generated.LineCap
import com.mapbox.maps.extension.style.layers.properties.generated.LineJoin
import com.mapbox.maps.extension.style.sources.addSource
import com.mapbox.maps.extension.style.sources.generated.GeoJsonSource
import com.mapbox.maps.extension.style.sources.generated.geoJsonSource
import com.mapbox.maps.extension.style.sources.getSourceAs
import com.mapbox.maps.plugin.animation.flyTo
import com.mapbox.maps.plugin.gestures.OnMoveListener
import com.mapbox.maps.plugin.gestures.gestures
import com.mapbox.maps.plugin.locationcomponent.OnIndicatorPositionChangedListener
import com.mapbox.maps.plugin.locationcomponent.location
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val ROUTE_SOURCE_ID = "llegate-route-source"
private const val ROUTE_LAYER_ID = "llegate-route-layer"
private val routeHttpClient = OkHttpClient.Builder()
    .connectTimeout(8, TimeUnit.SECONDS)
    .readTimeout(12, TimeUnit.SECONDS)
    .build()

private data class RoadRoute(
    val points: List<Point>,
    val distanceKm: Double,
    val origin: Point,
    val destination: Point
)

fun updateMapboxRoute(
    mapboxMap: MapboxMap,
    origin: Point,
    destination: Point,
    routePoints: List<Point> = listOf(origin, destination)
) {
    setMapboxRoutePoints(
        mapboxMap,
        routePoints.takeIf { it.size >= 2 } ?: listOf(origin, destination)
    )
}

private fun setMapboxRoutePoints(mapboxMap: MapboxMap, points: List<Point>) {
    val style = mapboxMap.style ?: return
    val source = style.getSourceAs<GeoJsonSource>(ROUTE_SOURCE_ID) ?: return
    val collection = if (points.size >= 2) {
        FeatureCollection.fromFeature(Feature.fromGeometry(LineString.fromLngLats(points)))
    } else {
        FeatureCollection.fromFeatures(emptyArray())
    }
    source.featureCollection(collection)
}

private fun installRouteLayer(style: Style) {
    style.addSource(
        geoJsonSource(ROUTE_SOURCE_ID) {
            featureCollection(FeatureCollection.fromFeatures(emptyArray()))
        }
    )
    style.addLayer(
        lineLayer(ROUTE_LAYER_ID, ROUTE_SOURCE_ID) {
            lineColor("#00E676")
            lineWidth(5.5)
            lineCap(LineCap.ROUND)
            lineJoin(LineJoin.ROUND)
            lineOpacity(0.92)
        }
    )
}

private suspend fun requestRoadRoute(origin: Point, destination: Point): RoadRoute =
    suspendCancellableCoroutine { continuation ->
        val url = "https://router.project-osrm.org/route/v1/driving/" +
            "${origin.longitude()},${origin.latitude()};" +
            "${destination.longitude()},${destination.latitude()}?overview=full&geometries=geojson&steps=false"
        val request = Request.Builder().url(url).get().build()
        val call = routeHttpClient.newCall(request)
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (continuation.isActive) continuation.resumeWithException(e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val routeResult = response.use {
                        if (!it.isSuccessful) throw IOException("OSRM respondió HTTP ${it.code}.")
                        val body = it.body?.string()
                            ?: throw IOException("OSRM devolvió una respuesta vacía.")
                        val route = JSONObject(body)
                            .getJSONArray("routes")
                            .optJSONObject(0)
                            ?: throw IllegalStateException("OSRM no encontró una ruta vial.")
                        val distanceKm = route.getDouble("distance") / 1000.0
                        val coordinates = route.getJSONObject("geometry").getJSONArray("coordinates")
                        val points = List(coordinates.length()) { index ->
                            val coordinate = coordinates.getJSONArray(index)
                            val longitude = coordinate.getDouble(0)
                            val latitude = coordinate.getDouble(1)
                            if (!longitude.isFinite() || !latitude.isFinite() ||
                                longitude !in -180.0..180.0 || latitude !in -90.0..90.0
                            ) {
                                throw IllegalStateException("OSRM devolvió coordenadas inválidas.")
                            }
                            Point.fromLngLat(longitude, latitude)
                        }
                        if (points.size < 2 || !distanceKm.isFinite() || distanceKm <= 0.0) {
                            throw IllegalStateException("OSRM devolvió una ruta vacía o inválida.")
                        }
                        RoadRoute(points, distanceKm, origin, destination)
                    }
                    if (continuation.isActive) continuation.resume(routeResult)
                } catch (failure: IOException) {
                    if (continuation.isActive) continuation.resumeWithException(failure)
                } catch (failure: JSONException) {
                    if (continuation.isActive) continuation.resumeWithException(failure)
                } catch (failure: IllegalStateException) {
                    if (continuation.isActive) continuation.resumeWithException(failure)
                }
            }
        })
    }

@Composable
fun MapboxDarkMapScreen(
    modifier: Modifier = Modifier,
    currentMapStyle: LlegateMapStyle = LlegateMapStyle.DARK,
    origin: LocationPoint? = null,
    selectedDestination: LocationPoint? = null,
    onMapCenterChanged: (Point) -> Unit = {},
    onRouteDistanceChanged: (Double?) -> Unit = {},
    fitRouteRequest: Int = 0,
    locationPermissionGranted: Boolean? = null
) {
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
    var localLocationPermission by remember {
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
    val hasLocationPermission = locationPermissionGranted ?: localLocationPermission
    var hasCenteredOnUser by remember { mutableStateOf(false) }
    var isStyleLoaded by remember { mutableStateOf(false) }
    var isStyleLoading by remember { mutableStateOf(false) }
    var roadRoute by remember { mutableStateOf<RoadRoute?>(null) }
    var isRouteLoading by remember { mutableStateOf(false) }
    var lastFitRequest by remember { mutableStateOf(0) }
    val mapViewState = remember { mutableStateOf<MapView?>(null) }
    val currentOnMapCenterChanged by rememberUpdatedState(onMapCenterChanged)
    val currentOnRouteDistanceChanged by rememberUpdatedState(onRouteDistanceChanged)
    val latestMapStyle by rememberUpdatedState(currentMapStyle)
    val latestOrigin by rememberUpdatedState(origin)
    val latestDestination by rememberUpdatedState(selectedDestination)
    val latestRoadRoute by rememberUpdatedState(roadRoute)
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        localLocationPermission =
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(locationPermissionGranted) {
        if (locationPermissionGranted == null && !localLocationPermission) {
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
            }
        },
        update = {}
    )

    val mapView = mapViewState.value
    val originLat = origin?.lat
    val originLng = origin?.lng
    val destinationLat = selectedDestination?.lat
    val destinationLng = selectedDestination?.lng

    LaunchedEffect(mapView, currentMapStyle) {
        if (mapView == null) return@LaunchedEffect
        isStyleLoaded = false
        isStyleLoading = true
        val requestedStyle = currentMapStyle
        mapView.mapboxMap.loadStyle(requestedStyle.styleUri) { style ->
            installRouteLayer(style)
            if (mapViewState.value !== mapView || latestMapStyle != requestedStyle) {
                return@loadStyle
            }
            val route = latestRoadRoute
            val activeOrigin = latestOrigin
            val activeDestination = latestDestination
            if (route != null &&
                activeOrigin?.tieneCoordenadas == true &&
                activeDestination?.tieneCoordenadas == true &&
                route.origin.longitude() == activeOrigin.lng &&
                route.origin.latitude() == activeOrigin.lat &&
                route.destination.longitude() == activeDestination.lng &&
                route.destination.latitude() == activeDestination.lat
            ) {
                updateMapboxRoute(
                    mapView.mapboxMap,
                    Point.fromLngLat(activeOrigin.lng, activeOrigin.lat),
                    Point.fromLngLat(activeDestination.lng, activeDestination.lat),
                    route.points
                )
            }
            isStyleLoading = false
            isStyleLoaded = true
        }
    }

    LaunchedEffect(mapView, originLat, originLng, destinationLat, destinationLng) {
        if (mapView == null) return@LaunchedEffect
        if (originLat == null || originLng == null ||
            destinationLat == null || destinationLng == null ||
            originLat !in -90.0..90.0 || originLng !in -180.0..180.0 ||
            destinationLat !in -90.0..90.0 || destinationLng !in -180.0..180.0 ||
            (originLat == 0.0 && originLng == 0.0) ||
            (destinationLat == 0.0 && destinationLng == 0.0)
        ) {
            roadRoute = null
            isRouteLoading = false
            setMapboxRoutePoints(mapView.mapboxMap, emptyList())
            currentOnRouteDistanceChanged(null)
            return@LaunchedEffect
        }

        val routeOrigin = Point.fromLngLat(originLng, originLat)
        val routeDestination = Point.fromLngLat(destinationLng, destinationLat)
        roadRoute = null
        isRouteLoading = true
        if (isStyleLoaded) setMapboxRoutePoints(mapView.mapboxMap, emptyList())
        currentOnRouteDistanceChanged(null)

        try {
            delay(300)
            val route = requestRoadRoute(routeOrigin, routeDestination)
            roadRoute = route
            isRouteLoading = false
            currentOnRouteDistanceChanged(route.distanceKm)
        } catch (failure: IOException) {
            isRouteLoading = false
            Log.w("MapboxView", "No se pudo obtener la geometría vial de OSRM.", failure)
        } catch (failure: JSONException) {
            isRouteLoading = false
            Log.w("MapboxView", "OSRM devolvió una ruta inválida.", failure)
        } catch (failure: IllegalStateException) {
            isRouteLoading = false
            Log.w("MapboxView", "OSRM devolvió datos de ruta inválidos.", failure)
        }
    }

    LaunchedEffect(mapView, isStyleLoaded, roadRoute, originLat, originLng, destinationLat, destinationLng) {
        if (mapView == null || !isStyleLoaded || isStyleLoading) return@LaunchedEffect
        val route = roadRoute
        if (route != null &&
            originLat != null && originLng != null &&
            destinationLat != null && destinationLng != null &&
            route.origin.longitude() == originLng &&
            route.origin.latitude() == originLat &&
            route.destination.longitude() == destinationLng &&
            route.destination.latitude() == destinationLat
        ) {
            updateMapboxRoute(
                mapView.mapboxMap,
                Point.fromLngLat(originLng, originLat),
                Point.fromLngLat(destinationLng, destinationLat),
                route.points
            )
        } else {
            setMapboxRoutePoints(mapView.mapboxMap, emptyList())
        }
    }

    LaunchedEffect(mapView, selectedDestination?.lat, selectedDestination?.lng) {
        val destination = selectedDestination
        if (mapView != null && destination?.tieneCoordenadas == true) {
            mapView.mapboxMap.flyTo(
                CameraOptions.Builder()
                    .center(Point.fromLngLat(destination.lng, destination.lat))
                    .zoom(15.0)
                    .build()
            )
        }
    }

    LaunchedEffect(
        mapView,
        fitRouteRequest,
        roadRoute,
        isRouteLoading,
        originLat,
        originLng,
        destinationLat,
        destinationLng
    ) {
        if (mapView == null || fitRouteRequest == 0 || fitRouteRequest == lastFitRequest) {
            return@LaunchedEffect
        }
        if (isRouteLoading) return@LaunchedEffect
        val routeCoordinates = roadRoute?.points?.takeIf { it.size >= 2 } ?: listOfNotNull(
            originLat?.let { lat -> originLng?.let { lng -> Point.fromLngLat(lng, lat) } },
            destinationLat?.let { lat -> destinationLng?.let { lng -> Point.fromLngLat(lng, lat) } }
        )
        if (routeCoordinates.size >= 2) {
            val density = mapView.resources.displayMetrics.density
            mapView.mapboxMap.cameraForCoordinates(
                routeCoordinates,
                CameraOptions.Builder().build(),
                EdgeInsets(180.0 * density, 48.0 * density, 300.0 * density, 48.0 * density),
                14.5,
                null
            ) { cameraOptions ->
                mapView.mapboxMap.flyTo(cameraOptions)
            }
        }
        lastFitRequest = fitRouteRequest
    }

    DisposableEffect(mapView) {
        if (mapView == null) {
            onDispose {}
        } else {
            var userMovedMap = false
            val moveListener = object : OnMoveListener {
                override fun onMoveBegin(detector: MoveGestureDetector) {
                    userMovedMap = true
                }

                override fun onMove(detector: MoveGestureDetector): Boolean = false

                override fun onMoveEnd(detector: MoveGestureDetector) = Unit
            }
            mapView.gestures.addOnMoveListener(moveListener)
            val mapIdleSubscription = mapView.mapboxMap.subscribeMapIdle {
                if (userMovedMap) {
                    userMovedMap = false
                    currentOnMapCenterChanged(mapView.mapboxMap.cameraState.center)
                }
            }

            onDispose {
                mapView.gestures.removeOnMoveListener(moveListener)
                mapIdleSubscription.cancel()
            }
        }
    }

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
