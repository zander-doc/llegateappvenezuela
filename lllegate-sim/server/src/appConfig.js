// Configuración de negocio que consume la app Android. Es la misma que muestra la
// web, copiada de src/data/services.ts y src/data/prepaid.ts; el test
// src/data/appConfig.test.ts falla si las dos listas dejan de coincidir, así que
// cambiar un precio aquí sin cambiarlo en la web se detecta solo.

export const APP_CONFIG_VERSION = 1;

export const APP_SERVICES = [
  {
    slug: "mototaxi",
    name: "Mototaxi",
    short: "El viaje más rápido para distancias cortas.",
    tagline: "Llega en minutos, sin trancas.",
    description:
      "Para trayectos cortos dentro de la ciudad: de la casa al trabajo, al mercado o a la parada. Pides desde la app, ves el precio antes de confirmar y compartes tu ruta con quien quieras.",
    icon: "bike",
    minFareUSD: 1,
    perKmUSD: 0.3,
    capacity: "1 pasajero",
    eta: "3 a 7 min",
    status: "launch",
    phase: null,
  },
  {
    slug: "taxi-pana",
    name: "Taxi Pana",
    short: "El carro completo, para ti y los tuyos.",
    tagline: "Tu carro, tu música, tu ruta.",
    description:
      "Un carro privado para hasta cuatro pasajeros. Ideal para diligencias, salidas familiares o cuando llevas equipaje. Tarifa calculada por distancia, sin regateos.",
    icon: "car",
    minFareUSD: 3,
    perKmUSD: 0.5,
    capacity: "Hasta 4 pasajeros",
    eta: "5 a 10 min",
    status: "launch",
    phase: null,
  },
  {
    slug: "minivan-vip",
    name: "Minivan VIP",
    short: "Aeropuerto, empresas y traslados reservados.",
    tagline: "Reserva con tiempo. Viaja cómodo.",
    description:
      "Minivans de 7 plazas para traslados al aeropuerto, reuniones de trabajo o grupos. Se reserva con anticipación y el conductor te espera con tu nombre en la salida.",
    icon: "van",
    minFareUSD: 25,
    perKmUSD: 1.4,
    capacity: "Hasta 7 pasajeros",
    eta: "Reserva programada",
    status: "upcoming",
    phase: "Fase 2",
  },
  {
    slug: "autobus-frontera",
    name: "Autobús y Frontera",
    short: "Rutas interurbanas y traslados a la frontera.",
    tagline: "Sal de la ciudad, con tu puesto asegurado.",
    description:
      "Puestos en unidades de 14 a 24 plazas para rutas entre ciudades y hacia la frontera. Compra tu puesto con anticipación, elige tu hora de salida y recibe los datos de la unidad.",
    icon: "bus",
    minFareUSD: 12,
    perKmUSD: 0.25,
    capacity: "14 a 24 puestos",
    eta: "Salidas programadas",
    status: "upcoming",
    phase: "Fase 3",
  },
  {
    slug: "delivery",
    name: "Delivery Express",
    short: "Envía algo pequeño, hoy mismo.",
    tagline: "De tu puerta a su puerta.",
    description:
      "Entregas dentro de la ciudad en moto o carro. Útil para documentos, comida, medicinas o cualquier paquete de hasta 5 kg. Quien recibe puede confirmar la entrega desde su teléfono.",
    icon: "package",
    minFareUSD: 1,
    perKmUSD: 0.35,
    capacity: "Hasta 5 kg",
    eta: "20 a 45 min",
    status: "launch",
    phase: null,
  },
  {
    slug: "encomiendas-carga",
    name: "Encomiendas y Carga",
    short: "Mudanzas pequeñas y carga ligera.",
    tagline: "Lo que no cabe en el carro, va aquí.",
    description:
      "Camionetas y camiones para encomiendas, mobiliario o carga de hasta 500 kg. Reserva con medida y peso aproximado para asignar la unidad correcta y recibir un precio cerrado.",
    icon: "truck",
    minFareUSD: 18,
    perKmUSD: 1.3,
    capacity: "Hasta 500 kg",
    eta: "Reserva programada",
    status: "upcoming",
    phase: "Fase 3",
  },
];

// Reglas de la billetera de prepago; los mismos números que PILOT_RULES en la web.
export const APP_WALLET_RULES = {
  commissionRate: 0.1,
  minCommissionUSD: 0.1,
  minBalanceUSD: 1,
  lowBalanceUSD: 2,
  welcomeUSD: 2,
  minRechargeUSD: 5,
  maxRechargeUSD: 50,
  approvalSlaMinutes: 15,
};

export const APP_RECHARGE_PACKS = [
  { amount: 5, name: "Arranque", note: "Para empezar el día", recommended: false },
  { amount: 10, name: "Ritmo", note: "La más pedida", recommended: true },
  { amount: 20, name: "Semana", note: "Menos recargas", recommended: false },
  { amount: 50, name: "Turno largo", note: "Mayor cobertura", recommended: false },
];

// Cómo se arma el precio de un viaje, igual que estimateTripFare en la web.
export const APP_FARE_RULES = {
  model: "min_fare_plus_km",
  perKm: true,
  perMinuteUSD: 0.04,
  roundTripDoublesDistance: true,
  minFareChargedOnce: true,
  currency: "USD",
};

export const APP_CONFIG = {
  version: APP_CONFIG_VERSION,
  services: APP_SERVICES,
  fareRules: APP_FARE_RULES,
  walletRules: APP_WALLET_RULES,
  rechargePacks: APP_RECHARGE_PACKS,
};
