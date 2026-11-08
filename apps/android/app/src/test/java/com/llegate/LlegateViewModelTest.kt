package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.model.LocationPoint
import com.llegate.model.ServiceType
import com.llegate.network.AuthRepository
import com.llegate.viewmodel.AppScreen
import com.llegate.viewmodel.LlegateViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class LlegateViewModelTest {

  private fun nuevoViewModel(): LlegateViewModel {
    val context = ApplicationProvider.getApplicationContext<Context>()
    return LlegateViewModel(AuthRepository(store = SessionStore(context)))
  }

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("Llégate", appName)
  }

  @Test
  fun `verify initial viewmodel state and navigation`() {
    val viewModel = nuevoViewModel()
    val initialState = viewModel.uiState.value

    assertEquals(AppScreen.HOME, initialState.currentScreen)
    assertEquals(ServiceType.MOTO, initialState.selectedService)
    assertEquals("aragua", initialState.selectedStateId)
    assertTrue(initialState.currentState.isLaunchHub)
    assertTrue(initialState.currentState.citiesAndTowns.contains("Maracay"))
    assertTrue(initialState.currentState.citiesAndTowns.contains("Cagua"))
    assertTrue(initialState.currentState.citiesAndTowns.contains("Turmero"))
    assertTrue(initialState.currentState.citiesAndTowns.contains("La Victoria"))
    assertNotNull(initialState.motoEstimate)
    assertNotNull(initialState.carEstimate)
    assertTrue(initialState.bcvExchangeRate > 100.0)

    viewModel.selectState("carabobo")
    assertEquals("carabobo", viewModel.uiState.value.selectedStateId)

    viewModel.openBooking(ServiceType.CAR)
    val bookingState = viewModel.uiState.value
    assertEquals(AppScreen.BOOKING_DETAILS, bookingState.currentScreen)
    assertEquals(ServiceType.CAR, bookingState.selectedService)

    viewModel.pedirViaje()
    val sinSesion = viewModel.uiState.value
    assertEquals(AppScreen.BOOKING_DETAILS, sinSesion.currentScreen)
    assertNull(sinSesion.activeTrip)
    assertEquals("Entra a tu cuenta para pedir un viaje.", sinSesion.statusMessage)
  }

  @Test
  fun `verify city selector and aragua default launch hub`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    // Aragua is default launch hub
    assertEquals("aragua", state.selectedStateId)
    assertEquals("Maracay", state.selectedCityName)
    assertTrue(state.currentState.isLaunchHub)
    assertEquals(4, state.availableStates.size)
    assertEquals(20, state.otherStatesRoadmap.size)

    // Select Cagua in Aragua
    val caguaCity = state.currentState.cities.first { it.name == "Cagua" }
    viewModel.selectCity(caguaCity)

    val updatedState = viewModel.uiState.value
    assertEquals("Cagua", updatedState.selectedCityName)
    assertTrue(updatedState.origin.cityName.contains("Cagua") || updatedState.origin.title.contains("Cagua"))
  }

  @Test
  fun `el historial esta vacio hasta que la API lo conteste`() {
    val viewModel = nuevoViewModel()

    assertTrue(viewModel.uiState.value.viajes.isEmpty())

    viewModel.openTripHistory()
    assertEquals(AppScreen.TRIP_HISTORY, viewModel.uiState.value.currentScreen)

    // Sin sesión la app no pregunta: `/trips` es un endpoint autenticado.
    assertTrue(viewModel.uiState.value.viajes.isEmpty())
  }

  @Test
  fun `cancelar o cerrar sin viaje abierto solo devuelve al inicio`() {
    val viewModel = nuevoViewModel()
    viewModel.openTripHistory()

    viewModel.cancelarViaje("Cambié de planes")
    assertEquals(AppScreen.HOME, viewModel.uiState.value.currentScreen)

    viewModel.openTripHistory()
    viewModel.cerrarViaje()
    assertEquals(AppScreen.HOME, viewModel.uiState.value.currentScreen)
    assertNull(viewModel.uiState.value.activeTrip)
  }

  @Test
  fun `el mapa solo se expande, sin capas de telemetry ni radar simuladas`() {
    val viewModel = nuevoViewModel()

    viewModel.toggleFullMapExpanded(true)
    assertTrue(viewModel.uiState.value.showFullMapExpanded)

    viewModel.toggleFullMapExpanded(false)
    assertFalse(viewModel.uiState.value.showFullMapExpanded)
  }

  @Test
  fun `la estimacion usa la distancia vial disponible y vuelve al estimado provisional si falla`() {
    val viewModel = nuevoViewModel()

    viewModel.updateRoadRouteDistance(8.7)
    assertEquals(8.7, viewModel.uiState.value.routeDistanceKm!!, 0.0)
    assertEquals(8.7, viewModel.uiState.value.motoEstimate!!.distanceKm, 0.0)

    viewModel.updateRoadRouteDistance(null)
    assertNull(viewModel.uiState.value.routeDistanceKm)
    assertTrue(viewModel.uiState.value.motoEstimate!!.distanceKm != 8.7)
  }

  @Test
  fun `verify smart location suggestions and 1-tap route selection`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    assertTrue(state.currentSuggestions.isNotEmpty())
    val topSuggestion = state.currentSuggestions.first()

    viewModel.selectSuggestion(topSuggestion)
    val updatedState = viewModel.uiState.value

    assertEquals(topSuggestion.title, updatedState.destination.title)
    assertTrue(updatedState.destination.subtitle.contains(topSuggestion.subtitle) || updatedState.destination.subtitle.contains(topSuggestion.tag))
  }

  @Test
  fun `verify safe meeting points delivery estimates and driver toggle`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    // Check delivery estimate exists
    assertNotNull(state.deliveryEstimate)
    assertEquals(ServiceType.DELIVERY, state.deliveryEstimate?.serviceType)
    assertTrue(state.deliveryEstimate!!.priceUsd > 1.0)
    assertTrue(state.deliveryEstimate!!.priceBs > 100.0)

    // Check safe meeting points
    assertTrue(state.currentSafeMeetingPoints.isNotEmpty())
    val meetingPoint = state.currentSafeMeetingPoints.first()

    viewModel.selectSafeMeetingPoint(meetingPoint)
    val updatedState = viewModel.uiState.value
    assertEquals(meetingPoint.id, updatedState.selectedSafeMeetingPointId)
    assertEquals(meetingPoint.title, updatedState.origin.title)

    // Check Pasajero vs Piloto toggle
    assertEquals(false, updatedState.isDriverMode)
    viewModel.toggleDriverMode(true)
    assertEquals(true, viewModel.uiState.value.isDriverMode)
    viewModel.toggleDriverMode(false)
    assertEquals(false, viewModel.uiState.value.isDriverMode)

    // Check trip customization preferences
    assertTrue(state.customizationPreferences.isNotEmpty())
    viewModel.togglePreferenceTag("Música al Gusto")
    assertTrue(viewModel.uiState.value.customizationPreferences.contains("Música al Gusto"))
  }

  @Test
  fun `la ruta se invierte y el viaje se pide solo con sesion`() {
    val viewModel = nuevoViewModel()
    viewModel.openBooking(ServiceType.MOTO)

    val bookingState = viewModel.uiState.value
    assertEquals(AppScreen.BOOKING_DETAILS, bookingState.currentScreen)

    // Verify initial origin and destination
    val customOrigin = LocationPoint("Plaza Bolívar de Maracay", "Centro histórico", 10.2480, -67.6000, stateName = "Aragua", cityName = "Maracay")
    val customDest = LocationPoint("Centro Comercial Parque Aragua", "Av. Bolívar Este", 10.2458, -67.5855, stateName = "Aragua", cityName = "Maracay")
    viewModel.updateOrigin(customOrigin)
    viewModel.updateDestination(customDest)

    val updatedTextState = viewModel.uiState.value
    assertEquals("Plaza Bolívar de Maracay", updatedTextState.origin.title)
    assertEquals("Centro Comercial Parque Aragua", updatedTextState.destination.title)

    // Test 1-tap route swap
    viewModel.swapOriginAndDestination()
    val swappedState = viewModel.uiState.value
    assertEquals("Centro Comercial Parque Aragua", swappedState.origin.title)
    assertEquals("Plaza Bolívar de Maracay", swappedState.destination.title)

    // La carrera se calcula con la distancia entre los dos puntos, no se inventa.
    val viaje = swappedState.motoEstimate
    assertNotNull(viaje)
    assertTrue(viaje!!.priceUsd > 0.0)
    assertTrue(viaje.priceBs > 0.0)
  }

  @Test
  fun `seleccionar destino por coordenadas actualiza la estimacion`() {
    val viewModel = nuevoViewModel()
    viewModel.updateOrigin(
      LocationPoint("Origen", "Maracay", 10.2480, -67.6000, stateName = "Aragua", cityName = "Maracay")
    )
    val distanciaAnterior = viewModel.uiState.value.motoEstimate!!.distanceKm

    val puntoSeleccionado = LocationPoint(
      "Punto en el Mapa (10.400, -67.600)",
      "Maracay, Aragua",
      10.4000,
      -67.6000,
      stateName = "Aragua",
      cityName = "Maracay"
    )
    viewModel.updateDestination(puntoSeleccionado)

    val actualizado = viewModel.uiState.value
    assertEquals(10.4000, actualizado.destination.lat, 0.0)
    assertEquals(-67.6000, actualizado.destination.lng, 0.0)
    assertTrue(actualizado.motoEstimate!!.distanceKm > distanciaAnterior)
  }
}

