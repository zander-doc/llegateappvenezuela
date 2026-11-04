package com.llegate

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.llegate.data.SessionStore
import com.llegate.model.CommunityAlertType
import com.llegate.model.LocationPoint
import com.llegate.model.MapDisplayMode
import com.llegate.model.ServiceType
import com.llegate.network.AuthRepository
import com.llegate.viewmodel.AppScreen
import com.llegate.viewmodel.LlegateViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
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

    viewModel.confirmAndStartTrip()
    val tripState = viewModel.uiState.value
    assertEquals(AppScreen.TRIP_ACTIVE, tripState.currentScreen)
    assertNotNull(tripState.activeTrip)
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
  fun `verify trip history and single-tap repeat trip`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    // Check pre-seeded trips
    assertTrue(state.tripHistory.isNotEmpty())
    val firstTrip = state.tripHistory.first()

    // Open trip history
    viewModel.openTripHistory()
    assertEquals(AppScreen.TRIP_HISTORY, viewModel.uiState.value.currentScreen)

    // Repeat first trip with 1-tap
    viewModel.repeatTrip(firstTrip)
    val repeatedState = viewModel.uiState.value

    assertEquals(AppScreen.BOOKING_DETAILS, repeatedState.currentScreen)
    assertEquals(firstTrip.serviceType, repeatedState.selectedService)
    assertEquals(firstTrip.origin.title, repeatedState.origin.title)
    assertEquals(firstTrip.destination.title, repeatedState.destination.title)
    assertEquals(firstTrip.paymentMethod, repeatedState.selectedPaymentMethod)
  }

  @Test
  fun `verify dynamic gps telemetry and map mode switching`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    // GPS Telemetry initial checks
    assertTrue(state.gpsTelemetry.satellitesCount > 10)
    assertTrue(state.gpsTelemetry.accuracyMeters < 5.0)
    assertTrue(state.nearbyVehicles.isNotEmpty())
    assertEquals(MapDisplayMode.LIVE_TRAFFIC, state.mapDisplayMode)

    // Switch map modes
    viewModel.setMapDisplayMode(MapDisplayMode.RADAR_SCAN)
    assertEquals(MapDisplayMode.RADAR_SCAN, viewModel.uiState.value.mapDisplayMode)

    viewModel.setMapDisplayMode(MapDisplayMode.URBAN_NIGHT)
    assertEquals(MapDisplayMode.URBAN_NIGHT, viewModel.uiState.value.mapDisplayMode)

    // Toggle fullscreen map
    viewModel.toggleFullMapExpanded(true)
    assertTrue(viewModel.uiState.value.showFullMapExpanded)
    viewModel.toggleFullMapExpanded(false)
    assertTrue(!viewModel.uiState.value.showFullMapExpanded)
  }

  @Test
  fun `verify community alerts reporting and upvoting`() {
    val viewModel = nuevoViewModel()
    val state = viewModel.uiState.value

    assertTrue(state.communityAlerts.isNotEmpty())
    val firstAlert = state.communityAlerts.first()
    val initialVotes = firstAlert.confirmations

    // Upvote alert
    viewModel.confirmCommunityAlert(firstAlert.id)
    val updatedAlert = viewModel.uiState.value.communityAlerts.first { it.id == firstAlert.id }
    assertEquals(initialVotes + 1, updatedAlert.confirmations)
    assertTrue(updatedAlert.userConfirmed)

    // Submit new report
    val initialCount = viewModel.uiState.value.communityAlerts.size
    viewModel.submitCommunityReport(
        type = CommunityAlertType.POLICE_CHECKPOINT,
        note = "Punto de control en Peaje La Cabrera",
        locationName = "Peaje La Cabrera - ARC"
    )
    val afterReportState = viewModel.uiState.value
    assertEquals(initialCount + 1, afterReportState.communityAlerts.size)
    assertEquals("Peaje La Cabrera - ARC", afterReportState.communityAlerts.first().locationName)
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
  fun `verify request ride screen origin destination swap and send request to nearby drivers`() {
    val viewModel = nuevoViewModel()
    viewModel.openBooking(ServiceType.MOTO)

    val bookingState = viewModel.uiState.value
    assertEquals(AppScreen.BOOKING_DETAILS, bookingState.currentScreen)

    // Verify initial origin and destination
    val originalOriginTitle = bookingState.origin.title
    val originalDestTitle = bookingState.destination.title

    // Test updating origin and destination
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

    // Test sending ride request to nearby drivers
    viewModel.sendRideRequestToNearbyDrivers()
    val tripStartedState = viewModel.uiState.value

    assertEquals(AppScreen.TRIP_ACTIVE, tripStartedState.currentScreen)
    assertNotNull(tripStartedState.activeTrip)
    assertEquals(ServiceType.MOTO, tripStartedState.activeTrip?.serviceType)
    assertEquals("Centro Comercial Parque Aragua", tripStartedState.activeTrip?.origin?.title)
    assertEquals("Plaza Bolívar de Maracay", tripStartedState.activeTrip?.destination?.title)
    assertTrue(tripStartedState.activeTrip!!.priceEstimate.priceUsd > 0.0)
    assertTrue(tripStartedState.activeTrip!!.priceEstimate.priceBs > 0.0)
  }
}



