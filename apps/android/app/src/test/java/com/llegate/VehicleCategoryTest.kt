package com.llegate

import com.llegate.model.PriceEstimate
import com.llegate.model.ServiceType
import com.llegate.model.VEHICLE_CATEGORIES
import com.llegate.viewmodel.LlegateUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class VehicleCategoryTest {
    @Test
    fun categoryPricesAreConvertedUsingTheCurrentBcvRate() {
        val state = LlegateUiState(
            selectedService = ServiceType.CAR,
            selectedVehicleCategoryId = "car_eco",
            bcvExchangeRate = 400.0,
            carEstimate = PriceEstimate(ServiceType.CAR, 3.2, 14, 4.62, 1848.0)
        )

        val estimate = state.selectedEstimate
        assertNotNull(estimate)
        assertEquals(2.50, estimate!!.priceUsd, 0.0)
        assertEquals(1000.0, estimate.priceBs, 0.0)
        assertEquals(3.2, estimate.distanceKm, 0.0)
    }

    @Test
    fun deliveryKeepsItsDistanceEstimateEvenIfACategoryWasSelected() {
        val state = LlegateUiState(
            selectedService = ServiceType.DELIVERY,
            selectedVehicleCategoryId = "car_vip",
            deliveryEstimate = PriceEstimate(ServiceType.DELIVERY, 3.2, 8, 1.94, 776.0)
        )

        assertEquals(1.94, state.selectedEstimate?.priceUsd ?: 0.0, 0.0)
    }

    @Test
    fun categorySelectorHasTheFourRequestedFares() {
        assertEquals(
            listOf(5.00, 3.50, 2.50, 1.80),
            VEHICLE_CATEGORIES.map { it.priceUsd }
        )
    }
}
