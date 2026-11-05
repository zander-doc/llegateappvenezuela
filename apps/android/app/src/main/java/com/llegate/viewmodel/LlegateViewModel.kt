package com.llegate.viewmodel

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.Geocoder
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.llegate.model.ActiveTrip
import com.llegate.model.AutomotivePartner
import com.llegate.model.CityInfo
import com.llegate.model.CommunityAlert
import com.llegate.model.CommunityAlertType
import com.llegate.model.DriverProfile
import com.llegate.model.GpsTelemetry
import com.llegate.model.LocationPoint
import com.llegate.model.LocationSuggestion
import com.llegate.model.MapDisplayMode
import com.llegate.model.NearbyVehicle
import com.llegate.model.PaymentMethod
import com.llegate.model.PriceEstimate
import com.llegate.model.SafeMeetingPoint
import com.llegate.model.ServiceType
import com.llegate.model.StateRegion
import com.llegate.model.tarifaUsd
import com.llegate.model.TripHistoryItem
import com.llegate.model.TripStep
import com.llegate.model.UpcomingService
import com.llegate.network.ApiException
import com.llegate.network.AuthRepository
import com.llegate.network.BcvRateService
import com.llegate.network.Billetera
import com.llegate.network.ConfigApp
import com.llegate.network.ConfigRepository
import com.llegate.network.EstadoPago
import com.llegate.network.MetodoPagoDisponible
import com.llegate.network.Movimiento
import com.llegate.network.Pago
import com.llegate.network.PagoRepository
import com.llegate.network.TripRepository
import com.llegate.network.Usuario
import com.llegate.network.Viaje
import com.llegate.network.WalletRepository
import com.llegate.util.aE164Venezuela
import com.llegate.util.digitos
import com.llegate.util.esNombrePersona
import com.llegate.util.esReferenciaPagoMovil
import com.llegate.util.usd
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Locale
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

enum class AppScreen {
    HOME,
    BOOKING_DETAILS,
    TRIP_ACTIVE,
    TRIP_HISTORY
}

enum class PasoInicio {
    DATOS,
    CODIGO
}

/** Los pasos de una recarga: elegir monto, pagar en el banco y reportar la referencia. */
enum class PasoRecarga {
    MONTO,
    INSTRUCCIONES,
    REPORTAR
}

data class LlegateUiState(
    val currentScreen: AppScreen = AppScreen.HOME,
    val selectedService: ServiceType = ServiceType.MOTO,
    // CENTRAL REGION STATES RESTRICTED INITIALLY TO ARAGUA, CARABOBO, GUÁRICO & DISTRITO CAPITAL
    val availableStates: List<StateRegion> = listOf(
        StateRegion(
            id = "aragua",
            name = "Aragua",
            isLaunchHub = true, // Sede Principal de Lanzamiento Llégate 🇻🇪
            isAvailableNow = true,
            subtitle = "Sede Principal de Lanzamiento Llégate 🇻🇪",
            citiesAndTowns = listOf(
                "Maracay", "Turmero", "Cagua", "La Victoria", "Palo Negro",
                "Villa de Cura", "Santa Cruz", "El Limón", "San Mateo",
                "Ocumare de la Costa", "Choroní", "San Sebastián"
            ),
            cities = listOf(
                CityInfo(
                    name = "Maracay",
                    municipalityOrZone = "Municipio Girardot • Capital de Aragua",
                    points = listOf(
                        LocationPoint("CC Parque Aragua", "Av. Bolívar Este, Maracay", 10.2458, -67.5855, stateName = "Aragua", cityName = "Maracay"),
                        LocationPoint("Las Delicias / CC Las Américas", "Av. Las Delicias, Maracay", 10.2612, -67.5991, stateName = "Aragua", cityName = "Maracay"),
                        LocationPoint("Terminal Central de Maracay", "Av. Constitución, Rutas Interurbanas", 10.2425, -67.5950, stateName = "Aragua", cityName = "Maracay"),
                        LocationPoint("Plaza Bolívar de Maracay", "Av. Miranda con Bolívar", 10.2480, -67.6000, stateName = "Aragua", cityName = "Maracay")
                    )
                ),
                CityInfo(
                    name = "Cagua",
                    municipalityOrZone = "Municipio Sucre",
                    points = listOf(
                        LocationPoint("Centro de Cagua", "Plaza Sucre / Carretera Nacional", 10.1873, -67.4589, stateName = "Aragua", cityName = "Cagua"),
                        LocationPoint("Zona Industrial Santa Rosalía", "Av. Principal de Cagua", 10.1920, -67.4650, stateName = "Aragua", cityName = "Cagua")
                    )
                ),
                CityInfo(
                    name = "Turmero",
                    municipalityOrZone = "Municipio Santiago Mariño",
                    points = listOf(
                        LocationPoint("Turmero Casco Central", "Plaza Mariño / Calle Bolívar", 10.2289, -67.4735, stateName = "Aragua", cityName = "Turmero"),
                        LocationPoint("San Mateo", "Ingenio Bolívar / Carretera Nacional", 10.2120, -67.4210, stateName = "Aragua", cityName = "Turmero")
                    )
                ),
                CityInfo(
                    name = "La Victoria",
                    municipalityOrZone = "Municipio José Félix Ribas",
                    points = listOf(
                        LocationPoint("La Victoria - Peaje ARC", "Zona Colonial y Comercial", 10.2272, -67.3314, stateName = "Aragua", cityName = "La Victoria"),
                        LocationPoint("Plaza José Félix Ribas", "Casco Histórico", 10.2290, -67.3350, stateName = "Aragua", cityName = "La Victoria")
                    )
                ),
                CityInfo(
                    name = "Palo Negro",
                    municipalityOrZone = "Municipio Libertador",
                    points = listOf(
                        LocationPoint("Palo Negro - BAEL", "Plaza Bolívar / Base Aérea", 10.1742, -67.5503, stateName = "Aragua", cityName = "Palo Negro")
                    )
                ),
                CityInfo(
                    name = "Villa de Cura",
                    municipalityOrZone = "Municipio Zamora • Puerta del Llano",
                    points = listOf(
                        LocationPoint("Villa de Cura", "Puerta del Llano / Calle Comercio", 10.0381, -67.4897, stateName = "Aragua", cityName = "Villa de Cura")
                    )
                ),
                CityInfo(
                    name = "El Limón",
                    municipalityOrZone = "Municipio Mario Briceño Iragorry",
                    points = listOf(
                        LocationPoint("El Limón - MBI", "Av. Universidad / Entrada a Ocumare", 10.2785, -67.6322, stateName = "Aragua", cityName = "El Limón")
                    )
                ),
                CityInfo(
                    name = "Ocumare de la Costa",
                    municipalityOrZone = "Municipio Costa de Oro",
                    points = listOf(
                        LocationPoint("Bahía de Cata / El Playón", "Costa de Aragua", 10.4936, -67.7428, stateName = "Aragua", cityName = "Ocumare de la Costa")
                    )
                ),
                CityInfo(
                    name = "Choroní",
                    municipalityOrZone = "Pueblo y Playas de Aragua",
                    points = listOf(
                        LocationPoint("Playa Grande / Puerto Colombia", "Choroní, Aragua", 10.5050, -67.6150, stateName = "Aragua", cityName = "Choroní")
                    )
                )
            ),
            popularPoints = listOf(
                LocationPoint("CC Parque Aragua", "Av. Bolívar Este, Maracay", 10.2458, -67.5855, stateName = "Aragua", cityName = "Maracay"),
                LocationPoint("Las Delicias / CC Las Américas", "Av. Las Delicias, Maracay", 10.2612, -67.5991, stateName = "Aragua", cityName = "Maracay"),
                LocationPoint("Centro de Cagua", "Plaza Sucre / Carretera Nacional", 10.1873, -67.4589, stateName = "Aragua", cityName = "Cagua"),
                LocationPoint("Turmero Casco Central", "Plaza Mariño / Calle Bolívar", 10.2289, -67.4735, stateName = "Aragua", cityName = "Turmero"),
                LocationPoint("La Victoria - Peaje ARC", "Zona Colonial y Comercial", 10.2272, -67.3314, stateName = "Aragua", cityName = "La Victoria"),
                LocationPoint("Palo Negro - BAEL", "Plaza Bolívar / Base Aérea", 10.1742, -67.5503, stateName = "Aragua", cityName = "Palo Negro"),
                LocationPoint("Villa de Cura", "Puerta del Llano / Calle Comercio", 10.0381, -67.4897, stateName = "Aragua", cityName = "Villa de Cura"),
                LocationPoint("El Limón - MBI", "Av. Universidad / Entrada a Ocumare", 10.2785, -67.6322, stateName = "Aragua", cityName = "El Limón"),
                LocationPoint("Terminal Central de Maracay", "Av. Constitución, Rutas Interurbanas", 10.2425, -67.5950, stateName = "Aragua", cityName = "Maracay"),
                LocationPoint("Bahía de Cata / El Playón", "Costa de Aragua", 10.4936, -67.7428, stateName = "Aragua", cityName = "Ocumare de la Costa"),
                LocationPoint("Choroní / Playa Grande", "Pueblo y Costa de Aragua", 10.5050, -67.6150, stateName = "Aragua", cityName = "Choroní")
            )
        ),
        StateRegion(
            id = "carabobo",
            name = "Carabobo",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "Región Central • Eje Industrial",
            citiesAndTowns = listOf("Valencia", "Naguanagua", "San Diego", "Guacara", "Puerto Cabello", "Los Guayos"),
            cities = listOf(
                CityInfo("Valencia", "Capital de Carabobo", listOf(LocationPoint("Centro de Valencia", "Av. Cedeño con Av. Bolívar", 10.1820, -68.0010, stateName = "Carabobo", cityName = "Valencia"))),
                CityInfo("Naguanagua", "Zona Comercial Norte", listOf(LocationPoint("CC Sambil Valencia", "Naguanagua, Autopista del Este", 10.2580, -67.9950, stateName = "Carabobo", cityName = "Naguanagua"))),
                CityInfo("San Diego", "Municipio San Diego", listOf(LocationPoint("San Diego", "Av. Don Julio Centeno", 10.2510, -67.9520, stateName = "Carabobo", cityName = "San Diego"))),
                CityInfo("Guacara", "Carretera Nacional", listOf(LocationPoint("Guacara Centro", "Carretera Nacional Valencia-Maracay", 10.2310, -67.8770, stateName = "Carabobo", cityName = "Guacara"))),
                CityInfo("Puerto Cabello", "Eje Costero", listOf(LocationPoint("Puerto Cabello", "Malecón y Terminal Marítimo", 10.4720, -68.0120, stateName = "Carabobo", cityName = "Puerto Cabello")))
            ),
            popularPoints = listOf(
                LocationPoint("CC Sambil Valencia", "Naguanagua, Autopista del Este", 10.2580, -67.9950, stateName = "Carabobo", cityName = "Naguanagua"),
                LocationPoint("Centro de Valencia", "Av. Cedeño con Av. Bolívar", 10.1820, -68.0010, stateName = "Carabobo", cityName = "Valencia"),
                LocationPoint("San Diego", "Av. Don Julio Centeno", 10.2510, -67.9520, stateName = "Carabobo", cityName = "San Diego"),
                LocationPoint("Guacara Centro", "Carretera Nacional Valencia-Maracay", 10.2310, -67.8770, stateName = "Carabobo", cityName = "Guacara"),
                LocationPoint("Puerto Cabello", "Malecón y Terminal Marítimo", 10.4720, -68.0120, stateName = "Carabobo", cityName = "Puerto Cabello")
            )
        ),
        StateRegion(
            id = "guarico",
            name = "Guárico",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "Conexión Llanos Centrales",
            citiesAndTowns = listOf("San Juan de los Morros", "Calabozo", "Valle de la Pascua", "Ortiz"),
            cities = listOf(
                CityInfo("San Juan de los Morros", "Capital de Guárico", listOf(LocationPoint("San Juan de los Morros", "Av. Bolívar / San Juanote", 9.9110, -67.3540, stateName = "Guárico", cityName = "San Juan de los Morros"))),
                CityInfo("Calabozo", "Ciudad Colonial", listOf(LocationPoint("Calabozo Centro", "Plaza Bolívar / Villa Colonial", 8.9240, -67.4280, stateName = "Guárico", cityName = "Calabozo"))),
                CityInfo("Valle de la Pascua", "Llanos Nororientales", listOf(LocationPoint("Valle de la Pascua", "Av. Rómulo Gallegos", 9.2150, -66.0120, stateName = "Guárico", cityName = "Valle de la Pascua"))),
                CityInfo("Ortiz", "Pueblo Histórico", listOf(LocationPoint("Ortiz", "Pueblo Histórico, Carretera Nacional", 9.6220, -67.2880, stateName = "Guárico", cityName = "Ortiz")))
            ),
            popularPoints = listOf(
                LocationPoint("San Juan de los Morros", "Av. Bolívar / San Juanote", 9.9110, -67.3540, stateName = "Guárico", cityName = "San Juan de los Morros"),
                LocationPoint("Calabozo Centro", "Plaza Bolívar / Villa Colonial", 8.9240, -67.4280, stateName = "Guárico", cityName = "Calabozo"),
                LocationPoint("Valle de la Pascua", "Av. Rómulo Gallegos", 9.2150, -66.0120, stateName = "Guárico", cityName = "Valle de la Pascua"),
                LocationPoint("Ortiz", "Pueblo Histórico, Carretera Nacional", 9.6220, -67.2880, stateName = "Guárico", cityName = "Ortiz")
            )
        ),
        StateRegion(
            id = "capital",
            name = "Distrito Capital",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "Conexión Capitalina",
            citiesAndTowns = listOf("Caracas", "Chacao", "El Silencio", "Petare"),
            cities = listOf(
                CityInfo("Caracas", "Capital de la República", listOf(
                    LocationPoint("Plaza Venezuela", "Torre La Previsora, Caracas", 10.4969, -66.8837, stateName = "Distrito Capital", cityName = "Caracas"),
                    LocationPoint("Terminal La Bandera", "Salidas hacia Maracay y Valencia", 10.4770, -66.9050, stateName = "Distrito Capital", cityName = "Caracas")
                )),
                CityInfo("Chacao", "Municipio Chacao", listOf(
                    LocationPoint("Sambil Chacao", "Av. Libertador, Caracas", 10.4905, -66.8601, stateName = "Distrito Capital", cityName = "Chacao")
                ))
            ),
            popularPoints = listOf(
                LocationPoint("Obelisco de Plaza Francia", "Plaza Altamira, Chacao, Caracas", 10.4960, -66.8524, stateName = "Distrito Capital", cityName = "Chacao"),
                LocationPoint("Las Mercedes, Caracas", "Av. Principal de Las Mercedes, Baruta", 10.4815, -66.8625, stateName = "Distrito Capital", cityName = "Caracas"),
                LocationPoint("Plaza Venezuela", "Torre La Previsora, Caracas", 10.4969, -66.8837, stateName = "Distrito Capital", cityName = "Caracas"),
                LocationPoint("Sambil Chacao", "Av. Libertador, Caracas", 10.4905, -66.8601, stateName = "Distrito Capital", cityName = "Chacao"),
                LocationPoint("Terminal La Bandera", "Salidas hacia Maracay y Valencia", 10.4770, -66.9050, stateName = "Distrito Capital", cityName = "Caracas")
            )
        )
    ),
    val otherStatesRoadmap: List<String> = listOf(
        "Anzoátegui", "Apure", "Barinas", "Bolívar", "Cojedes", "Delta Amacuro",
        "Falcón", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
        "Portuguesa", "Sucre", "Táchira", "Trujillo", "La Guaira", "Yaracuy",
        "Zulia", "Amazonas"
    ),
    val selectedStateId: String = "aragua", // Default Launch Hub
    val selectedCityName: String = "Maracay", // Default City in Aragua
    // Origin configured for Maracay, Aragua (Sede de Lanzamiento)
    val origin: LocationPoint = LocationPoint(
        title = "Av. Bolívar Este, Maracay",
        subtitle = "Maracay, Estado Aragua (Sede Principal Llégate)",
        lat = 10.2458,
        lng = -67.5855,
        isCurrentGps = true,
        stateName = "Aragua",
        cityName = "Maracay"
    ),
    val destination: LocationPoint = LocationPoint(
        title = "CC Parque Aragua",
        subtitle = "Av. Bolívar Este, Maracay, Aragua",
        lat = 10.2465,
        lng = -67.5800,
        stateName = "Aragua",
        cityName = "Maracay"
    ),
    val showCitySelectorModal: Boolean = false,
    val showStateSelectorModal: Boolean = false,
    // SEED INITIAL COMPLETED TRIPS FOR "MI HISTORIAL"
    val tripHistory: List<TripHistoryItem> = listOf(
        TripHistoryItem(
            id = "viaje_001",
            date = "Hoy, 10:15 AM",
            serviceType = ServiceType.MOTO,
            origin = LocationPoint("Av. Bolívar Este, Maracay", "Maracay, Estado Aragua", 10.2458, -67.5855, stateName = "Aragua", cityName = "Maracay"),
            destination = LocationPoint("CC Parque Aragua", "Maracay, Estado Aragua", 10.2465, -67.5800, stateName = "Aragua", cityName = "Maracay"),
            priceUsd = 1.80,
            priceBs = 1600.67,
            driverName = "Wilmer Rondón",
            driverAlias = "\"El Catire\"",
            driverVehicle = "Bera SBR 150cc Azul",
            driverPlate = "AB123CD",
            ratingGiven = 5,
            paymentMethod = PaymentMethod.PAGO_MOVIL
        ),
        TripHistoryItem(
            id = "viaje_002",
            date = "Ayer, 4:30 PM",
            serviceType = ServiceType.CAR,
            origin = LocationPoint("Las Delicias / CC Las Américas", "Maracay, Estado Aragua", 10.2612, -67.5991, stateName = "Aragua", cityName = "Maracay"),
            destination = LocationPoint("Centro de Cagua", "Plaza Sucre / Cagua", 10.1873, -67.4589, stateName = "Aragua", cityName = "Cagua"),
            priceUsd = 4.50,
            priceBs = 4001.67,
            driverName = "Yorbis José Briceño",
            driverAlias = "\"El Pana\"",
            driverVehicle = "Toyota Yaris Sedan Plateado",
            driverPlate = "AG456LM",
            ratingGiven = 5,
            paymentMethod = PaymentMethod.EFECTIVO_USD
        )
    ),
    val upcomingServices: List<UpcomingService> = listOf(
        UpcomingService(
            id = "vans",
            title = "Vans Turísticas & Ejecutivas",
            subtitle = "Playas de Ocumare, Choroní, Morrocoy o traslados corporativos",
            description = "Unidades de 6 a 14 puestos equipadas para turismo hacia playas de Ocumare de la Costa, Choroní, Colonia Tovar, Morrocoy o traslados entre Maracay, Valencia y Caracas con asistencia en carretera.",
            iconType = "van",
            highlightPerk = "Turismo Costero Ocumare & Choroní"
        ),
        UpcomingService(
            id = "buses",
            title = "Autobús Interurbano Central & Frontera",
            subtitle = "Rutas ARC: Maracay ↔ Valencia ↔ San Juan ↔ Caracas",
            description = "Salidas programadas y boletos digitales para viajes de media y larga distancia por la Autopista Regional del Centro, conexión a los Llanos (Guárico) y cruce internacional hacia San Cristóbal / Cúcuta.",
            iconType = "bus",
            highlightPerk = "Maracay ↔ Valencia ↔ San Juan"
        ),
        UpcomingService(
            id = "encomiendas",
            title = "Encomiendas & Moto Express",
            subtitle = "Envíos en menos de 45 min en Aragua y ciudades aliadas",
            description = "Entrega rápida de comida, medicinas y documentos confidenciales en moto. Cobertura en Maracay, Cagua, Turmero, La Victoria y Valencia con cajón hermético impermeable de hasta 15 kg.",
            iconType = "package",
            highlightPerk = "Cajón térmico con aislamiento"
        ),
        UpcomingService(
            id = "carga_repuestos",
            title = "Carga & Repuestos Automotrices",
            subtitle = "Zona Industrial Aragua-Carabobo y mudanzas express",
            description = "Vehículos tipo pick-up y vans de carga para trasladar piezas de motor, repuestos automotrices de las zonas industriales de Maracay, Cagua y Valencia con guía de despacho rastreable.",
            iconType = "truck",
            highlightPerk = "Eje Industrial Aragua-Carabobo"
        )
    ),
    val automotivePartners: List<AutomotivePartner> = listOf(
        AutomotivePartner(
            name = "Bera Motors Maracay - Concesionario Central",
            category = "Agencia Central de Motos",
            location = "Av. Bolívar Oeste, Maracay, Edo. Aragua",
            benefit = "Bono $80 para conductores Llégate",
            description = "Financiamiento directo con entrega inmediata para conductores en Aragua. Incluye 3 cambios de aceite gratis en taller autorizado."
        ),
        AutomotivePartner(
            name = "Empire Keeway Motors Valencia & Maracay",
            category = "Agencia de Motos y Repuestos",
            location = "Av. Bolívar Norte (Valencia) y Av. Los Cedros (Maracay)",
            benefit = "Tasa preferencial para flotas",
            description = "Modelos de alta durabilidad para mototaxi y encomiendas en la ARC. Servicio técnico especializado y repuestos originales disponibles."
        ),
        AutomotivePartner(
            name = "Duncan Baterías Express Aragua",
            category = "Centro de Distribución",
            location = "Av. Constitución, Maracay (Instalación a domicilio)",
            benefit = "20% OFF para miembros Llégate",
            description = "Batería Duncan 800/1000 AMP con instalación a domicilio gratis en Maracay, Cagua y Turmero. Garantía nacional 18 meses."
        )
    ),
    val motoEstimate: PriceEstimate? = null,
    val carEstimate: PriceEstimate? = null,
    val deliveryEstimate: PriceEstimate? = null,
    val isDriverMode: Boolean = false,
    val selectedSafeMeetingPointId: String? = null,
    val showTripCustomization: Boolean = false,
    val customizationPreferences: Set<String> = setOf("Aire Acondicionado Full", "Casco Limpio"),
    val selectedPaymentMethod: PaymentMethod = PaymentMethod.PAGO_MOVIL,
    val driverNote: String = "",
    val activeTrip: ActiveTrip? = null,
    val bcvExchangeRate: Double = 889.26,
    val isFetchingBcvRate: Boolean = false,
    val isFetchingGps: Boolean = false,
    val selectedUpcomingService: UpcomingService? = null,
    val showCuentaModal: Boolean = false,
    val showVitrinaModal: Boolean = false,
    val showCancelDialog: Boolean = false,
    val showTripRatingSheet: Boolean = false,
    val tripRating: Int = 5,
    val selectedTipUsd: Double = 0.0,
    val config: ConfigApp? = null,
    val cuenta: Usuario? = null,
    val billetera: Billetera? = null,
    val movimientos: List<Movimiento> = emptyList(),
    val viajes: List<Viaje> = emptyList(),
    val pagos: List<Pago> = emptyList(),
    val metodosRecarga: List<MetodoPagoDisponible> = emptyList(),
    val cargandoBilletera: Boolean = false,
    val showRecargaModal: Boolean = false,
    val pasoRecarga: PasoRecarga = PasoRecarga.MONTO,
    val recargaMontoUsd: Double = 10.0,
    val recargaMetodo: String = "pago_movil",
    val recargaReferencia: String = "",
    val pagoEnCurso: Pago? = null,
    val enviandoRecarga: Boolean = false,
    val pasoInicio: PasoInicio = PasoInicio.DATOS,
    val telefono: String = "",
    val nombre: String = "",
    val codigo: String = "",
    val aceptaTerminos: Boolean = false,
    val revisandoSesion: Boolean = false,
    val enviandoCodigo: Boolean = false,
    val verificandoCodigo: Boolean = false,
    val reenvioEn: Int = 0,
    val statusMessage: String? = null,
    // MODERN DYNAMIC GPS, TELEMETRY & COMMUNITY
    val mapDisplayMode: MapDisplayMode = MapDisplayMode.LIVE_TRAFFIC,
    val gpsTelemetry: GpsTelemetry = GpsTelemetry(),
    val nearbyVehicles: List<NearbyVehicle> = listOf(
        NearbyVehicle("moto_1", ServiceType.MOTO, "Pana Carlos", "Bera SBR 150cc Azul", "AB345KL", 0.44f, 0.46f, 32f, 2),
        NearbyVehicle("moto_2", ServiceType.MOTO, "Pana Yorman", "Keeway Horse 150 Roja", "AF912MN", 0.62f, 0.35f, 115f, 4),
        NearbyVehicle("moto_3", ServiceType.MOTO, "Pana Wilmer", "Bera Socialista 150 Negra", "AK780XY", 0.30f, 0.65f, 210f, 3),
        NearbyVehicle("moto_4", ServiceType.MOTO, "Pana Luis", "Haojue Cool 150 Plateada", "AO112RT", 0.74f, 0.72f, 290f, 5),
        NearbyVehicle("car_1", ServiceType.CAR, "Pana Yorbis", "Toyota Corolla Blanco (Aire)", "AE678ZZ", 0.54f, 0.54f, 85f, 4),
        NearbyVehicle("car_2", ServiceType.CAR, "Pana Richard", "Chevrolet Aveo Dorado", "AD432TY", 0.24f, 0.40f, 175f, 6),
        NearbyVehicle("car_3", ServiceType.CAR, "Pana Daniel", "Hyundai Accent Gris", "AB990PQ", 0.80f, 0.48f, 260f, 7)
    ),
    val communityAlerts: List<CommunityAlert> = listOf(
        CommunityAlert(
            id = "alert_1",
            type = CommunityAlertType.POLICE_CHECKPOINT,
            title = "Alcabala Peaje Palo Negro / ARC",
            description = "Punto de control preventivo activo. Tráfico fluido, documentación en regla.",
            locationName = "Distribuidor Palo Negro - ARC",
            xRatio = 0.65f,
            yRatio = 0.28f,
            reportedBy = "Pana Yorman (Moto)",
            reportedMinutesAgo = 4,
            confirmations = 12,
            userConfirmed = false
        ),
        CommunityAlert(
            id = "alert_2",
            type = CommunityAlertType.TRAFFIC_JAM,
            title = "Cola por Semáforo / Obras",
            description = "Tráfico pesado en cruce con Av. Fuerzas Aéreas por mantenimiento vial.",
            locationName = "Av. Bolívar Este con Fuerzas Aéreas",
            xRatio = 0.38f,
            yRatio = 0.52f,
            reportedBy = "Pana Wilmer",
            reportedMinutesAgo = 8,
            confirmations = 9,
            userConfirmed = false
        ),
        CommunityAlert(
            id = "alert_3",
            type = CommunityAlertType.POTHOLE,
            title = "Hueco en canal derecho",
            description = "Hundimiento en asfalto después de la pasarela. Precaución a motos.",
            locationName = "Av. Constitución cerca del Terminal Central",
            xRatio = 0.46f,
            yRatio = 0.70f,
            reportedBy = "Pana Richard (Taxi)",
            reportedMinutesAgo = 16,
            confirmations = 15,
            userConfirmed = false
        ),
        CommunityAlert(
            id = "alert_4",
            type = CommunityAlertType.GAS_STATION,
            title = "Bomba E/S Bermúdez Surtidor Activo",
            description = "Gasolina subsidiada e internacional surtiendo rápido sin cola kilométrica.",
            locationName = "E/S Bermúdez con Av. Los Cedros",
            xRatio = 0.76f,
            yRatio = 0.58f,
            reportedBy = "Pana Carlos",
            reportedMinutesAgo = 11,
            confirmations = 21,
            userConfirmed = false
        )
    ),
    val locationSuggestions: List<LocationSuggestion> = listOf(
        LocationSuggestion("sug_1", "C.C. Las Américas", "Av. Las Delicias • Zona Comercial y Gastronómica", "Centro Comercial", 3.2, 7, 1.80, 10.2612, -67.5991, "🔥 Top Pana", "aragua", "Maracay"),
        LocationSuggestion("sug_2", "C.C. Parque Aragua", "Av. Bolívar Este • Bancos e Hiper Jumbo", "Centro Comercial", 1.8, 4, 1.40, 10.2458, -67.5855, "📍 Más Cercano", "aragua", "Maracay"),
        LocationSuggestion("sug_3", "Terminal Central de Maracay", "Av. Constitución • Rutas Urbanas e Interurbanas", "Terminal", 2.5, 6, 1.60, 10.2425, -67.5950, "🚌 Transporte", "aragua", "Maracay"),
        LocationSuggestion("sug_4", "C.C. Los Aviadores", "Autopista Maracay-Palo Negro • Zona Mall", "Centro Comercial", 6.8, 12, 2.80, 10.1865, -67.5620, "🛡️ Punto Seguro", "aragua", "Palo Negro"),
        LocationSuggestion("sug_5", "Plaza Bolívar de Maracay", "Teatro de la Ópera y Casco Histórico", "Punto Seguro", 2.1, 5, 1.50, 10.2480, -67.6000, "🏛️ Casco Histórico", "aragua", "Maracay"),
        LocationSuggestion("sug_6", "Parque Las Ballenas", "Av. Sucre • Food Trucks y Deporte", "Gastronomía", 4.0, 8, 2.00, 10.2580, -67.5850, "🍔 Panas & Food", "aragua", "Maracay"),
        LocationSuggestion("sug_7", "Hospital Central de Maracay", "Calle José María Vargas • Guardia 24h", "Salud", 2.9, 6, 1.70, 10.2540, -67.6040, "🏥 Urgencias", "aragua", "Maracay"),
        LocationSuggestion("sug_8", "C.C. Sambil Valencia", "Naguanagua • Autopista del Este", "Centro Comercial", 4.5, 9, 2.20, 10.2580, -67.9950, "🔥 Top Carabobo", "carabobo", "Naguanagua"),
        LocationSuggestion("sug_9", "Terminal Big Low Center", "San Diego • Salidas nacionales y buses", "Terminal", 5.2, 10, 2.40, 10.2100, -67.9600, "🚌 Terminal", "carabobo", "Valencia"),
        LocationSuggestion("sug_10", "Sambil Chacao", "Av. Libertador • Metro Chacao", "Centro Comercial", 3.0, 8, 2.00, 10.4905, -66.8601, "🔥 Top Capital", "capital", "Chacao")
    ),
    val selectedMapAlert: CommunityAlert? = null,
    val selectedVehicle: NearbyVehicle? = null,
    val showReportDialog: Boolean = false,
    val showFullMapExpanded: Boolean = false,
    val filterAlertCategory: CommunityAlertType? = null
) {
    val currentState: StateRegion
        get() = availableStates.firstOrNull { it.id == selectedStateId } ?: availableStates[0]

    val currentCity: CityInfo
        get() = currentState.cities.firstOrNull { it.name.equals(selectedCityName, ignoreCase = true) }
            ?: currentState.cities.firstOrNull()
            ?: CityInfo(selectedCityName, currentState.name, currentState.popularPoints)

    val currentPopularLocations: List<LocationPoint>
        get() = currentCity.points.ifEmpty { currentState.popularPoints }

    val currentSuggestions: List<LocationSuggestion>
        get() = locationSuggestions.filter { it.stateId.equals(selectedStateId, ignoreCase = true) }
            .ifEmpty { locationSuggestions.filter { it.stateId == "aragua" } }

    val filteredAlerts: List<CommunityAlert>
        get() = if (filterAlertCategory == null) communityAlerts else communityAlerts.filter { it.type == filterAlertCategory }

    val currentSafeMeetingPoints: List<SafeMeetingPoint>
        get() = when (selectedStateId) {
            "capital" -> listOf(
                SafeMeetingPoint("smp_cap_1", "Obelisco de Plaza Francia", "Bien iluminado · 20 m", "20 m", 10.4960, -66.8524),
                SafeMeetingPoint("smp_cap_2", "Salida Metro Altamira", "Zona concurrida · 60 m", "60 m", 10.4972, -66.8530),
                SafeMeetingPoint("smp_cap_3", "Esquina C.C. San Ignacio", "Fácil acceso vehicular · 120 m", "120 m", 10.4942, -66.8568),
                SafeMeetingPoint("smp_cap_4", "Torre La Previsora (Plaza Vzla)", "Punto seguro y concurrido · 45 m", "45 m", 10.4969, -66.8837)
            )
            "carabobo" -> listOf(
                SafeMeetingPoint("smp_car_1", "Entrada Sambil Valencia", "Vigilancia y bahía de taxis · 25 m", "25 m", 10.2580, -67.9950),
                SafeMeetingPoint("smp_car_2", "Metro Francisco de Miranda (Cedeño)", "Bien iluminado · 50 m", "50 m", 10.1820, -68.0010),
                SafeMeetingPoint("smp_car_3", "Redoma de Guaparo", "Punto concurrido y seguro · 70 m", "70 m", 10.2240, -68.0060)
            )
            "guarico" -> listOf(
                SafeMeetingPoint("smp_gua_1", "Plaza Bolívar San Juan", "Zona concurrida y alumbrada · 30 m", "30 m", 9.9110, -67.3540),
                SafeMeetingPoint("smp_gua_2", "Redoma El Hambre San Juan", "Fácil parada vehicular · 60 m", "60 m", 9.9050, -67.3610)
            )
            else -> listOf(
                SafeMeetingPoint("smp_ara_1", "Entrada Principal Parque Aragua", "Bien iluminado · 20 m", "20 m", 10.2458, -67.5855),
                SafeMeetingPoint("smp_ara_2", "Parada TransAragua Av. Bolívar", "Zona concurrida · 45 m", "45 m", 10.2465, -67.5870),
                SafeMeetingPoint("smp_ara_3", "Plaza Bolívar de Maracay", "Patrullaje y alumbrado led · 30 m", "30 m", 10.2480, -67.6000),
                SafeMeetingPoint("smp_ara_4", "Boulevard Las Delicias (CC Américas)", "Fácil acceso vehicular · 60 m", "60 m", 10.2612, -67.5991)
            )
        }
}

class LlegateViewModel(
    private val auth: AuthRepository,
    private val configRepo: ConfigRepository = ConfigRepository(),
    private val walletRepo: WalletRepository = WalletRepository(auth.http),
    private val pagoRepo: PagoRepository = PagoRepository(auth.http),
    private val tripRepo: TripRepository = TripRepository(auth.http)
) : ViewModel() {

    private val bcvRateService = BcvRateService()
    private val _uiState = MutableStateFlow(
        LlegateUiState(revisandoSesion = auth.tieneSesion)
    )
    val uiState: StateFlow<LlegateUiState> = _uiState.asStateFlow()

    private var tripSimulationJob: Job? = null
    private var reenvioJob: Job? = null

    init {
        recalculateEstimates()
        fetchBcvExchangeRate(showToast = false)
        cargarConfiguracion()
        revisarSesion()
    }

    /** `/config/app` manda precios y reglas; si no llega, la app sigue con los del APK. */
    fun cargarConfiguracion() {
        viewModelScope.launch {
            val config = try {
                configRepo.cargar()
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                null
            }
            _uiState.update { it.copy(config = config) }
            recalculateEstimates()
        }
    }

    fun revisarSesion() {
        if (!auth.tieneSesion) return
        viewModelScope.launch {
            val perfil = try {
                auth.perfil()
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                null
            }
            _uiState.update { it.copy(cuenta = perfil, revisandoSesion = false) }
            if (perfil != null) refrescarBilletera(silencioso = true)
        }
    }

    fun onTelefono(valor: String) {
        _uiState.update { it.copy(telefono = valor) }
    }

    fun onNombre(valor: String) {
        _uiState.update { it.copy(nombre = valor) }
    }

    fun onCodigo(valor: String) {
        _uiState.update { it.copy(codigo = valor.filter(Char::isDigit).take(6)) }
    }

    fun setAceptaTerminos(valor: Boolean) {
        _uiState.update { it.copy(aceptaTerminos = valor) }
    }

    fun volverAEditarTelefono() {
        _uiState.update { it.copy(pasoInicio = PasoInicio.DATOS, codigo = "") }
    }

    fun enviarCodigo() {
        val state = _uiState.value
        val e164 = aE164Venezuela(state.telefono)
        when {
            e164 == null -> avisar("Escribe un número venezolano, por ejemplo 0414 1234567.")
            state.nombre.isNotBlank() && !esNombrePersona(state.nombre) ->
                avisar("Escribe tu nombre y apellido como aparecen en tu cédula.")
            !state.aceptaTerminos ->
                avisar("Debes aceptar los términos para usar Llégate.")
            else -> viewModelScope.launch {
                _uiState.update { it.copy(enviandoCodigo = true) }
                try {
                    val mensaje = auth.pedirCodigo(e164, nombre = state.nombre.trim().ifBlank { null })
                    _uiState.update {
                        it.copy(
                            pasoInicio = PasoInicio.CODIGO,
                            codigo = "",
                            telefono = e164,
                            reenvioEn = SEGUNDOS_REENVIO,
                            statusMessage = mensaje
                        )
                    }
                    iniciarContadorReenvio()
                } catch (fallo: ApiException) {
                    _uiState.update { it.copy(statusMessage = fallo.message) }
                } catch (fallo: Exception) {
                    if (fallo is CancellationException) throw fallo
                    _uiState.update { it.copy(statusMessage = FALLA_GENERICO) }
                } finally {
                    _uiState.update { it.copy(enviandoCodigo = false) }
                }
            }
        }
    }

    fun verificarCodigo() {
        val state = _uiState.value
        val e164 = aE164Venezuela(state.telefono)
        when {
            e164 == null -> avisar("Escribe un número venezolano, por ejemplo 0414 1234567.")
            state.codigo.length != 6 -> avisar("El código tiene 6 dígitos.")
            else -> viewModelScope.launch {
                _uiState.update { it.copy(verificandoCodigo = true) }
                try {
                    auth.verificarCodigo(e164, state.codigo)
                    val perfil = auth.perfil()
                    _uiState.update {
                        it.copy(
                            cuenta = perfil,
                            revisandoSesion = false,
                            pasoInicio = PasoInicio.DATOS,
                            codigo = "",
                            statusMessage = "Listo, ${perfil.nombre?.substringBefore(' ') ?: "pana"}. Tu cuenta está activa."
                        )
                    }
                    refrescarBilletera(silencioso = true)
                } catch (fallo: ApiException) {
                    _uiState.update { it.copy(statusMessage = fallo.message) }
                } catch (fallo: Exception) {
                    if (fallo is CancellationException) throw fallo
                    _uiState.update { it.copy(statusMessage = FALLA_GENERICO) }
                } finally {
                    _uiState.update { it.copy(verificandoCodigo = false) }
                }
            }
        }
    }

    fun cerrarSesion() {
        viewModelScope.launch {
            auth.cerrarSesion()
            tripSimulationJob?.cancel()
            _uiState.update {
                it.copy(
                    cuenta = null,
                    billetera = null,
                    movimientos = emptyList(),
                    pagos = emptyList(),
                    showCuentaModal = false,
                    showRecargaModal = false,
                    pagoEnCurso = null,
                    currentScreen = AppScreen.HOME,
                    activeTrip = null,
                    pasoInicio = PasoInicio.DATOS,
                    codigo = "",
                    nombre = "",
                    statusMessage = "Sesión cerrada."
                )
            }
        }
    }

    // BILLETERA Y RECARGAS: /wallet y /payments, el mismo saldo que ve la web

    fun cargarBilletera() {
        viewModelScope.launch { refrescarBilletera() }
    }

    /** Lee saldo, movimientos, pagos e intenciones abiertas en un solo paso. */
    private suspend fun refrescarBilletera(silencioso: Boolean = false) {
        if (!auth.tieneSesion) return
        _uiState.update { it.copy(cargandoBilletera = true) }
        try {
            val billetera = walletRepo.billetera()
            val movimientos = walletRepo.movimientos()
            val pagos = pagoRepo.listar()
            val metodos = pagoRepo.metodos()
            _uiState.update {
                it.copy(
                    billetera = billetera,
                    movimientos = movimientos,
                    pagos = pagos,
                    metodosRecarga = metodos,
                    cargandoBilletera = false
                )
            }
        } catch (fallo: Exception) {
            if (fallo is CancellationException) throw fallo
            _uiState.update { it.copy(cargandoBilletera = false) }
            if (!silencioso) avisar(fallo.message ?: FALLA_GENERICO)
        }
        refrescarViajes()
    }

    /**
     * El historial y el viaje abierto salen de `/trips`. Si la llamada falla se queda
     * con lo que ya tenía: un problema leyendo viajes no puede tapar el saldo.
     */
    private suspend fun refrescarViajes() {
        val viajes = try {
            tripRepo.listar()
        } catch (fallo: Exception) {
            if (fallo is CancellationException) throw fallo
            return
        }
        _uiState.update { it.copy(viajes = viajes) }
    }

    /** La hoja de recarga siempre devuelve a la de cuenta: son dos pasos del mismo viaje. */
    fun mostrarRecarga(show: Boolean) {
        val pendiente = if (show) {
            _uiState.value.pagoEnCurso
                ?: _uiState.value.pagos.firstOrNull { it.estado == EstadoPago.PENDIENTE }
        } else {
            null
        }
        _uiState.update {
            it.copy(
                showRecargaModal = show,
                showCuentaModal = !show && it.cuenta != null,
                recargaMontoUsd = pendiente?.montoUsd ?: it.recargaMontoUsd,
                recargaMetodo = pendiente?.metodo ?: it.recargaMetodo,
                pasoRecarga = when {
                    !show -> PasoRecarga.MONTO
                    pendiente == null -> PasoRecarga.MONTO
                    !pendiente.referenciaReportada.isNullOrBlank() -> PasoRecarga.REPORTAR
                    else -> PasoRecarga.INSTRUCCIONES
                },
                recargaReferencia = "",
                pagoEnCurso = pendiente,
                enviandoRecarga = false
            )
        }
        if (show && _uiState.value.metodosRecarga.isEmpty()) cargarBilletera()
    }

    fun seleccionarMontoRecarga(montoUsd: Double) {
        _uiState.update { it.copy(recargaMontoUsd = montoUsd) }
    }

    fun seleccionarMetodoRecarga(metodoId: String) {
        _uiState.update { it.copy(recargaMetodo = metodoId) }
    }

    fun onRecargaReferencia(valor: String) {
        _uiState.update { it.copy(recargaReferencia = digitos(valor).take(12)) }
    }

    /** Crea la intención de pago real; Pago Móvil muestra los datos del comercio. */
    fun iniciarRecarga() {
        val state = _uiState.value
        if (state.enviandoRecarga) return
        viewModelScope.launch {
            _uiState.update { it.copy(enviandoRecarga = true) }
            try {
                val pago = pagoRepo.crearIntento(state.recargaMetodo, state.recargaMontoUsd)
                _uiState.update {
                    it.copy(
                        pagoEnCurso = pago,
                        pasoRecarga = PasoRecarga.INSTRUCCIONES,
                        enviandoRecarga = false
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                _uiState.update { it.copy(enviandoRecarga = false) }
                avisar(fallo.message ?: FALLA_GENERICO)
            }
        }
    }

    /** El pana ya pagó en su banco: pasamos a que escriba la referencia. */
    fun irAReportarRecarga() {
        _uiState.update { it.copy(pasoRecarga = PasoRecarga.REPORTAR) }
    }

    fun volverALosDatosDeRecarga() {
        _uiState.update { it.copy(pasoRecarga = PasoRecarga.INSTRUCCIONES, recargaReferencia = "") }
    }

    fun abrirCheckout(context: Context) {
        val url = _uiState.value.pagoEnCurso?.checkoutUrl ?: return
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: Exception) {
            avisar("No pudimos abrir el pago de Binance Pay en este teléfono.")
        }
    }

    /** Reporta la referencia del banco; el saldo entra cuando un admin aprueba la recarga. */
    fun confirmarRecarga() {
        val state = _uiState.value
        val pago = state.pagoEnCurso ?: return
        if (!esReferenciaPagoMovil(state.recargaReferencia)) {
            avisar("La referencia del Pago Móvil son 6 a 12 dígitos, sin espacios.")
            return
        }
        if (state.enviandoRecarga) return
        viewModelScope.launch {
            _uiState.update { it.copy(enviandoRecarga = true) }
            try {
                pagoRepo.reportar(pago.id, state.recargaReferencia)
                refrescarBilletera(silencioso = true)
                val minutos = _uiState.value.billetera?.limites?.slaAprobacionMinutos ?: 15
                _uiState.update {
                    it.copy(
                        enviandoRecarga = false,
                        pagoEnCurso = null,
                        recargaReferencia = "",
                        showRecargaModal = false,
                        showCuentaModal = it.cuenta != null,
                        statusMessage = "Recarga de ${usd(pago.montoUsd)} reportada. " +
                            "Queda en revisión y entra al saldo en unos $minutos minutos."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                _uiState.update { it.copy(enviandoRecarga = false) }
                avisar(fallo.message ?: FALLA_GENERICO)
            }
        }
    }

    /** Deja sin efecto una intención pendiente para no dejar pagos colgando. */
    fun descartarRecarga() {
        val pago = _uiState.value.pagoEnCurso ?: return
        viewModelScope.launch {
            try {
                pagoRepo.cancelar(pago.id)
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
            }
            _uiState.update {
                it.copy(
                    pagoEnCurso = null,
                    pasoRecarga = PasoRecarga.MONTO,
                    showRecargaModal = false,
                    showCuentaModal = it.cuenta != null
                )
            }
        }
    }

    private fun iniciarContadorReenvio() {
        reenvioJob?.cancel()
        reenvioJob = viewModelScope.launch {
            while (_uiState.value.reenvioEn > 0) {
                delay(1000)
                _uiState.update { it.copy(reenvioEn = (it.reenvioEn - 1).coerceAtLeast(0)) }
            }
        }
    }

    private fun avisar(mensaje: String) {
        _uiState.update { it.copy(statusMessage = mensaje) }
    }

    private companion object {
        const val SEGUNDOS_REENVIO = 30
        const val FALLA_GENERICO = "No pudimos comunicarte con Llégate. Intenta de nuevo."
    }

    fun selectState(stateId: String) {
        val state = _uiState.value.availableStates.firstOrNull { it.id == stateId } ?: return
        val defaultCity = state.cities.firstOrNull()?.name ?: state.citiesAndTowns.firstOrNull() ?: "Centro"
        val newDefaultOrigin = state.popularPoints.firstOrNull() ?: _uiState.value.origin
        val newDefaultDest = state.popularPoints.getOrNull(1) ?: state.popularPoints.firstOrNull() ?: _uiState.value.destination

        _uiState.update {
            it.copy(
                selectedStateId = stateId,
                selectedCityName = defaultCity,
                origin = newDefaultOrigin,
                destination = newDefaultDest,
                showStateSelectorModal = false,
                statusMessage = "Región: ${state.name} • ${defaultCity}"
            )
        }
        recalculateEstimates()
    }

    fun selectCity(city: CityInfo) {
        val firstPoint = city.points.firstOrNull() ?: _uiState.value.origin
        val secondPoint = city.points.getOrNull(1) ?: _uiState.value.destination
        _uiState.update {
            it.copy(
                selectedCityName = city.name,
                origin = firstPoint,
                destination = secondPoint,
                showCitySelectorModal = false,
                statusMessage = "Ciudad fijada: ${city.name}, ${it.currentState.name}"
            )
        }
        recalculateEstimates()
    }

    fun showStateSelector(show: Boolean) {
        _uiState.update { it.copy(showStateSelectorModal = show) }
    }

    fun showCitySelector(show: Boolean) {
        _uiState.update { it.copy(showCitySelectorModal = show) }
    }

    fun openTripHistory() {
        _uiState.update { it.copy(currentScreen = AppScreen.TRIP_HISTORY) }
    }

    fun repeatTrip(historyItem: TripHistoryItem) {
        _uiState.update {
            it.copy(
                origin = historyItem.origin,
                destination = historyItem.destination,
                selectedService = historyItem.serviceType,
                selectedPaymentMethod = historyItem.paymentMethod,
                currentScreen = AppScreen.BOOKING_DETAILS,
                statusMessage = "Ruta cargada desde historial: ${historyItem.destination.title}"
            )
        }
        recalculateEstimates()
    }

    fun fetchBcvExchangeRate(showToast: Boolean = true) {
        viewModelScope.launch {
            _uiState.update { it.copy(isFetchingBcvRate = true) }
            val tasa = bcvRateService.fetchOfficialRate()
            _uiState.update {
                if (tasa == null) {
                    it.copy(
                        isFetchingBcvRate = false,
                        statusMessage = if (showToast)
                            "No pudimos traer la tasa BCV; seguimos con ${String.format(Locale.US, "%.2f", it.bcvExchangeRate)} Bs/$."
                        else it.statusMessage
                    )
                } else {
                    it.copy(
                        bcvExchangeRate = (tasa * 100).roundToInt() / 100.0,
                        isFetchingBcvRate = false,
                        statusMessage = if (showToast)
                            "Tasa BCV actualizada: ${String.format(Locale.US, "%.2f", tasa)} Bs/$"
                        else it.statusMessage
                    )
                }
            }
            recalculateEstimates()
        }
    }

    fun selectService(serviceType: ServiceType) {
        _uiState.update { it.copy(selectedService = serviceType) }
    }

    fun openBooking(serviceType: ServiceType? = null) {
        if (serviceType != null) {
            _uiState.update { it.copy(selectedService = serviceType) }
        }
        recalculateEstimates()
        _uiState.update { it.copy(currentScreen = AppScreen.BOOKING_DETAILS) }
    }

    fun navigateToHome() {
        _uiState.update { it.copy(currentScreen = AppScreen.HOME) }
    }

    fun updateOrigin(newOrigin: LocationPoint) {
        _uiState.update { it.copy(origin = newOrigin) }
        recalculateEstimates()
    }

    fun updateDestination(newDestination: LocationPoint) {
        _uiState.update { it.copy(destination = newDestination) }
        recalculateEstimates()
    }

    fun setDriverNote(note: String) {
        _uiState.update { it.copy(driverNote = note) }
    }

    fun selectPaymentMethod(method: PaymentMethod) {
        _uiState.update { it.copy(selectedPaymentMethod = method) }
    }

    fun showUpcomingDialog(service: UpcomingService?) {
        _uiState.update { it.copy(selectedUpcomingService = service) }
    }

    fun mostrarCuenta(show: Boolean) {
        _uiState.update { it.copy(showCuentaModal = show) }
    }

    fun showVitrina(show: Boolean) {
        _uiState.update { it.copy(showVitrinaModal = show) }
    }

    fun showCancelPrompt(show: Boolean) {
        _uiState.update { it.copy(showCancelDialog = show) }
    }

    fun setTripRating(stars: Int) {
        _uiState.update { it.copy(tripRating = stars) }
    }

    fun setTipUsd(tip: Double) {
        _uiState.update { it.copy(selectedTipUsd = tip) }
    }

    fun closeRatingSheetAndFinish() {
        tripSimulationJob?.cancel()
        val completedTrip = _uiState.value.activeTrip
        val newHistoryItem = completedTrip?.let { trip ->
            TripHistoryItem(
                id = "viaje_${System.currentTimeMillis()}",
                date = "Reciente",
                serviceType = trip.serviceType,
                origin = trip.origin,
                destination = trip.destination,
                priceUsd = trip.priceEstimate.priceUsd,
                priceBs = trip.priceEstimate.priceBs,
                driverName = trip.driver.name,
                driverAlias = trip.driver.alias,
                driverVehicle = trip.driver.vehicleModel,
                driverPlate = trip.driver.plate,
                ratingGiven = _uiState.value.tripRating,
                paymentMethod = trip.paymentMethod
            )
        }

        _uiState.update { state ->
            val updatedHistory = if (newHistoryItem != null) {
                listOf(newHistoryItem) + state.tripHistory
            } else {
                state.tripHistory
            }
            state.copy(
                tripHistory = updatedHistory,
                showTripRatingSheet = false,
                activeTrip = null,
                currentScreen = AppScreen.HOME,
                statusMessage = "¡Carrera completada y guardada en Mi Historial!"
            )
        }
    }

    fun cancelTrip(reason: String) {
        tripSimulationJob?.cancel()
        _uiState.update {
            it.copy(
                showCancelDialog = false,
                activeTrip = null,
                currentScreen = AppScreen.HOME,
                statusMessage = "Viaje cancelado: $reason"
            )
        }
    }

    fun clearStatusMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }

    @SuppressLint("MissingPermission")
    fun requestCurrentGpsLocation(context: Context) {
        _uiState.update { it.copy(isFetchingGps = true) }
        try {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            fusedClient.lastLocation.addOnSuccessListener { loc ->
                if (loc != null) {
                    val lat = loc.latitude
                    val lng = loc.longitude
                    var streetName = "Mi Ubicación Actual"
                    var locality = "GPS Verificado • Aragua"
                    try {
                        val geocoder = Geocoder(context, Locale.getDefault())
                        val addresses = geocoder.getFromLocation(lat, lng, 1)
                        if (!addresses.isNullOrEmpty()) {
                            val addr = addresses[0]
                            streetName = addr.thoroughfare ?: addr.featureName ?: "Ubicación Actual"
                            locality = "${addr.subLocality ?: addr.locality ?: _uiState.value.selectedCityName}, ${addr.adminArea ?: _uiState.value.currentState.name}"
                        }
                    } catch (_: Exception) {
                    }
                    val newPoint = LocationPoint(
                        title = streetName,
                        subtitle = locality,
                        lat = lat,
                        lng = lng,
                        isCurrentGps = true,
                        stateName = _uiState.value.currentState.name,
                        cityName = _uiState.value.selectedCityName
                    )
                    _uiState.update {
                        it.copy(
                            origin = newPoint,
                            isFetchingGps = false,
                            statusMessage = "¡Ubicación GPS detectada, pana!"
                        )
                    }
                    recalculateEstimates()
                } else {
                    fallbackGpsLocation()
                }
            }.addOnFailureListener {
                fallbackGpsLocation()
            }
        } catch (_: Exception) {
            fallbackGpsLocation()
        }
    }

    private fun fallbackGpsLocation() {
        val currentState = _uiState.value.currentState
        val currentCity = _uiState.value.currentCity
        val fallbackPoint = currentCity.points.firstOrNull() ?: LocationPoint(
            title = "Av. Bolívar Este, Maracay",
            subtitle = "Maracay, Estado Aragua (Sede Llégate)",
            lat = 10.2458,
            lng = -67.5855,
            isCurrentGps = true,
            stateName = currentState.name,
            cityName = currentCity.name
        )
        _uiState.update {
            it.copy(
                origin = fallbackPoint,
                isFetchingGps = false,
                statusMessage = "Ubicación fijada en ${fallbackPoint.title}"
            )
        }
        recalculateEstimates()
    }

    private fun recalculateEstimates() {
        val state = _uiState.value
        val distance = calculateDistanceKm(
            state.origin.lat,
            state.origin.lng,
            state.destination.lat,
            state.destination.lng
        ).coerceAtLeast(1.5)

        val motoSpeedKmH = 34.0
        val carSpeedKmH = 22.0

        val motoEta = ((distance / motoSpeedKmH) * 60).roundToInt().coerceAtLeast(4)
        val carEta = ((distance / carSpeedKmH) * 60).roundToInt().coerceAtLeast(7)
        val deliverySpeedKmH = 30.0
        val deliveryEta = ((distance / deliverySpeedKmH) * 60).roundToInt().coerceAtLeast(6)

        val motoUsd = tarifaUsd(state.config, ServiceType.MOTO, distance, motoEta)
        val carUsd = tarifaUsd(state.config, ServiceType.CAR, distance, carEta)
        val deliveryUsd = tarifaUsd(state.config, ServiceType.DELIVERY, distance, deliveryEta)

        val motoBs = (motoUsd * state.bcvExchangeRate)
        val carBs = (carUsd * state.bcvExchangeRate)
        val deliveryBs = (deliveryUsd * state.bcvExchangeRate)

        _uiState.update {
            it.copy(
                motoEstimate = PriceEstimate(
                    serviceType = ServiceType.MOTO,
                    distanceKm = (distance * 10).roundToInt() / 10.0,
                    etaMinutes = motoEta,
                    priceUsd = (motoUsd * 100).roundToInt() / 100.0,
                    priceBs = (motoBs * 100).roundToInt() / 100.0
                ),
                carEstimate = PriceEstimate(
                    serviceType = ServiceType.CAR,
                    distanceKm = (distance * 10).roundToInt() / 10.0,
                    etaMinutes = carEta,
                    priceUsd = (carUsd * 100).roundToInt() / 100.0,
                    priceBs = (carBs * 100).roundToInt() / 100.0
                ),
                deliveryEstimate = PriceEstimate(
                    serviceType = ServiceType.DELIVERY,
                    distanceKm = (distance * 10).roundToInt() / 10.0,
                    etaMinutes = deliveryEta,
                    priceUsd = (deliveryUsd * 100).roundToInt() / 100.0,
                    priceBs = (deliveryBs * 100).roundToInt() / 100.0
                )
            )
        }
    }

    fun toggleDriverMode(isDriver: Boolean) {
        val msg = if (isDriver) "Modo Piloto Llégate activado. ¡A rodar con los panas!" else "Modo Pasajero activado. ¡Listo para tu carrera!"
        _uiState.update { it.copy(isDriverMode = isDriver, statusMessage = msg) }
    }

    fun selectSafeMeetingPoint(meetingPoint: SafeMeetingPoint) {
        val newOrigin = LocationPoint(
            title = meetingPoint.title,
            subtitle = "${meetingPoint.tag} • ${meetingPoint.distanceText}",
            lat = meetingPoint.lat,
            lng = meetingPoint.lng,
            isCurrentGps = false,
            stateName = _uiState.value.currentState.name,
            cityName = _uiState.value.selectedCityName
        )
        _uiState.update {
            it.copy(
                selectedSafeMeetingPointId = meetingPoint.id,
                origin = newOrigin,
                statusMessage = "Punto de encuentro seguro: ${meetingPoint.title}"
            )
        }
        recalculateEstimates()
    }

    fun toggleTripCustomization() {
        _uiState.update { it.copy(showTripCustomization = !it.showTripCustomization) }
    }

    fun togglePreferenceTag(tag: String) {
        _uiState.update { state ->
            val set = state.customizationPreferences.toMutableSet()
            if (set.contains(tag)) set.remove(tag) else set.add(tag)
            state.copy(customizationPreferences = set)
        }
    }

    fun requestStateExpansion(stateName: String) {
        _uiState.update {
            it.copy(statusMessage = "¡Voto registrado para activar $stateName! Gracias por apoyar la expansión 🇻🇪")
        }
    }

    private fun calculateDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }

    fun swapOriginAndDestination() {
        val curOrigin = _uiState.value.origin
        val curDest = _uiState.value.destination
        _uiState.update {
            it.copy(
                origin = curDest,
                destination = curOrigin,
                statusMessage = "Ruta invertida: ${curDest.title} ⇄ ${curOrigin.title}"
            )
        }
        recalculateEstimates()
    }

    fun sendRideRequestToNearbyDrivers() {
        val nearbyCount = _uiState.value.nearbyVehicles.size
        _uiState.update {
            it.copy(statusMessage = "Enviando solicitud a $nearbyCount conductores cercanos en la zona...")
        }
        confirmAndStartTrip()
    }

    fun confirmAndStartTrip() {
        val state = _uiState.value
        val estimate = when (state.selectedService) {
            ServiceType.MOTO -> state.motoEstimate ?: PriceEstimate(ServiceType.MOTO, 3.2, 7, 2.48, 2205.36)
            ServiceType.CAR -> state.carEstimate ?: PriceEstimate(ServiceType.CAR, 3.2, 14, 4.90, 4357.37)
            ServiceType.DELIVERY -> state.deliveryEstimate ?: PriceEstimate(ServiceType.DELIVERY, 3.2, 8, 2.65, 2356.54)
        }

        val driver = when (state.selectedService) {
            ServiceType.MOTO -> DriverProfile(
                name = "Wilmer Rondón",
                alias = "\"El Catire\"",
                rating = 4.98,
                tripsCount = 1420,
                vehicleModel = "Bera SBR 150cc",
                vehicleColor = "Azul Metalizado",
                plate = "AB123CD",
                phone = "+58 412 555-8921",
                pinCode = "8492"
            )
            ServiceType.CAR -> DriverProfile(
                name = "Yorbis José Briceño",
                alias = "\"El Pana\"",
                rating = 4.96,
                tripsCount = 2150,
                vehicleModel = "Toyota Yaris Sedan",
                vehicleColor = "Plateado Nítido",
                plate = "AG456LM",
                phone = "+58 414 777-3310",
                pinCode = "3721"
            )
            ServiceType.DELIVERY -> DriverProfile(
                name = "Carlos Márquez",
                alias = "\"Flash\"",
                rating = 4.99,
                tripsCount = 980,
                vehicleModel = "Empire Keeway Horse 150cc",
                vehicleColor = "Negro / Caja Térmica",
                plate = "AK902PX",
                phone = "+58 416 333-1245",
                pinCode = "5190"
            )
        }

        val trip = ActiveTrip(
            serviceType = state.selectedService,
            origin = state.origin,
            destination = state.destination,
            priceEstimate = estimate,
            paymentMethod = state.selectedPaymentMethod,
            driverNote = state.driverNote,
            driver = driver,
            currentStep = TripStep.SEARCHING_DRIVER,
            progressFraction = 0f,
            remainingSeconds = 180
        )

        _uiState.update {
            it.copy(
                activeTrip = trip,
                currentScreen = AppScreen.TRIP_ACTIVE
            )
        }

        startSimulationLifecycle()
    }

    private fun startSimulationLifecycle() {
        tripSimulationJob?.cancel()
        tripSimulationJob = viewModelScope.launch {
            delay(2800)

            _uiState.update { state ->
                state.activeTrip?.let { trip ->
                    state.copy(
                        activeTrip = trip.copy(
                            currentStep = TripStep.DRIVER_EN_ROUTE,
                            remainingSeconds = 120,
                            progressFraction = 0.2f
                        )
                    )
                } ?: state
            }

            delay(3500)

            _uiState.update { state ->
                state.activeTrip?.let { trip ->
                    state.copy(
                        activeTrip = trip.copy(
                            currentStep = TripStep.TRIP_IN_PROGRESS,
                            remainingSeconds = 60,
                            progressFraction = 0.5f
                        )
                    )
                } ?: state
            }

            val steps = 6
            for (i in 1..steps) {
                delay(1200)
                _uiState.update { state ->
                    state.activeTrip?.let { trip ->
                        val newProgress = 0.5f + (i * 0.08f)
                        state.copy(
                            activeTrip = trip.copy(
                                progressFraction = newProgress.coerceAtMost(0.98f),
                                remainingSeconds = (60 - (i * 9)).coerceAtLeast(5)
                            )
                        )
                    } ?: state
                }
            }

            _uiState.update { state ->
                state.activeTrip?.let { trip ->
                    state.copy(
                        activeTrip = trip.copy(
                            currentStep = TripStep.TRIP_COMPLETED,
                            progressFraction = 1f,
                            remainingSeconds = 0
                        ),
                        showTripRatingSheet = true
                    )
                } ?: state
            }
        }
    }

    fun makeCall(context: Context, phoneNumber: String) {
        try {
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:${phoneNumber.replace(" ", "")}")
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            _uiState.update { it.copy(statusMessage = "Llamando a $phoneNumber...") }
        }
    }

    fun shareTrip(context: Context) {
        val trip = _uiState.value.activeTrip ?: return
        val shareText = "¡Epa, mi pana! Voy en camino en un ${trip.serviceType.title} de Llégate con ${trip.driver.name} (${trip.driver.alias}) en su ${trip.driver.vehicleModel} [Placa: ${trip.driver.plate}]. PIN: ${trip.driver.pinCode}. Destino: ${trip.destination.title}. ¡Sigue mi carrera con panas!"
        try {
            val sendIntent = Intent().apply {
                action = Intent.ACTION_SEND
                putExtra(Intent.EXTRA_TEXT, shareText)
                type = "text/plain"
            }
            val shareIntent = Intent.createChooser(sendIntent, "Compartir mi carrera con panas")
            context.startActivity(shareIntent)
        } catch (_: Exception) {
            _uiState.update { it.copy(statusMessage = "Detalles copiados al portapapeles") }
        }
    }

    // MODERN DYNAMIC GPS & COMMUNITY ROAD METHODS
    fun setMapDisplayMode(mode: MapDisplayMode) {
        _uiState.update { it.copy(mapDisplayMode = mode) }
    }

    fun selectMapAlert(alert: CommunityAlert?) {
        _uiState.update { it.copy(selectedMapAlert = alert, selectedVehicle = null) }
    }

    fun selectVehicle(vehicle: NearbyVehicle?) {
        _uiState.update { it.copy(selectedVehicle = vehicle, selectedMapAlert = null) }
    }

    fun confirmCommunityAlert(alertId: String) {
        _uiState.update { state ->
            val updated = state.communityAlerts.map { alert ->
                if (alert.id == alertId) {
                    val count = if (alert.userConfirmed) alert.confirmations - 1 else alert.confirmations + 1
                    alert.copy(confirmations = count, userConfirmed = !alert.userConfirmed)
                } else alert
            }
            state.copy(
                communityAlerts = updated,
                statusMessage = "¡Gracias pana! Alerta verificada en la vía 🇻🇪"
            )
        }
    }

    fun dismissCommunityAlert(alertId: String) {
        _uiState.update { state ->
            state.copy(
                communityAlerts = state.communityAlerts.filterNot { it.id == alertId },
                selectedMapAlert = null,
                statusMessage = "Reportado como vía despejada"
            )
        }
    }

    fun showReportModal(show: Boolean) {
        _uiState.update { it.copy(showReportDialog = show) }
    }

    fun submitCommunityReport(type: CommunityAlertType, note: String, locationName: String) {
        val newAlert = CommunityAlert(
            id = "alert_${System.currentTimeMillis()}",
            type = type,
            title = type.title,
            description = note.ifBlank { "Reportado recientemente por un pana en la vía." },
            locationName = locationName.ifBlank { _uiState.value.origin.title },
            xRatio = 0.50f + ((-8..8).random() / 100f),
            yRatio = 0.50f + ((-8..8).random() / 100f),
            reportedBy = "Mi Pana (Tú)",
            reportedMinutesAgo = 0,
            confirmations = 1,
            userConfirmed = true
        )
        _uiState.update { state ->
            state.copy(
                communityAlerts = listOf(newAlert) + state.communityAlerts,
                showReportDialog = false,
                statusMessage = "¡Alerta publicada! Avisando a los panas en la zona 🚦"
            )
        }
    }

    fun selectSuggestion(suggestion: LocationSuggestion) {
        val dest = LocationPoint(
            title = suggestion.title,
            subtitle = "${suggestion.subtitle} (${suggestion.tag})",
            lat = suggestion.lat,
            lng = suggestion.lng,
            stateName = _uiState.value.currentState.name,
            cityName = suggestion.cityName
        )
        _uiState.update {
            it.copy(
                destination = dest,
                statusMessage = "Destino fijado: ${suggestion.title}"
            )
        }
        recalculateEstimates()
    }

    fun toggleFullMapExpanded(expanded: Boolean) {
        _uiState.update { it.copy(showFullMapExpanded = expanded) }
    }

    fun recenterMapOnUser() {
        _uiState.update {
            it.copy(
                statusMessage = "GPS Centrado en ${it.origin.title} (±${it.gpsTelemetry.accuracyMeters}m)"
            )
        }
    }

    fun filterAlertCategory(category: CommunityAlertType?) {
        _uiState.update { it.copy(filterAlertCategory = category) }
    }
}

