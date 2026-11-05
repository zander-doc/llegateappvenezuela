package com.llegate.model

import com.llegate.network.ConfigApp
import kotlin.math.roundToInt

enum class ServiceType(
    val slug: String,
    val title: String,
    val colloquialTitle: String,
    val subtitle: String,
    val speedTag: String,
    val minFareUsd: Double,
    val perKmUsd: Double,
    val capacityInfo: String,
    val perks: List<String>
) {
    MOTO(
        slug = "mototaxi",
        title = "Mototaxi Llégate",
        colloquialTitle = "Pedir Moto",
        subtitle = "El más rápido en la cola • Doble casco y chaleco",
        speedTag = "¡El más rápido!",
        minFareUsd = 1.00,
        perKmUsd = 0.30,
        capacityInfo = "1 Pasajero • Doble casco certificado",
        perks = listOf(
            "Evasión rápida del tráfico en horas pico",
            "Tarifa accesible en $ y Pago Móvil",
            "Pilotos certificados con chaleco reflectivo"
        )
    ),
    CAR(
        slug = "taxi-pana",
        title = "Taxi Pana & Confort",
        colloquialTitle = "Pedir Carro",
        subtitle = "Sedanes modernos con aire • Maletas y hasta 4 panas",
        speedTag = "Más cómodo",
        minFareUsd = 3.00,
        perKmUsd = 0.50,
        capacityInfo = "Hasta 4 Panas • Aire acondicionado full",
        perks = listOf(
            "Aire acondicionado y revisión mecánica al día",
            "Conductores verificados por Llégate",
            "Ideal para compras, traslados interurbanos o lluvia"
        )
    ),
    DELIVERY(
        slug = "delivery",
        title = "Delivery Express",
        colloquialTitle = "Pedir Delivery",
        subtitle = "20-45 min · Hasta 5 kg • Encomiendas rápidas",
        speedTag = "Express",
        minFareUsd = 1.00,
        perKmUsd = 0.35,
        capacityInfo = "Hasta 5 kg • Bolso sellado o caja térmica",
        perks = listOf(
            "Rastreo del viaje desde la app",
            "El piloto te escribe por WhatsApp para la entrega",
            "Entregas de documentos y paquetes pequeños"
        )
    )
}

data class CityInfo(
    val name: String,
    val municipalityOrZone: String,
    val points: List<LocationPoint>
)

data class StateRegion(
    val id: String,
    val name: String,
    val isLaunchHub: Boolean = false, // Aragua is true (Sede de Lanzamiento)
    val isAvailableNow: Boolean = true,
    val subtitle: String,
    val citiesAndTowns: List<String>,
    val cities: List<CityInfo>,
    val popularPoints: List<LocationPoint>
)

data class UpcomingService(
    val id: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val iconType: String,
    val badge: String = "Próximamente",
    val highlightPerk: String
)

data class AutomotivePartner(
    val name: String,
    val category: String,
    val location: String,
    val benefit: String,
    val description: String
)

data class LocationPoint(
    val title: String,
    val subtitle: String,
    val lat: Double,
    val lng: Double,
    val isCurrentGps: Boolean = false,
    val stateName: String = "Aragua",
    val cityName: String = "Maracay"
)

data class PriceEstimate(
    val serviceType: ServiceType,
    val distanceKm: Double,
    val etaMinutes: Int,
    val priceUsd: Double,
    val priceBs: Double
)

enum class PaymentMethod(
    val title: String,
    val subtitle: String,
    /** Valor de `public.metodo_pago` que se le envía a la API al crear el viaje. */
    val identifier: String
) {
    PAGO_MOVIL(
        title = "Pago Móvil",
        subtitle = "Transferencia en Bs. a la tasa BCV del día",
        identifier = "pago_movil"
    ),
    EFECTIVO_USD(
        title = "Efectivo $",
        subtitle = "Divisas en mano (cambio verificado)",
        identifier = "efectivo"
    ),
    SALDO_LLEGATE(
        title = "Saldo Llégate",
        subtitle = "Billetera prepaga de la cuenta",
        identifier = "saldo"
    )
}

/**
 * El piloto que la API asignó al viaje. La app no inventa reseñas, carreras hechas,
 * colores ni códigos PIN: muestra solo lo que el servidor de verdad tiene.
 */
data class DriverProfile(
    val name: String,
    val plate: String?,
    val vehicleModel: String?,
    val phone: String?,
    val verified: Boolean
)

enum class TripStep {
    IDLE,
    SELECTING_RIDE,
    SEARCHING_DRIVER,
    DRIVER_EN_ROUTE,
    TRIP_IN_PROGRESS,
    TRIP_COMPLETED
}

data class ActiveTrip(
    val serviceType: ServiceType,
    val origin: LocationPoint,
    val destination: LocationPoint,
    val priceEstimate: PriceEstimate,
    val paymentMethod: PaymentMethod,
    /** `id` del viaje en la API: con él se consulta el estado y se cancela. */
    val viajeId: String,
    val driver: DriverProfile?,
    val currentStep: TripStep,
    val progressFraction: Float = 0f
)

enum class MapDisplayMode(
    val label: String,
    val shortLabel: String,
    val description: String
) {
    LIVE_TRAFFIC("Tráfico en Vivo", "Tráfico", "Líneas de congestión en tiempo real"),
    RADAR_SCAN("Radar de Panas", "Radar", "Barrido 360° de conductores activos"),
    URBAN_NIGHT("Modo Nocturno", "Noche", "Contraste asfalto y neón de alta visibilidad"),
    SATELLITE_HYBRID("Satélite GPS", "Satélite", "Telemetría satelital y precisión HDOP")
}

data class GpsTelemetry(
    val satellitesCount: Int = 14,
    val accuracyMeters: Double = 2.4,
    val speedKmh: Double = 0.0,
    val bearingDegrees: Float = 48f,
    val altitudeMeters: Double = 445.0,
    val signalQuality: String = "Excelente (DGPS Dual-Band)",
    val isGpsLocked: Boolean = true
)

data class NearbyVehicle(
    val id: String,
    val serviceType: ServiceType,
    val driverName: String,
    val vehicleModel: String,
    val plate: String,
    val xRatio: Float,
    val yRatio: Float,
    val bearingDegrees: Float,
    val etaMinutes: Int,
    val isAvailable: Boolean = true
)

enum class CommunityAlertType(
    val title: String,
    val badgeLabel: String,
    val emoji: String
) {
    POLICE_CHECKPOINT("Punto de Control / Alcabala", "Alcabala", "👮"),
    POTHOLE("Hueco o vía deteriorada", "Hueco", "⚠️"),
    TRAFFIC_JAM("Cola pesada / Trancón", "Trancón", "🛑"),
    GAS_STATION("Bomba con Gasolina activa", "Gasolina", "⛽"),
    HEAVY_RAIN("Lluvia fuerte / Asfalto mojado", "Lluvia", "🌧️")
}

data class CommunityAlert(
    val id: String,
    val type: CommunityAlertType,
    val title: String,
    val description: String,
    val locationName: String,
    val xRatio: Float,
    val yRatio: Float,
    val reportedBy: String,
    val reportedMinutesAgo: Int,
    val confirmations: Int,
    val userConfirmed: Boolean = false
)

data class LocationSuggestion(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: String,
    val distanceKm: Double,
    val etaMinutes: Int,
    val priceEstimateUsd: Double,
    val lat: Double,
    val lng: Double,
    val tag: String,
    val stateId: String = "aragua",
    val cityName: String = "Maracay"
)

data class SafeMeetingPoint(
    val id: String,
    val title: String,
    val tag: String,
    val distanceText: String,
    val lat: Double,
    val lng: Double,
    val isWellLit: Boolean = true
)



/**
 * El mismo cálculo que `estimateTripFare` en la web: tarifa mínima + distancia +
 * tiempo, y nunca por debajo de la mínima.
 */
fun tarifaUsd(
  minFareUsd: Double,
  perKmUsd: Double,
  perMinuteUsd: Double,
  km: Double,
  minutes: Int
): Double {
  val distancia = (km * 10).roundToInt() / 10.0
  val total = minFareUsd + perKmUsd * distancia + minutes * perMinuteUsd
  return (maxOf(minFareUsd, total) * 100).roundToInt() / 100.0
}

fun tarifaUsd(config: ConfigApp?, tipo: ServiceType, km: Double, minutes: Int): Double {
  val servicio = config?.service(tipo.slug)
  return tarifaUsd(
    minFareUsd = servicio?.minFareUsd ?: tipo.minFareUsd,
    perKmUsd = servicio?.perKmUsd ?: tipo.perKmUsd,
    perMinuteUsd = config?.fareRules?.perMinuteUsd ?: POR_MINUTO,
    km = km,
    minutes = minutes
  )
}

private const val POR_MINUTO = 0.04
