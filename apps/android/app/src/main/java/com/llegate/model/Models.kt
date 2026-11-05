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
) {
    /** `viajes.origen` y `viajes.destino` son texto en la base: sin coordenadas no hay mapa. */
    val tieneCoordenadas: Boolean
        get() = lat != 0.0 || lng != 0.0
}

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
    val tipoVehiculo: String?,
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

/**
 * La carrera que se está viendo en `TripActiveScreen`. Todo sale de `GET /trips/:id`:
 * el servicio pedido no se guarda en la base, así que el icono se elige con el vehículo
 * real del piloto y el mapa solo se dibuja cuando hay coordenadas.
 */
data class ActiveTrip(
    val viajeId: String,
    val origin: LocationPoint,
    val destination: LocationPoint,
    val precioUsd: Double,
    val precioBs: Double,
    val metodoPagoTexto: String,
    val driver: DriverProfile?,
    val currentStep: TripStep,
    val progressFraction: Float = 0f
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
    val lng: Double
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
