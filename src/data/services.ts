export type ServiceIcon = "bike" | "car" | "van" | "bus" | "package" | "truck";

export interface Service {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  description: string;
  icon: ServiceIcon;
  fromUSD: number;
  perKmUSD: number;
  capacity: string;
  eta: string;
  bestFor: string[];
  features: string[];
  routes: { from: string; to: string; usd: number }[];
  faqs: { q: string; a: string }[];
}

export const SERVICES: Service[] = [
  {
    slug: "mototaxi",
    name: "Mototaxi",
    short: "El viaje más rápido para distancias cortas.",
    tagline: "Llega en minutos, sin trancas.",
    description:
      "Para trayectos cortos dentro de la ciudad: de la casa al trabajo, al mercado o a la parada. Pides desde la app, ves el precio antes de confirmar y compartes tu ruta con quien quieras.",
    icon: "bike",
    fromUSD: 1.5,
    perKmUSD: 0.6,
    capacity: "1 pasajero",
    eta: "3 a 7 min",
    bestFor: ["Distancias de 1 a 6 km", "Calles angostas o tráfico pesado", "Viajes rápidos y económicos"],
    features: [
      "Casco y chaleco disponibles para el pasajero",
      "Precio cerrado antes de subir",
      "Ruta compartida en tiempo real",
      "Pago en bolívares o dólares",
    ],
    routes: [
      { from: "Sabana Grande", to: "Bellas Artes", usd: 2.1 },
      { from: "Chacao", to: "Altamira", usd: 2.4 },
      { from: "Centro de Maracaibo", to: "Bella Vista", usd: 2.8 },
    ],
    faqs: [
      {
        q: "¿El casco está incluido?",
        a: "El conductor lleva un casco de cortesía para el pasajero. Si prefieres usar el tuyo, puedes hacerlo sin costo adicional.",
      },
      {
        q: "¿Puedo llevar una mochila o bolsas?",
        a: "Sí, siempre que quepan en el espacio trasero y no comprometan la seguridad. Para paquetes grandes usa Delivery Express.",
      },
    ],
  },
  {
    slug: "taxi-pana",
    name: "Taxi Pana",
    short: "El carro completo, para ti y los tuyos.",
    tagline: "Tu carro, tu música, tu ruta.",
    description:
      "Un carro privado para hasta cuatro pasajeros. Ideal para diligencias, salidas familiares o cuando llevas equipaje. Tarifa calculada por distancia, sin regateos.",
    icon: "car",
    fromUSD: 3.5,
    perKmUSD: 1.1,
    capacity: "Hasta 4 pasajeros",
    eta: "5 a 10 min",
    bestFor: ["Diligencias y compras", "Salidas familiares", "Viajes con equipaje mediano"],
    features: [
      "Carro privado solo para tu grupo",
      "Aire acondicionado y cinturones en todas las plazas",
      "Maletero para dos maletas medianas",
      "Recibo digital del viaje",
    ],
    routes: [
      { from: "Caracas · Centro", to: "Las Mercedes", usd: 6.2 },
      { from: "Valencia · Naguanagua", to: "Centro", usd: 4.9 },
      { from: "Barquisimeto · Este", to: "Centro", usd: 5.5 },
    ],
    faqs: [
      {
        q: "¿Puedo parar en el camino?",
        a: "Sí. Puedes añadir una parada antes de confirmar el viaje; el estimado se actualiza con la distancia extra.",
      },
      {
        q: "¿Cómo pago el viaje?",
        a: "Puedes pagar en efectivo (bolívares o dólares) o con saldo Llégate. El monto se muestra antes de confirmar.",
      },
    ],
  },
  {
    slug: "minivan-vip",
    name: "Minivan VIP",
    short: "Aeropuerto, empresas y traslados reservados.",
    tagline: "Reserva con tiempo. Viaja cómodo.",
    description:
      "Minivans de 7 plazas para traslados al aeropuerto, reuniones de trabajo o grupos. Se reserva con anticipación y el conductor te espera con tu nombre en la salida.",
    icon: "van",
    fromUSD: 25,
    perKmUSD: 1.4,
    capacity: "Hasta 7 pasajeros",
    eta: "Reserva programada",
    bestFor: ["Aeropuerto Maiquetía y La Chinita", "Traslados corporativos", "Grupos con equipaje"],
    features: [
      "Reserva desde 2 horas antes",
      "Seguimiento de vuelo para ajustar la hora de llegada",
      "Espacio para 7 maletas",
      "Conductor identificado con tu nombre",
    ],
    routes: [
      { from: "Maiquetía (CCS)", to: "Caracas · Este", usd: 25 },
      { from: "La Chinita (MAR)", to: "Maracaibo · Norte", usd: 30 },
      { from: "Valencia", to: "Puerto Cabello", usd: 38 },
    ],
    faqs: [
      {
        q: "¿Qué pasa si mi vuelo se retrasa?",
        a: "El conductor sigue el estado del vuelo y ajusta la hora de recogida sin cobro extra dentro de la misma reserva.",
      },
      {
        q: "¿Puedo reservar para varias paradas?",
        a: "Sí. En la reserva puedes indicar hasta tres paradas y el estimado se calcula con el recorrido completo.",
      },
    ],
  },
  {
    slug: "autobus-frontera",
    name: "Autobús y Frontera",
    short: "Rutas interurbanas y traslados a la frontera.",
    tagline: "Sal de la ciudad, con tu puesto asegurado.",
    description:
      "Puestos en unidades de 14 a 24 plazas para rutas entre ciudades y hacia la frontera. Compra tu puesto con anticipación, elige tu hora de salida y recibe los datos de la unidad.",
    icon: "bus",
    fromUSD: 12,
    perKmUSD: 0.25,
    capacity: "14 a 24 puestos",
    eta: "Salidas programadas",
    bestFor: ["Rutas Caracas–Valencia–Barquisimeto", "San Antonio y Cúcuta", "Viajes con equipaje grande"],
    features: [
      "Puesto asignado al comprar",
      "Datos de la unidad y del conductor antes de salir",
      "Una maleta incluida; equipaje extra con recargo",
      "Paradas programadas en el camino",
    ],
    routes: [
      { from: "Caracas", to: "Valencia", usd: 12 },
      { from: "Maracaibo", to: "San Antonio", usd: 18 },
      { from: "Barquisimeto", to: "Caracas", usd: 16 },
    ],
    faqs: [
      {
        q: "¿Necesito comprar con anticipación?",
        a: "Recomendamos comprar al menos 24 horas antes. Las salidas se confirman cuando se completa el mínimo de puestos.",
      },
      {
        q: "¿Cuánto equipaje puedo llevar?",
        a: "Una maleta grande y un bolso de mano por persona. El equipaje adicional se paga al abordar y se muestra al reservar.",
      },
    ],
  },
  {
    slug: "delivery",
    name: "Delivery Express",
    short: "Envía algo pequeño, hoy mismo.",
    tagline: "De tu puerta a su puerta.",
    description:
      "Entregas dentro de la ciudad en moto o carro. Útil para documentos, comida, medicinas o cualquier paquete de hasta 5 kg. Quien recibe puede confirmar la entrega desde su teléfono.",
    icon: "package",
    fromUSD: 1.8,
    perKmUSD: 0.7,
    capacity: "Hasta 5 kg",
    eta: "20 a 45 min",
    bestFor: ["Documentos y llaves", "Comida y medicinas", "Paquetes de hasta 5 kg"],
    features: [
      "Código de entrega para quien recibe",
      "Foto del paquete al recogerlo",
      "Seguimiento hasta la puerta",
      "Tarifa por distancia, sin regateo",
    ],
    routes: [
      { from: "Chacao", to: "Sabana Grande", usd: 2.9 },
      { from: "Maracaibo · Centro", to: "Bella Vista", usd: 3.2 },
      { from: "Valencia · Prebo", to: "Naguanagua", usd: 3.6 },
    ],
    faqs: [
      {
        q: "¿Qué puedo enviar?",
        a: "Documentos, ropa, comida empacada, medicinas y paquetes de hasta 5 kg. No se permiten sustancias peligrosas, animales ni objetos de valor sin declarar.",
      },
      {
        q: "¿Cómo sabe quien recibe que el paquete llegó?",
        a: "Recibe un código de 4 dígitos y lo comparte con el mensajero al recibir. En la app ves la confirmación con foto.",
      },
    ],
  },
  {
    slug: "encomiendas-carga",
    name: "Encomiendas y Carga",
    short: "Mudanzas pequeñas y carga ligera.",
    tagline: "Lo que no cabe en el carro, va aquí.",
    description:
      "Camionetas y camiones para encomiendas, mobiliario o carga de hasta 500 kg. Reserva con medida y peso aproximado para asignar la unidad correcta y recibir un precio cerrado.",
    icon: "truck",
    fromUSD: 18,
    perKmUSD: 1.3,
    capacity: "Hasta 500 kg",
    eta: "Reserva programada",
    bestFor: ["Mudanzas pequeñas", "Mobiliario y electrodomésticos", "Encomiendas entre ciudades"],
    features: [
      "Unidad según peso y volumen",
      "Ayudante opcional para carga y descarga",
      "Precio cerrado antes de reservar",
      "Comprobante de entrega firmado",
    ],
    routes: [
      { from: "Caracas · Oeste", to: "Caracas · Este", usd: 22 },
      { from: "Valencia", to: "Maracay", usd: 34 },
      { from: "Barquisimeto", to: "Quíbor", usd: 18 },
    ],
    faqs: [
      {
        q: "¿Cómo calculo el precio si no sé el peso?",
        a: "Indica el tipo de carga (mueble, caja, electrodoméstico) y una foto si la tienes. El precio se confirma antes de asignar la unidad.",
      },
      {
        q: "¿Incluye ayuda para cargar?",
        a: "No por defecto. Puedes sumar un ayudante durante la reserva; el costo se muestra antes de confirmar.",
      },
    ],
  },
];

export const getService = (slug?: string) => SERVICES.find((s) => s.slug === slug);

export const SERVICE_ICON_LABEL: Record<ServiceIcon, string> = {
  bike: "Moto",
  car: "Carro",
  van: "Minivan",
  bus: "Autobús",
  package: "Paquete",
  truck: "Camión",
};
