package com.llegate.viewmodel

import android.annotation.SuppressLint
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.location.Geocoder
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.core.content.ContextCompat
import com.llegate.model.ActiveTrip
import com.llegate.model.AutomotivePartner
import com.llegate.model.CityInfo
import com.llegate.model.LocationPoint
import com.llegate.model.LocationSuggestion
import com.llegate.model.PaymentMethod
import com.llegate.model.PriceEstimate
import com.llegate.model.SafeMeetingPoint
import com.llegate.model.ServiceType
import com.llegate.model.StateRegion
import com.llegate.model.tarifaUsd
import com.llegate.model.UpcomingService
import com.llegate.model.VehicleCategory
import com.llegate.model.VEHICLE_CATEGORIES
import com.llegate.network.ApiException
import com.llegate.network.activeTripDe
import com.llegate.network.AuthRepository
import com.llegate.network.BcvRateService
import com.llegate.network.Billetera
import com.llegate.network.ConfigApp
import com.llegate.network.ConfigRepository
import com.llegate.network.DriverRepository
import com.llegate.network.EstadoPago
import com.llegate.network.EstadoViaje
import com.llegate.network.FavoriteAddress
import com.llegate.network.FavoriteDriver
import com.llegate.network.FavoriteRepository
import com.llegate.network.MetodoPagoDisponible
import com.llegate.network.Movimiento
import com.llegate.network.Pago
import com.llegate.network.PagoRepository
import com.llegate.network.ReferralSummary
import com.llegate.network.puntoDeTexto
import com.llegate.network.ScheduledRideRepository
import com.llegate.network.TripRepository
import com.llegate.network.Usuario
import com.llegate.network.Viaje
import com.llegate.network.ViajeProgramado
import com.llegate.network.WalletRepository
import com.llegate.util.aE164Venezuela
import com.llegate.util.digitos
import com.llegate.util.esNombrePersona
import com.llegate.util.esReferenciaPagoMovil
import com.llegate.util.usd
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
"import kotlinx.coroutines.CancellationException
import com.mapbox.geojson.Point
import com.mapbox.geojson.Point"
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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
    TRIP_HISTORY,
    PROFILE,
    REFERRALS
}

enum class PasoInicio {
    DATOS,
    CODIGO
}

enum class ServicioConductor(val titulo: String, val tipoVehiculo: String) {
    MOTO("Piloto de Moto", "moto"),
    CARRO("Conductor de Carro", "carro"),
    DELIVERY("Delivery & Encomiendas", "carro")
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
    val selectedVehicleCategoryId: String? = null,
    // CENTRAL REGION STATES RESTRICTED INITIALLY TO ARAGUA, CARABOBO, GUÃRICO & DISTRITO CAPITAL
    val availableStates: List<StateRegion> = listOf(
        StateRegion(
            id = "aragua",
            name = "Aragua",
            isLaunchHub = true, // Sede Principal de Lanzamiento LlÃ©gate ðŸ‡»ðŸ‡ª
            isAvailableNow = true,
            subtitle = "Sede Principal de Lanzamiento LlÃ©gate ðŸ‡»ðŸ‡ª",
            citiesAndTowns = listOf(
                "Maracay", "Turmero", "Cagua", "La Victoria", "Palo Negro",
                "Villa de Cura", "Santa Cruz", "El LimÃ³n", "San Mateo",
                "Ocumare de la Costa", "ChoronÃ­", "San SebastiÃ¡n"
            ),
            cities = listOf(
                CityInfo(
                    name = "Maracay",
                    municipalityOrZone = "Municipio Girardot â€¢ Capital de Aragua",
                    points = listOf(
                        LocationPoint("CC Parque Aragua", "Av. BolÃ­var Este, Maracay", 10.2458, -67.5855, stateName = "Aragua", cityName = "Villa de Cura"),
                        LocationPoint("Las Delicias / CC Las AmÃ©ricas", "Av. Las Delicias, Maracay", 10.2612, -67.5991, stateName = "Aragua", cityName = "Villa de Cura"),
                        LocationPoint("Terminal Central de Maracay", "Av. ConstituciÃ³n, Rutas Interurbanas", 10.2425, -67.5950, stateName = "Aragua", cityName = "Villa de Cura"),
                        LocationPoint("Plaza BolÃ­var de Maracay", "Av. Miranda con BolÃ­var", 10.2480, -67.6000, stateName = "Aragua", cityName = "Villa de Cura")
                    )
                ),
                CityInfo(
                    name = "Cagua",
                    municipalityOrZone = "Municipio Sucre",
                    points = listOf(
                        LocationPoint("Centro de Cagua", "Plaza Sucre / Carretera Nacional", 10.1873, -67.4589, stateName = "Aragua", cityName = "Cagua"),
                        LocationPoint("Zona Industrial Santa RosalÃ­a", "Av. Principal de Cagua", 10.1920, -67.4650, stateName = "Aragua", cityName = "Cagua")
                    )
                ),
                CityInfo(
                    name = "Turmero",
                    municipalityOrZone = "Municipio Santiago MariÃ±o",
                    points = listOf(
                        LocationPoint("Turmero Casco Central", "Plaza MariÃ±o / Calle BolÃ­var", 10.2289, -67.4735, stateName = "Aragua", cityName = "Turmero"),
                        LocationPoint("San Mateo", "Ingenio BolÃ­var / Carretera Nacional", 10.2120, -67.4210, stateName = "Aragua", cityName = "Turmero")
                    )
                ),
                CityInfo(
                    name = "La Victoria",
                    municipalityOrZone = "Municipio JosÃ© FÃ©lix Ribas",
                    points = listOf(
                        LocationPoint("La Victoria - Peaje ARC", "Zona Colonial y Comercial", 10.2272, -67.3314, stateName = "Aragua", cityName = "La Victoria"),
                        LocationPoint("Plaza JosÃ© FÃ©lix Ribas", "Casco HistÃ³rico", 10.2290, -67.3350, stateName = "Aragua", cityName = "La Victoria")
                    )
                ),
                CityInfo(
                    name = "Palo Negro",
                    municipalityOrZone = "Municipio Libertador",
                    points = listOf(
                        LocationPoint("Palo Negro - BAEL", "Plaza BolÃ­var / Base AÃ©rea", 10.1742, -67.5503, stateName = "Aragua", cityName = "Palo Negro")
                    )
                ),
                CityInfo(
                    name = "Villa de Cura",
                    municipalityOrZone = "Municipio Zamora â€¢ Puerta del Llano",
                    points = listOf(
                        LocationPoint("Villa de Cura", "Puerta del Llano / Calle Comercio", 10.0381, -67.4897, stateName = "Aragua", cityName = "Villa de Cura")
                    )
                ),
                CityInfo(
                    name = "El LimÃ³n",
                    municipalityOrZone = "Municipio Mario BriceÃ±o Iragorry",
                    points = listOf(
                        LocationPoint("El LimÃ³n - MBI", "Av. Universidad / Entrada a Ocumare", 10.2785, -67.6322, stateName = "Aragua", cityName = "El LimÃ³n")
                    )
                ),
                CityInfo(
                    name = "Ocumare de la Costa",
                    municipalityOrZone = "Municipio Costa de Oro",
                    points = listOf(
                        LocationPoint("BahÃ­a de Cata / El PlayÃ³n", "Costa de Aragua", 10.4936, -67.7428, stateName = "Aragua", cityName = "Ocumare de la Costa")
                    )
                ),
                CityInfo(
                    name = "ChoronÃ­",
                    municipalityOrZone = "Pueblo y Playas de Aragua",
                    points = listOf(
                        LocationPoint("Playa Grande / Puerto Colombia", "ChoronÃ­, Aragua", 10.5050, -67.6150, stateName = "Aragua", cityName = "ChoronÃ­")
                    )
                )
            ),
            popularPoints = listOf(
                LocationPoint("CC Parque Aragua", "Av. BolÃ­var Este, Maracay", 10.2458, -67.5855, stateName = "Aragua", cityName = "Villa de Cura"),
                LocationPoint("Las Delicias / CC Las AmÃ©ricas", "Av. Las Delicias, Maracay", 10.2612, -67.5991, stateName = "Aragua", cityName = "Villa de Cura"),
                LocationPoint("Centro de Cagua", "Plaza Sucre / Carretera Nacional", 10.1873, -67.4589, stateName = "Aragua", cityName = "Cagua"),
                LocationPoint("Turmero Casco Central", "Plaza MariÃ±o / Calle BolÃ­var", 10.2289, -67.4735, stateName = "Aragua", cityName = "Turmero"),
                LocationPoint("La Victoria - Peaje ARC", "Zona Colonial y Comercial", 10.2272, -67.3314, stateName = "Aragua", cityName = "La Victoria"),
                LocationPoint("Palo Negro - BAEL", "Plaza BolÃ­var / Base AÃ©rea", 10.1742, -67.5503, stateName = "Aragua", cityName = "Palo Negro"),
                LocationPoint("Villa de Cura", "Puerta del Llano / Calle Comercio", 10.0381, -67.4897, stateName = "Aragua", cityName = "Villa de Cura"),
                LocationPoint("El LimÃ³n - MBI", "Av. Universidad / Entrada a Ocumare", 10.2785, -67.6322, stateName = "Aragua", cityName = "El LimÃ³n"),
                LocationPoint("Terminal Central de Maracay", "Av. ConstituciÃ³n, Rutas Interurbanas", 10.2425, -67.5950, stateName = "Aragua", cityName = "Villa de Cura"),
                LocationPoint("BahÃ­a de Cata / El PlayÃ³n", "Costa de Aragua", 10.4936, -67.7428, stateName = "Aragua", cityName = "Ocumare de la Costa"),
                LocationPoint("ChoronÃ­ / Playa Grande", "Pueblo y Costa de Aragua", 10.5050, -67.6150, stateName = "Aragua", cityName = "ChoronÃ­")
            )
        ),
        StateRegion(
            id = "carabobo",
            name = "Carabobo",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "RegiÃ³n Central â€¢ Eje Industrial",
            citiesAndTowns = listOf("Valencia", "Naguanagua", "San Diego", "Guacara", "Puerto Cabello", "Los Guayos"),
            cities = listOf(
                CityInfo("Valencia", "Capital de Carabobo", listOf(LocationPoint("Centro de Valencia", "Av. CedeÃ±o con Av. BolÃ­var", 10.1820, -68.0010, stateName = "Carabobo", cityName = "Valencia"))),
                CityInfo("Naguanagua", "Zona Comercial Norte", listOf(LocationPoint("CC Sambil Valencia", "Naguanagua, Autopista del Este", 10.2580, -67.9950, stateName = "Carabobo", cityName = "Naguanagua"))),
                CityInfo("San Diego", "Municipio San Diego", listOf(LocationPoint("San Diego", "Av. Don Julio Centeno", 10.2510, -67.9520, stateName = "Carabobo", cityName = "San Diego"))),
                CityInfo("Guacara", "Carretera Nacional", listOf(LocationPoint("Guacara Centro", "Carretera Nacional Valencia-Maracay", 10.2310, -67.8770, stateName = "Carabobo", cityName = "Guacara"))),
                CityInfo("Puerto Cabello", "Eje Costero", listOf(LocationPoint("Puerto Cabello", "MalecÃ³n y Terminal MarÃ­timo", 10.4720, -68.0120, stateName = "Carabobo", cityName = "Puerto Cabello")))
            ),
            popularPoints = listOf(
                LocationPoint("CC Sambil Valencia", "Naguanagua, Autopista del Este", 10.2580, -67.9950, stateName = "Carabobo", cityName = "Naguanagua"),
                LocationPoint("Centro de Valencia", "Av. CedeÃ±o con Av. BolÃ­var", 10.1820, -68.0010, stateName = "Carabobo", cityName = "Valencia"),
                LocationPoint("San Diego", "Av. Don Julio Centeno", 10.2510, -67.9520, stateName = "Carabobo", cityName = "San Diego"),
                LocationPoint("Guacara Centro", "Carretera Nacional Valencia-Maracay", 10.2310, -67.8770, stateName = "Carabobo", cityName = "Guacara"),
                LocationPoint("Puerto Cabello", "MalecÃ³n y Terminal MarÃ­timo", 10.4720, -68.0120, stateName = "Carabobo", cityName = "Puerto Cabello")
            )
        ),
        StateRegion(
            id = "guarico",
            name = "GuÃ¡rico",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "ConexiÃ³n Llanos Centrales",
            citiesAndTowns = listOf("San Juan de los Morros", "Calabozo", "Valle de la Pascua", "Ortiz"),
            cities = listOf(
                CityInfo("San Juan de los Morros", "Capital de GuÃ¡rico", listOf(LocationPoint("San Juan de los Morros", "Av. BolÃ­var / San Juanote", 9.9110, -67.3540, stateName = "GuÃ¡rico", cityName = "San Juan de los Morros"))),
                CityInfo("Calabozo", "Ciudad Colonial", listOf(LocationPoint("Calabozo Centro", "Plaza BolÃ­var / Villa Colonial", 8.9240, -67.4280, stateName = "GuÃ¡rico", cityName = "Calabozo"))),
                CityInfo("Valle de la Pascua", "Llanos Nororientales", listOf(LocationPoint("Valle de la Pascua", "Av. RÃ³mulo Gallegos", 9.2150, -66.0120, stateName = "GuÃ¡rico", cityName = "Valle de la Pascua"))),
                CityInfo("Ortiz", "Pueblo HistÃ³rico", listOf(LocationPoint("Ortiz", "Pueblo HistÃ³rico, Carretera Nacional", 9.6220, -67.2880, stateName = "GuÃ¡rico", cityName = "Ortiz")))
            ),
            popularPoints = listOf(
                LocationPoint("San Juan de los Morros", "Av. BolÃ­var / San Juanote", 9.9110, -67.3540, stateName = "GuÃ¡rico", cityName = "San Juan de los Morros"),
                LocationPoint("Calabozo Centro", "Plaza BolÃ­var / Villa Colonial", 8.9240, -67.4280, stateName = "GuÃ¡rico", cityName = "Calabozo"),
                LocationPoint("Valle de la Pascua", "Av. RÃ³mulo Gallegos", 9.2150, -66.0120, stateName = "GuÃ¡rico", cityName = "Valle de la Pascua"),
                LocationPoint("Ortiz", "Pueblo HistÃ³rico, Carretera Nacional", 9.6220, -67.2880, stateName = "GuÃ¡rico", cityName = "Ortiz")
            )
        ),
        StateRegion(
            id = "capital",
            name = "Distrito Capital",
            isLaunchHub = false,
            isAvailableNow = true,
            subtitle = "ConexiÃ³n Capitalina",
            citiesAndTowns = listOf("Caracas", "Chacao", "El Silencio", "Petare"),
            cities = listOf(
                CityInfo("Caracas", "Capital de la RepÃºblica", listOf(
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
        "AnzoÃ¡tegui", "Apure", "Barinas", "BolÃ­var", "Cojedes", "Delta Amacuro",
        "FalcÃ³n", "Lara", "MÃ©rida", "Miranda", "Monagas", "Nueva Esparta",
        "Portuguesa", "Sucre", "TÃ¡chira", "Trujillo", "La Guaira", "Yaracuy",
        "Zulia", "Amazonas"
    ),
    val selectedStateId: String = "aragua", // Default Launch Hub
    val selectedCityName: String = "Villa de Cura, Aragua", // Default City in Aragua
    // Origin configured for Maracay, Aragua (Sede de Lanzamiento)
    val origin: LocationPoint = LocationPoint(
        title = "Av. BolÃ­var Este, Maracay",
        subtitle = "Maracay, Estado Aragua (Sede Principal LlÃ©gate)",
        lat = 10.0386,
        lng = -67.4894,
        isCurrentGps = false,
        stateName = "Aragua",
        cityName = "Villa de Cura"
    ),
    val destination: LocationPoint = LocationPoint(
        title = "",
        subtitle = "",
        lat = 0.0,
        lng = 0.0,
        stateName = "Aragua",
        cityName = "Villa de Cura"
    ),
    val routeDistanceKm: Double? = null,
    val showCitySelectorModal: Boolean = false,
    val showStateSelectorModal: Boolean = false,
    val upcomingServices: List<UpcomingService> = listOf(
        UpcomingService(
            id = "vans",
            title = "Vans TurÃ­sticas & Ejecutivas",
            subtitle = "Playas de Ocumare, ChoronÃ­, Morrocoy o traslados corporativos",
            description = "Unidades de 6 a 14 puestos equipadas para turismo hacia playas de Ocumare de la Costa, ChoronÃ­, Colonia Tovar, Morrocoy o traslados entre Maracay, Valencia y Caracas con asistencia en carretera.",
            iconType = "van",
            highlightPerk = "Turismo Costero Ocumare & ChoronÃ­"
        ),
        UpcomingService(
            id = "buses",
            title = "AutobÃºs Interurbano Central & Frontera",
            subtitle = "Rutas ARC: Maracay â†” Valencia â†” San Juan â†” Caracas",
            description = "Salidas programadas y boletos digitales para viajes de media y larga distancia por la Autopista Regional del Centro, conexiÃ³n a los Llanos (GuÃ¡rico) y cruce internacional hacia San CristÃ³bal / CÃºcuta.",
            iconType = "bus",
            highlightPerk = "Maracay â†” Valencia â†” San Juan"
        ),
        UpcomingService(
            id = "encomiendas",
            title = "Encomiendas & Moto Express",
            subtitle = "EnvÃ­os en menos de 45 min en Aragua y ciudades aliadas",
            description = "Entrega rÃ¡pida de comida, medicinas y documentos confidenciales en moto. Cobertura en Maracay, Cagua, Turmero, La Victoria y Valencia con cajÃ³n hermÃ©tico impermeable de hasta 15 kg.",
            iconType = "package",
            highlightPerk = "CajÃ³n tÃ©rmico con aislamiento"
        ),
        UpcomingService(
            id = "carga_repuestos",
            title = "Carga & Repuestos Automotrices",
            subtitle = "Zona Industrial Aragua-Carabobo y mudanzas express",
            description = "VehÃ­culos tipo pick-up y vans de carga para trasladar piezas de motor, repuestos automotrices de las zonas industriales de Maracay, Cagua y Valencia con guÃ­a de despacho rastreable.",
            iconType = "truck",
            highlightPerk = "Eje Industrial Aragua-Carabobo"
        )
    ),
    val automotivePartners: List<AutomotivePartner> = listOf(
        AutomotivePartner(
            name = "Bera Motors Maracay - Concesionario Central",
            category = "Agencia Central de Motos",
            location = "Av. BolÃ­var Oeste, Maracay, Edo. Aragua",
            benefit = "Bono $80 para conductores LlÃ©gate",
            description = "Financiamiento directo con entrega inmediata para conductores en Aragua. Incluye 3 cambios de aceite gratis en taller autorizado."
        ),
        AutomotivePartner(
            name = "Empire Keeway Motors Valencia & Maracay",
            category = "Agencia de Motos y Repuestos",
            location = "Av. BolÃ­var Norte (Valencia) y Av. Los Cedros (Maracay)",
            benefit = "Tasa preferencial para flotas",
            description = "Modelos de alta durabilidad para mototaxi y encomiendas en la ARC. Servicio tÃ©cnico especializado y repuestos originales disponibles."
        ),
        AutomotivePartner(
            name = "Duncan BaterÃ­as Express Aragua",
            category = "Centro de DistribuciÃ³n",
            location = "Av. ConstituciÃ³n, Maracay (InstalaciÃ³n a domicilio)",
            benefit = "20% OFF para miembros LlÃ©gate",
            description = "BaterÃ­a Duncan 800/1000 AMP con instalaciÃ³n a domicilio gratis en Maracay, Cagua y Turmero. GarantÃ­a nacional 18 meses."
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
    val activeTrip: ActiveTrip? = null,
    val bcvExchangeRate: Double = 889.26,
    val isFetchingBcvRate: Boolean = false,
    val isFetchingGps: Boolean = false,
    val selectedUpcomingService: UpcomingService? = null,
    val showCuentaModal: Boolean = false,
    val showVitrinaModal: Boolean = false,
    val showCancelDialog: Boolean = false,
    val config: ConfigApp? = null,
    val cuenta: Usuario? = null,
    val billetera: Billetera? = null,
    val movimientos: List<Movimiento> = emptyList(),
    val viajes: List<Viaje> = emptyList(),
    val viajesProgramados: List<ViajeProgramado> = emptyList(),
    val cargandoViajesProgramados: Boolean = false,
    val favoriteAddresses: List<FavoriteAddress> = emptyList(),
    val favoriteDrivers: List<FavoriteDriver> = emptyList(),
    val loadingFavorites: Boolean = false,
    val referralSummary: ReferralSummary? = null,
    val referralCodeInput: String = "",
    val favoriteRequestInProgress: Boolean = false,
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
    val servicioConductor: ServicioConductor? = null,
    val telefono: String = "",
    val nombre: String = "",
    val codigo: String = "",
    val aceptaTerminos: Boolean = false,
    val revisandoSesion: Boolean = false,
    val enviandoCodigo: Boolean = false,
    val verificandoCodigo: Boolean = false,
    val reenvioEn: Int = 0,
    /** Lo que `/auth/otp` contesta por quÃ© canal saliÃ³ el cÃ³digo; se lee en la pantalla. */
    val mensajeCanal: String? = null,
    /** `whatsapp`/`sms` = entregado; `log` = el envÃ­o fallÃ³ y el aviso va en Ã¡mbar, no en verde. */
    val canalOtp: String? = null,
    /** El error del ingreso se muestra dentro de la hoja, no solo en el aviso flotante. */
    val avisoInicio: String? = null,
    val intentosInvalidos: Int = 0,
    val statusMessage: String? = null,
    val locationSuggestions: List<LocationSuggestion> = listOf(
        LocationSuggestion("sug_1", "C.C. Las AmÃ©ricas", "Av. Las Delicias â€¢ Zona Comercial y GastronÃ³mica", "Centro Comercial", 3.2, 7, 1.80, 10.2612, -67.5991, "ðŸ”¥ Top Pana", "aragua", "Maracay"),
        LocationSuggestion("sug_2", "C.C. Parque Aragua", "Av. BolÃ­var Este â€¢ Bancos e Hiper Jumbo", "Centro Comercial", 1.8, 4, 1.40, 10.2458, -67.5855, "ðŸ“ MÃ¡s Cercano", "aragua", "Maracay"),
        LocationSuggestion("sug_3", "Terminal Central de Maracay", "Av. ConstituciÃ³n â€¢ Rutas Urbanas e Interurbanas", "Terminal", 2.5, 6, 1.60, 10.2425, -67.5950, "ðŸšŒ Transporte", "aragua", "Maracay"),
        LocationSuggestion("sug_4", "C.C. Los Aviadores", "Autopista Maracay-Palo Negro â€¢ Zona Mall", "Centro Comercial", 6.8, 12, 2.80, 10.1865, -67.5620, "ðŸ›¡ï¸ Punto Seguro", "aragua", "Palo Negro"),
        LocationSuggestion("sug_5", "Plaza BolÃ­var de Maracay", "Teatro de la Ã“pera y Casco HistÃ³rico", "Punto Seguro", 2.1, 5, 1.50, 10.2480, -67.6000, "ðŸ›ï¸ Casco HistÃ³rico", "aragua", "Maracay"),
        LocationSuggestion("sug_6", "Parque Las Ballenas", "Av. Sucre â€¢ Food Trucks y Deporte", "GastronomÃ­a", 4.0, 8, 2.00, 10.2580, -67.5850, "ðŸ” Panas & Food", "aragua", "Maracay"),
        LocationSuggestion("sug_7", "Hospital Central de Maracay", "Calle JosÃ© MarÃ­a Vargas â€¢ Guardia 24h", "Salud", 2.9, 6, 1.70, 10.2540, -67.6040, "ðŸ¥ Urgencias", "aragua", "Maracay"),
        LocationSuggestion("sug_8", "C.C. Sambil Valencia", "Naguanagua â€¢ Autopista del Este", "Centro Comercial", 4.5, 9, 2.20, 10.2580, -67.9950, "ðŸ”¥ Top Carabobo", "carabobo", "Naguanagua"),
        LocationSuggestion("sug_9", "Terminal Big Low Center", "San Diego â€¢ Salidas nacionales y buses", "Terminal", 5.2, 10, 2.40, 10.2100, -67.9600, "ðŸšŒ Terminal", "carabobo", "Valencia"),
        LocationSuggestion("sug_10", "Sambil Chacao", "Av. Libertador â€¢ Metro Chacao", "Centro Comercial", 3.0, 8, 2.00, 10.4905, -66.8601, "ðŸ”¥ Top Capital", "capital", "Chacao")
    ),
    val showFullMapExpanded: Boolean = false,
) {
    val selectedVehicleCategory: VehicleCategory?
        get() = VEHICLE_CATEGORIES.firstOrNull { it.id == selectedVehicleCategoryId }

    val selectedEstimate: PriceEstimate?
        get() {
            val estimate = when (selectedService) {
                ServiceType.MOTO -> motoEstimate
                ServiceType.CAR -> carEstimate
                ServiceType.DELIVERY -> deliveryEstimate
            } ?: return null
            val category = selectedVehicleCategory
                ?.takeIf { selectedService != ServiceType.DELIVERY }
                ?: return estimate
            val priceBs = (category.priceUsd * bcvExchangeRate * 100).roundToInt() / 100.0
            return estimate.copy(priceUsd = category.priceUsd, priceBs = priceBs)
        }

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

    val currentSafeMeetingPoints: List<SafeMeetingPoint>
        get() = when (selectedStateId) {
            "capital" -> listOf(
                SafeMeetingPoint("smp_cap_1", "Obelisco de Plaza Francia", "Bien iluminado Â· 20 m", "20 m", 10.4960, -66.8524),
                SafeMeetingPoint("smp_cap_2", "Salida Metro Altamira", "Zona concurrida Â· 60 m", "60 m", 10.4972, -66.8530),
                SafeMeetingPoint("smp_cap_3", "Esquina C.C. San Ignacio", "FÃ¡cil acceso vehicular Â· 120 m", "120 m", 10.4942, -66.8568),
                SafeMeetingPoint("smp_cap_4", "Torre La Previsora (Plaza Vzla)", "Punto seguro y concurrido Â· 45 m", "45 m", 10.4969, -66.8837)
            )
            "carabobo" -> listOf(
                SafeMeetingPoint("smp_car_1", "Entrada Sambil Valencia", "Vigilancia y bahÃ­a de taxis Â· 25 m", "25 m", 10.2580, -67.9950),
                SafeMeetingPoint("smp_car_2", "Metro Francisco de Miranda (CedeÃ±o)", "Bien iluminado Â· 50 m", "50 m", 10.1820, -68.0010),
                SafeMeetingPoint("smp_car_3", "Redoma de Guaparo", "Punto concurrido y seguro Â· 70 m", "70 m", 10.2240, -68.0060)
            )
            "guarico" -> listOf(
                SafeMeetingPoint("smp_gua_1", "Plaza BolÃ­var San Juan", "Zona concurrida y alumbrada Â· 30 m", "30 m", 9.9110, -67.3540),
                SafeMeetingPoint("smp_gua_2", "Redoma El Hambre San Juan", "FÃ¡cil parada vehicular Â· 60 m", "60 m", 9.9050, -67.3610)
            )
            else -> listOf(
                SafeMeetingPoint("smp_ara_1", "Entrada Principal Parque Aragua", "Bien iluminado Â· 20 m", "20 m", 10.2458, -67.5855),
                SafeMeetingPoint("smp_ara_2", "Parada TransAragua Av. BolÃ­var", "Zona concurrida Â· 45 m", "45 m", 10.2465, -67.5870),
                SafeMeetingPoint("smp_ara_3", "Plaza BolÃ­var de Maracay", "Patrullaje y alumbrado led Â· 30 m", "30 m", 10.2480, -67.6000),
                SafeMeetingPoint("smp_ara_4", "Boulevard Las Delicias (CC AmÃ©ricas)", "FÃ¡cil acceso vehicular Â· 60 m", "60 m", 10.2612, -67.5991)
            )
        }
}


    private val auth: AuthRepository,
    private val configRepo: ConfigRepository = ConfigRepository(),
    private val walletRepo: WalletRepository = WalletRepository(auth.http),
    private val pagoRepo: PagoRepository = PagoRepository(auth.http),
    private val tripRepo: TripRepository = TripRepository(auth.http),
    private val scheduledRideRepo: ScheduledRideRepository = ScheduledRideRepository(auth.http),
    private val favoriteRepo: FavoriteRepository = FavoriteRepository(auth.http),
    private val driverRepo: DriverRepository = DriverRepository(auth.http)
) : ViewModel() {

    private val bcvRateService = BcvRateService()
    private val _uiState = MutableStateFlow(
        LlegateUiState(revisandoSesion = auth.tieneSesion)
    )
    val uiState: StateFlow<LlegateUiState> = _uiState.asStateFlow()

    private var viajeJob: Job? = null
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
            if (perfil != null) {
                refrescarBilletera(silencioso = true)
                refrescarFavoritos()
                refrescarReferidos()
            }
        }
    }

    fun onTelefono(valor: String) {
        _uiState.update { it.copy(telefono = valor, avisoInicio = null, statusMessage = null) }
    }

    fun onNombre(valor: String) {
        _uiState.update { it.copy(nombre = valor, avisoInicio = null, statusMessage = null) }
    }

    fun seleccionarServicioConductor(servicio: ServicioConductor) {
        _uiState.update { it.copy(servicioConductor = servicio, avisoInicio = null, statusMessage = null) }
    }

    fun continuarComoPasajero() {
        _uiState.update { it.copy(servicioConductor = null, avisoInicio = null, statusMessage = null) }
    }

    fun onCodigo(valor: String) {
        _uiState.update { it.copy(codigo = valor.filter(Char::isDigit).take(6), avisoInicio = null, statusMessage = null) }
    }

    fun setAceptaTerminos(valor: Boolean) {
        _uiState.update { it.copy(aceptaTerminos = valor, avisoInicio = null, statusMessage = null) }
    }

    fun volverAEditarTelefono() {
        _uiState.update {
            it.copy(pasoInicio = PasoInicio.DATOS, codigo = "", avisoInicio = null, mensajeCanal = null, canalOtp = null)
        }
    }

    /** Un error de ingreso se corrige en la misma hoja: el aviso flotante se va solo. */
    private fun avisarInicio(texto: String) {
        _uiState.update {
            it.copy(
                statusMessage = texto,
                avisoInicio = texto,
                intentosInvalidos = it.intentosInvalidos + 1
            )
        }
    }

    fun enviarCodigo() {
        val state = _uiState.value
        val e164 = aE164Venezuela(state.telefono)
        when {
            e164 == null -> avisarInicio("Escribe un nÃºmero venezolano, por ejemplo 0414 1234567.")
            state.nombre.isNotBlank() && !esNombrePersona(state.nombre) ->
                avisarInicio("Escribe tu nombre y apellido como aparecen en tu cÃ©dula.")
            !state.aceptaTerminos ->
                avisarInicio("Debes aceptar los tÃ©rminos para usar LlÃ©gate.")
            else -> viewModelScope.launch {
                _uiState.update { it.copy(enviandoCodigo = true, avisoInicio = null) }
                try {
                    val rol = if (state.servicioConductor != null) "conductor" else "cliente"
                    val envio = auth.pedirCodigo(
                        e164,
                        rol = rol,
                        nombre = state.nombre.trim().ifBlank { null }
                    )
                    _uiState.update {
                        it.copy(
                            pasoInicio = PasoInicio.CODIGO,
                            codigo = "",
                            telefono = e164,
                            reenvioEn = SEGUNDOS_REENVIO,
                            mensajeCanal = envio.mensaje,
                            canalOtp = envio.canal,
                            statusMessage = envio.mensaje
                        )
                    }
                    iniciarContadorReenvio()
                } catch (fallo: ApiException) {
                    avisarInicio(fallo.message ?: FALLA_GENERICO)
                } catch (fallo: Exception) {
                    if (fallo is CancellationException) throw fallo
                    avisarInicio(FALLA_GENERICO)
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
            e164 == null -> avisarInicio("Escribe un nÃºmero venezolano, por ejemplo 0414 1234567.")
            state.codigo.length != 6 -> avisarInicio("El cÃ³digo tiene 6 dÃ­gitos.")
            else -> viewModelScope.launch {
                _uiState.update { it.copy(verificandoCodigo = true, avisoInicio = null) }
                try {
                    auth.verificarCodigo(e164, state.codigo)
                    val perfil = auth.perfil()
                    _uiState.update {
                        it.copy(
                            cuenta = perfil,
                            revisandoSesion = false,
                            pasoInicio = PasoInicio.DATOS,
                            servicioConductor = null,
                            codigo = "",
                            avisoInicio = null,
                            mensajeCanal = null, canalOtp = null,
                            statusMessage = "Listo, ${perfil.nombre?.substringBefore(' ') ?: "pana"}. Tu cuenta estÃ¡ activa."
                        )
                    }
                    refrescarBilletera(silencioso = true)
                    refrescarFavoritos()
                    refrescarReferidos()
                } catch (fallo: ApiException) {
                    avisarInicio(fallo.message ?: FALLA_GENERICO)
                } catch (fallo: Exception) {
                    if (fallo is CancellationException) throw fallo
                    avisarInicio(FALLA_GENERICO)
                } finally {
                    _uiState.update { it.copy(verificandoCodigo = false) }
                }
            }
        }
    }

    fun cerrarSesion() {
        viewModelScope.launch {
            auth.cerrarSesion()
            viajeJob?.cancel()
            _uiState.update {
                it.copy(
                    cuenta = null,
                    billetera = null,
                    movimientos = emptyList(),
                    pagos = emptyList(),
                    viajes = emptyList(),
                    favoriteAddresses = emptyList(),
                    favoriteDrivers = emptyList(),
                    loadingFavorites = false,
                    referralSummary = null,
                    referralCodeInput = "",
                    showCuentaModal = false,
                    showRecargaModal = false,
                    pagoEnCurso = null,
                    currentScreen = AppScreen.HOME,
                    activeTrip = null,
                    viajesProgramados = emptyList(),
                    cargandoViajesProgramados = false,
                    pasoInicio = PasoInicio.DATOS,
                    codigo = "",
                    nombre = "",
                    avisoInicio = null,
                    mensajeCanal = null, canalOtp = null,
                    statusMessage = "SesiÃ³n cerrada."
                )
            }

        }
    }

    suspend fun registrarPerfilConductor(datos: Map<String, String>) {
        driverRepo.registrarPerfil(datos)
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
     * con lo que ya tenÃ­a: un problema leyendo viajes no puede tapar el saldo.
     */
    private suspend fun refrescarViajes() {
        if (!auth.tieneSesion) return
        val viajes = try {
            tripRepo.listar()
        } catch (fallo: Exception) {
            if (fallo is CancellationException) throw fallo
            return
        }
        _uiState.update { it.copy(viajes = viajes) }
        reanudarViajeAbierto(viajes)
    }

    fun cargarViajesProgramados() {
        if (!auth.tieneSesion) {
            avisar("Entra a tu cuenta para consultar tus viajes programados.")
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(cargandoViajesProgramados = true) }
            try {
                val viajesProgramados = scheduledRideRepo.listar()
                _uiState.update { it.copy(viajesProgramados = viajesProgramados) }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(cargandoViajesProgramados = false) }
            }
        }
    }

    fun programarViaje(programadoPara: String) {
        val state = _uiState.value
        if (!auth.tieneSesion) {
            avisar("Entra a tu cuenta para programar un viaje.")
            return
        }
        val estimate = state.selectedEstimate
        if (estimate == null) {
            avisar("Toca un origen y un destino para conocer la tarifa.")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(cargandoViajesProgramados = true) }
            try {
                val viajeProgramado = scheduledRideRepo.crear(
                    origen = state.origin,
                    destino = state.destination,
                    servicio = state.selectedService.slug,
                    programadoPara = programadoPara,
                    precioUsd = estimate.priceUsd,
                    distanciaKm = estimate.distanceKm,
                    metodoPago = state.selectedPaymentMethod.identifier
                )
                _uiState.update {
                    it.copy(
                        viajesProgramados = listOf(viajeProgramado) +
                            it.viajesProgramados.filterNot { existente -> existente.id == viajeProgramado.id },
                        statusMessage = "Viaje programado guardado."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(cargandoViajesProgramados = false) }
            }
        }
    }

    fun cancelarViajeProgramado(id: String) {
        if (!auth.tieneSesion) {
            avisar("Entra a tu cuenta para cancelar un viaje programado.")
            return
        }
        viewModelScope.launch {
            try {
                val viajeCancelado = scheduledRideRepo.cancelar(id)
                _uiState.update { state ->
                    state.copy(
                        viajesProgramados = state.viajesProgramados.map { viaje ->
                            if (viaje.id == viajeCancelado.id) viajeCancelado else viaje
                        }
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            }
        }
    }

    /**
     * Si la app se cerrÃ³ a mitad de un viaje, `/trips` todavÃ­a lo tiene abierto: se
     * reconstruye la pantalla con los datos del servidor y se sigue preguntando por Ã©l.
     * Solo salta a la carrera si el pana estaba en su casa, no a mitad de una reserva.
     */
    private fun reanudarViajeAbierto(viajes: List<Viaje>) {
        if (_uiState.value.activeTrip != null) return
        val abierto = viajes.firstOrNull { it.abierto } ?: return
        val trip = activeTripDe(
            viaje = abierto,
            origen = puntoDeTexto(abierto.origen, "Origen de tu viaje"),
            destino = puntoDeTexto(abierto.destino, "Destino de tu viaje"),
            bcv = _uiState.value.bcvExchangeRate
        )
        val enCasa = _uiState.value.currentScreen == AppScreen.HOME
        _uiState.update { state ->
            state.copy(
                activeTrip = trip,
                currentScreen = if (enCasa) AppScreen.TRIP_ACTIVE else state.currentScreen
            )
        }
        seguirViaje(abierto.id)
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

    /** Crea la intenciÃ³n de pago real; Pago MÃ³vil muestra los datos del comercio. */
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

    /** El pana ya pagÃ³ en su banco: pasamos a que escriba la referencia. */
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
            avisar("No pudimos abrir el pago de Binance Pay en este telÃ©fono.")
        }
    }

    /** Reporta la referencia del banco; el saldo entra cuando un admin aprueba la recarga. */
    fun confirmarRecarga() {
        val state = _uiState.value
        val pago = state.pagoEnCurso ?: return
        if (!esReferenciaPagoMovil(state.recargaReferencia)) {
            avisar("La referencia del Pago MÃ³vil son 6 a 12 dÃ­gitos, sin espacios.")
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
                            "Queda en revisiÃ³n y entra al saldo en unos $minutos minutos."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                _uiState.update { it.copy(enviandoRecarga = false) }
                avisar(fallo.message ?: FALLA_GENERICO)
            }
        }
    }

    /** Deja sin efecto una intenciÃ³n pendiente para no dejar pagos colgando. */
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

    companion object {
        const val SEGUNDOS_REENVIO = 30

        /** Cada cuÃ¡nto se le pregunta al servidor por el viaje abierto. */
        const val MS_SEGUIMIENTO_VIAJE = 5_000L
        const val FALLA_GENERICO = "No pudimos comunicarte con LlÃ©gate. Intenta de nuevo."
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
                routeDistanceKm = null,
                showStateSelectorModal = false,
                statusMessage = "RegiÃ³n: ${state.name} â€¢ ${defaultCity}"
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
                routeDistanceKm = null,
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

    /** El historial es `GET /trips`: al abrir la pantalla se vuelve a leer, no se inventa. */
    fun openTripHistory() {
        _uiState.update { it.copy(currentScreen = AppScreen.TRIP_HISTORY) }
        viewModelScope.launch { refrescarViajes() }
    }

    fun openProfile() {
        _uiState.update { it.copy(currentScreen = AppScreen.PROFILE, showCuentaModal = false) }
        refrescarFavoritos()
    }

    fun openReferrals() {
        _uiState.update { it.copy(currentScreen = AppScreen.REFERRALS, showCuentaModal = false) }
        refrescarReferidos()
    }

    fun refrescarFavoritos() {
        if (!auth.tieneSesion) return
        viewModelScope.launch {
            _uiState.update { it.copy(loadingFavorites = true) }
            try {
                val addresses = favoriteRepo.addresses()
                val drivers = favoriteRepo.drivers()
                _uiState.update {
                    it.copy(favoriteAddresses = addresses, favoriteDrivers = drivers)
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(loadingFavorites = false) }
            }
        }
    }

    fun guardarDireccionFavorita(etiqueta: String, punto: LocationPoint) {
        if (etiqueta.isBlank() || !punto.tieneCoordenadas) {
            avisar("Elige una etiqueta y una ubicaciÃ³n con coordenadas.")
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(favoriteRequestInProgress = true) }
            try {
                val saved = favoriteRepo.saveAddress(etiqueta.trim(), punto)
                _uiState.update { state ->
                    state.copy(
                        favoriteAddresses = (state.favoriteAddresses.filterNot {
                            it.label.equals(saved.label, ignoreCase = true)
                        } + saved).sortedBy { it.label.lowercase() },
                        statusMessage = "DirecciÃ³n ${saved.label} guardada."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(favoriteRequestInProgress = false) }
            }
        }
    }

    fun borrarDireccionFavorita(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(favoriteRequestInProgress = true) }
            try {
                favoriteRepo.deleteAddress(id)
                _uiState.update { state ->
                    state.copy(
                        favoriteAddresses = state.favoriteAddresses.filterNot { it.id == id },
                        statusMessage = "DirecciÃ³n favorita eliminada."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(favoriteRequestInProgress = false) }
            }
        }
    }

    fun cambiarConductorFavorito(id: String) {
        if (id.isBlank()) {
            avisar("Este viaje no incluye el identificador del piloto.")
            return
        }
        val yaFavorito = _uiState.value.favoriteDrivers.any { it.id == id }
        viewModelScope.launch {
            _uiState.update { it.copy(favoriteRequestInProgress = true) }
            try {
                if (yaFavorito) favoriteRepo.deleteDriver(id) else favoriteRepo.addDriver(id)
                val drivers = favoriteRepo.drivers()
                _uiState.update {
                    it.copy(
                        favoriteDrivers = drivers,
                        statusMessage = if (yaFavorito) "Piloto eliminado de tus favoritos." else "Piloto guardado en tus favoritos."
                    )
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(favoriteRequestInProgress = false) }
            }
        }
    }

    fun onReferralCodeInput(value: String) {
        _uiState.update { it.copy(referralCodeInput = value.uppercase()) }
    }

    fun compartirCodigoReferido(context: Context) {
        val code = _uiState.value.referralSummary?.code ?: return
        val texto = "Â¡Ã‰panale! Ãšnete a LlÃ©gate con mi cÃ³digo $code y llÃ©vate saldo para tus carreras en Maracay y la ARC ðŸš—ðŸ’¨"
        val whatsapp = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, texto)
            setPackage("com.whatsapp")
        }
        try {
            context.startActivity(whatsapp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: android.content.ActivityNotFoundException) {
            val compartir = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, texto)
            }
            abrir(context, Intent.createChooser(compartir, "Compartir cÃ³digo de LlÃ©gate"))
        } catch (_: SecurityException) {
            avisar("No pudimos abrir WhatsApp. IntÃ©ntalo desde el menÃº de compartir.")
        }
    }

    fun aplicarCodigoReferido() {
        val code = _uiState.value.referralCodeInput.trim()
        if (code.isBlank()) {
            avisar("Escribe el cÃ³digo de tu pana.")
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(favoriteRequestInProgress = true) }
            try {
                favoriteRepo.applyReferral(code)
                _uiState.update {
                    it.copy(referralCodeInput = "", statusMessage = "CÃ³digo aplicado. El bono se acredita al completar tu primera carrera vÃ¡lida.")
                }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            } finally {
                _uiState.update { it.copy(favoriteRequestInProgress = false) }
            }
        }
    }

    private fun refrescarReferidos() {
        if (!auth.tieneSesion) return
        viewModelScope.launch {
            try {
                val summary = favoriteRepo.referralSummary()
                _uiState.update { it.copy(referralSummary = summary) }
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
            }
        }
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

    fun selectVehicleCategory(category: VehicleCategory) {
        _uiState.update { it.copy(selectedVehicleCategoryId = category.id) }
    }

    fun openBooking(serviceType: ServiceType? = null) {
        if (!_uiState.value.destination.tieneCoordenadas) {
            avisar("Elige un destino para continuar.")
            return
        }
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
        _uiState.update { it.copy(origin = newOrigin, routeDistanceKm = null) }
        recalculateEstimates()
    }

    fun updateDestination(newDestination: LocationPoint) {
        _uiState.update { it.copy(destination = newDestination, routeDistanceKm = null) }
        recalculateEstimates()
    }

    fun clearDestination() {
        val state = _uiState.value
        _uiState.update {
            it.copy(
                destination = LocationPoint(
                    title = "",
                    subtitle = "",
                    lat = 0.0,
                    lng = 0.0,
                    stateName = state.currentState.name,
                    cityName = state.selectedCityName
                ),
                routeDistanceKm = null
            )
        }
        recalculateEstimates()
    }

    fun updateDestinationFromMap(context: Context, lat: Double, lng: Double) {
        if (!lat.isFinite() || !lng.isFinite() || lat !in -90.0..90.0 || lng !in -180.0..180.0) return
        val state = _uiState.value
        updateDestination(
            LocationPoint(
                title = "Buscando direcciÃ³nâ€¦",
                subtitle = "${state.selectedCityName}, ${state.currentState.name}",
                lat = lat,
                lng = lng,
                stateName = state.currentState.name,
                cityName = state.selectedCityName
            )
        )
        viewModelScope.launch {
            val address = try {
                withContext(Dispatchers.IO) {
                    Geocoder(context, Locale.getDefault())
                        .getFromLocation(lat, lng, 1)
                        ?.firstOrNull()
                }
            } catch (_: Exception) {
                null
            } ?: return@launch
            val title = address.thoroughfare
                ?: address.premises
                ?: address.subLocality
                ?: address.locality
                ?: "Punto seleccionado"
            val subtitle = listOfNotNull(address.subLocality ?: address.locality, address.adminArea)
                .distinct()
                .joinToString(", ")
                .ifBlank { "${state.selectedCityName}, ${state.currentState.name}" }
            _uiState.update { current ->
                if (kotlin.math.abs(current.destination.lat - lat) > 0.000001 ||
                    kotlin.math.abs(current.destination.lng - lng) > 0.000001
                ) {
                    current
                } else {
                    current.copy(
                        destination = current.destination.copy(
                            title = title,
                            subtitle = subtitle,
                            cityName = address.locality ?: current.destination.cityName,
                            stateName = address.adminArea ?: current.destination.stateName
                        )
                    )
                }
            }
        }
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

    /** El piloto terminÃ³ en el servidor: se suelta la pantalla y el historial se recarga solo. */
    fun cerrarViaje() = limpiarViaje("Â¡Carrera terminada! Ya estÃ¡ en tu historial.")

    /**
     * Cancelar tambiÃ©n es una llamada. Si el servidor la rechaza â€”el piloto ya arrancÃ³ el
     * viaje, por ejemploâ€” la carrera sigue abierta y el motivo se muestra tal cual.
     */
    fun cancelarViaje(motivo: String) {
        val id = _uiState.value.activeTrip?.viajeId
        if (id == null) {
            limpiarViaje("Viaje cancelado: $motivo")
            return
        }
        viajeJob?.cancel()
        viewModelScope.launch {
            try {
                tripRepo.cancelar(id, motivo)
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                avisar(fallo.message ?: FALLA_GENERICO)
                seguirViaje(id)
                return@launch
            }
            limpiarViaje("Viaje cancelado: $motivo")
        }
    }

    private fun limpiarViaje(mensaje: String) {
        viajeJob?.cancel()
        _uiState.update {
            it.copy(
                showCancelDialog = false,
                activeTrip = null,
                currentScreen = AppScreen.HOME,
                statusMessage = mensaje
            )
        }
        viewModelScope.launch { refrescarViajes() }
    }

    fun clearStatusMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }

    @SuppressLint("MissingPermission")
    fun requestCurrentGpsLocation(context: Context, onLocationFound: ((LocationPoint) -> Unit)? = null) {
        val hasFineLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val hasCoarseLocation = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!hasFineLocation && !hasCoarseLocation) {
            avisar("Permite el acceso a tu ubicaciÃ³n para usar el GPS.")
            return
        }

        _uiState.update { it.copy(isFetchingGps = true) }
        val tokenSource = CancellationTokenSource()
        try {
            LocationServices.getFusedLocationProviderClient(context)
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token)
                .addOnSuccessListener { location ->
                    if (location == null) {
                        _uiState.update {
                            it.copy(
                                isFetchingGps = false,
                                statusMessage = "No se pudo obtener tu ubicaciÃ³n actual. Comprueba el GPS e intÃ©ntalo otra vez."
                            )
                        }
                        return@addOnSuccessListener
                    }

                    viewModelScope.launch {
                        val address = try {
                            withContext(Dispatchers.IO) {
                                Geocoder(context, Locale.getDefault())
                                    .getFromLocation(location.latitude, location.longitude, 1)
                                    ?.firstOrNull()
                            }
                        } catch (_: Exception) {
                            null
                        }
                        val state = _uiState.value
                        val point = LocationPoint(
                            title = address?.thoroughfare
                                ?: address?.featureName
                                ?: "Mi ubicaciÃ³n actual",
                            subtitle = listOfNotNull(
                                address?.subLocality ?: address?.locality,
                                address?.adminArea
                            ).joinToString(", ").ifBlank {
                                String.format(Locale.US, "%.5f, %.5f", location.latitude, location.longitude)
                            },
                            lat = location.latitude,
                            lng = location.longitude,
                            isCurrentGps = true,
                            stateName = address?.adminArea ?: state.currentState.name,
                            cityName = address?.locality ?: state.selectedCityName
                        )
                        _uiState.update {
                            it.copy(
                                origin = point,
                                isFetchingGps = false,
                                routeDistanceKm = null,
                                statusMessage = "UbicaciÃ³n GPS actualizada."
                            )
                        }
                        recalculateEstimates()
                        onLocationFound?.invoke(point)
                    }
                }
                .addOnFailureListener { failure ->
                    _uiState.update {
                        it.copy(
                            isFetchingGps = false,
                            statusMessage = failure.localizedMessage
                                ?: "No pudimos obtener tu ubicaciÃ³n GPS."
                        )
                    }
            }
        } catch (failure: SecurityException) {
            _uiState.update {
                it.copy(isFetchingGps = false, statusMessage = "Permite el acceso a tu ubicaciÃ³n para usar el GPS.")
            }
        }
    }

    fun updateRoadRouteDistance(distanceKm: Double?) {
        if (distanceKm != null && (!distanceKm.isFinite() || distanceKm <= 0.0)) return
        _uiState.update { it.copy(routeDistanceKm = distanceKm) }
        recalculateEstimates()
    }

    private fun recalculateEstimates() {
        val state = _uiState.value
        if (!state.destination.tieneCoordenadas) {
            _uiState.update {
                it.copy(
                    routeDistanceKm = null,
                    motoEstimate = null,
                    carEstimate = null,
                    deliveryEstimate = null
                )
            }
            return
        }
        val distance = state.routeDistanceKm ?: calculateDistanceKm(
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
        val msg = if (isDriver) "Modo Piloto LlÃ©gate activado. Â¡A rodar con los panas!" else "Modo Pasajero activado. Â¡Listo para tu carrera!"
        _uiState.update { it.copy(isDriverMode = isDriver, statusMessage = msg) }
    }

    fun selectSafeMeetingPoint(meetingPoint: SafeMeetingPoint) {
        val newOrigin = LocationPoint(
            title = meetingPoint.title,
            subtitle = "${meetingPoint.tag} â€¢ ${meetingPoint.distanceText}",
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
                routeDistanceKm = null,
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
            it.copy(statusMessage = "Â¡Voto registrado para activar $stateName! Gracias por apoyar la expansiÃ³n ðŸ‡»ðŸ‡ª")
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
                routeDistanceKm = null,
                statusMessage = "Ruta invertida: ${curDest.title} â‡„ ${curOrigin.title}"
            )
        }
        recalculateEstimates()
    }

    /**
     * Pide el viaje a la API. La app ya no simula que un pana la acepta ni que la carrera
     * avanza sola: `viajeJob` solo lee `GET /trips/:id` y pinta lo que conteste el servidor.
     */
    fun pedirViaje() {
        val state = _uiState.value
        if (!auth.tieneSesion) {
            avisar("Entra a tu cuenta para pedir un viaje.")
            return
        }
        if (!state.destination.tieneCoordenadas) {
            avisar("Elige un destino para pedir el viaje.")
            return
        }
        val estimate = state.selectedEstimate
        if (estimate == null) {
            avisar("Toca un origen y un destino para conocer la tarifa.")
            return
        }

        viewModelScope.launch {
            val viaje = try {
                tripRepo.pedir(
                    origen = state.origin.title,
                    destino = state.destination.title,
                    precioUsd = estimate.priceUsd,
                    distanciaKm = estimate.distanceKm,
                    metodoPago = state.selectedPaymentMethod.identifier
                )
            } catch (fallo: Exception) {
                if (fallo is CancellationException) throw fallo
                _uiState.update { it.copy(currentScreen = AppScreen.BOOKING_DETAILS) }
                avisar(fallo.message ?: FALLA_GENERICO)
                return@launch
            }

            val viajeActivo = activeTripDe(
                viaje = viaje,
                origen = state.origin,
                destino = state.destination,
                bcv = state.bcvExchangeRate
            )
            _uiState.update { it.copy(activeTrip = viajeActivo, currentScreen = AppScreen.TRIP_ACTIVE) }
            seguirViaje(viaje.id)
        }
    }

    /** Cada 5 segundos se pregunta por el viaje; se para en seco si lo cancelan o termina. */
    private fun seguirViaje(id: String) {
        viajeJob?.cancel()
        viajeJob = viewModelScope.launch {
            while (true) {
                delay(MS_SEGUIMIENTO_VIAJE)
                val viaje = try {
                    tripRepo.consultar(id)
                } catch (fallo: ApiException) {
                    if (fallo.httpStatus == 404) {
                        limpiarViaje("Ese viaje ya no estÃ¡ en LlÃ©gate.")
                        return@launch
                    }
                    continue
                } catch (fallo: Exception) {
                    if (fallo is CancellationException) throw fallo
                    continue
                }
                aplicarViaje(viaje)
                if (viaje.estado == EstadoViaje.CANCELADO) {
                    limpiarViaje("El viaje se cancelÃ³. Pide otro cuando quieras.")
                    return@launch
                }
                if (!viaje.abierto) return@launch
            }
        }
    }

    private fun aplicarViaje(viaje: Viaje) {
        _uiState.update { state ->
            val trip = state.activeTrip ?: return@update state
            state.copy(
                activeTrip = activeTripDe(
                    viaje = viaje,
                    origen = trip.origin,
                    destino = trip.destination,
                    bcv = state.bcvExchangeRate,
                    actual = trip.currentStep
                )
            )
        }
    }

    fun makeCall(context: Context, phoneNumber: String) {
        abrir(context, Intent(Intent.ACTION_DIAL, Uri.parse("tel:${digitos(phoneNumber)}")))
    }

    /** La API no tiene chat: el mensaje se va por WhatsApp al telÃ©fono real del piloto. */
    fun enviarWhatsApp(context: Context, telefono: String, mensaje: String) {
        val numero = aE164Venezuela(telefono)?.drop(1) ?: digitos(telefono)
        abrir(context, Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$numero?text=${Uri.encode(mensaje)}")))
    }

    /** Compartir manda lo que el servidor sÃ­ tiene del viaje: ruta, tarifa y piloto asignado. */
    fun shareTrip(context: Context) {
        val trip = _uiState.value.activeTrip ?: return
        val pana = trip.driver
        val texto = buildString {
            append("Viaje de LlÃ©gate: ${trip.origin.title} â†’ ${trip.destination.title}. ")
            append("Tarifa de referencia ${usd(trip.precioUsd)}, pago ${trip.metodoPagoTexto}.")
            if (pana != null) {
                append(" Piloto: ${pana.name}")
                pana.vehicleModel?.let { append(", $it") }
                pana.plate?.let { append(", placa $it") }
            }
        }
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, texto)
            type = "text/plain"
        }
        abrir(context, Intent.createChooser(sendIntent, "Compartir mi viaje con LlÃ©gate"))
    }

    private fun abrir(context: Context, intent: Intent) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
            avisar("Tu telÃ©fono no pudo abrir esa acciÃ³n. IntÃ©ntalo manualmente.")
        }
    }

    // CONTROLES DEL MAPA
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
                routeDistanceKm = null,
                statusMessage = "Destino fijado: ${suggestion.title}"
            )
        }
        recalculateEstimates()
    }

    fun toggleFullMapExpanded(expanded: Boolean) {
        _uiState.update { it.copy(showFullMapExpanded = expanded) }
    }

    fun recenterMapOnUser() {
        _uiState.update { it.copy(statusMessage = "Mapa centrado en ${it.origin.title}") }
    }
}



