package com.llegate.ui.navigation

sealed class BookingFlowState {
    object SearchAddresses : BookingFlowState()
    object MapPinPicker : BookingFlowState()
    object VehicleSelection : BookingFlowState()
    object SearchingDriver : BookingFlowState()
}
