export type VendorCategory = "Repuestos" | "Talleres" | "Cauchos" | "Grúas" | "Lubricantes" | "Accesorios";

export interface Vendor {
  slug: string;
  name: string;
  category: VendorCategory;
  city: string;
  zone: string;
  description: string;
  offer: string;
  priceLabel: string;
  hours: string;
  verified: boolean;
  sponsored?: boolean;
  perks: string[];
}

export const VENDOR_CATEGORIES: VendorCategory[] = [
  "Repuestos",
  "Talleres",
  "Cauchos",
  "Grúas",
  "Lubricantes",
  "Accesorios",
];

export const VENDORS: Vendor[] = [
  {
    slug: "repuestos-el-motor",
    name: "Repuestos El Motor",
    category: "Repuestos",
    city: "Caracas",
    zone: "La Candelaria",
    description:
      "Repuestos originales y alternativos para carros y motos de uso diario. Asesoría por modelo y año, con entrega el mismo día en Caracas.",
    offer: "10% de descuento en pastillas de freno al mostrar tu viaje Llégate.",
    priceLabel: "Desde $6",
    hours: "Lun a Sáb · 8:00 a 17:00",
    verified: true,
    sponsored: true,
    perks: ["Entrega el mismo día en Caracas", "Garantía de 30 días", "Asesoría por modelo y año"],
  },
  {
    slug: "taller-los-pinos",
    name: "Taller Los Pinos",
    category: "Talleres",
    city: "Valencia",
    zone: "Los Pinos",
    description:
      "Mecánica general, frenos, suspensión y diagnóstico computarizado. Presupuesto cerrado antes de intervenir el vehículo.",
    offer: "Diagnóstico computarizado sin costo para conductores Pro.",
    priceLabel: "Diagnóstico $15",
    hours: "Lun a Vie · 7:30 a 16:30",
    verified: true,
    perks: ["Presupuesto por escrito", "Repuestos con garantía", "Atención con cita"],
  },
  {
    slug: "llantas-del-sur",
    name: "Llantas del Sur",
    category: "Cauchos",
    city: "Maracaibo",
    zone: "Bella Vista",
    description:
      "Cauchos nuevos y usados certificados, alineación y balanceo. Instalación incluida en compras de cuatro cauchos.",
    offer: "Balanceo gratis con la compra de dos cauchos.",
    priceLabel: "Desde $35",
    hours: "Lun a Sáb · 8:00 a 18:00",
    verified: true,
    sponsored: true,
    perks: ["Instalación incluida", "Certificado de estado del caucho", "Alineación y balanceo"],
  },
  {
    slug: "gruas-24-caracas",
    name: "Grúas 24 Caracas",
    category: "Grúas",
    city: "Caracas",
    zone: "Distrito Capital",
    description:
      "Traslado de vehículos por avería o accidente, dentro de la ciudad y hacia otras ciudades. Atención coordinada por la app.",
    offer: "Tarifa preferente para conductores Llégate.",
    priceLabel: "Desde $25",
    hours: "Todos los días · 24 horas",
    verified: true,
    perks: ["Cobertura en toda Caracas", "Traslados interurbanos", "Coordinación por WhatsApp"],
  },
  {
    slug: "lubricantes-andinos",
    name: "Lubricantes Andinos",
    category: "Lubricantes",
    city: "Mérida",
    zone: "Centro",
    description:
      "Aceites, filtros y líquidos para carro y moto. Cambio de aceite express con registro del kilometraje de tu vehículo.",
    offer: "Cambio de aceite + filtro desde $18.",
    priceLabel: "Desde $18",
    hours: "Lun a Sáb · 8:00 a 16:00",
    verified: true,
    perks: ["Cambio express", "Registro de kilometraje", "Repuestos originales"],
  },
  {
    slug: "accesorios-pana",
    name: "Accesorios Pana",
    category: "Accesorios",
    city: "Barquisimeto",
    zone: "Este",
    description:
      "Fundas, soportes, cargadores y seguridad para motos y carros. Pedidos por la app con retiro en tienda o entrega.",
    offer: "Envío gratis en compras mayores a $20.",
    priceLabel: "Desde $4",
    hours: "Lun a Sáb · 9:00 a 18:00",
    verified: false,
    perks: ["Retiro en tienda", "Envío en la ciudad", "Cambios dentro de 7 días"],
  },
];

export const getVendor = (slug?: string) => VENDORS.find((v) => v.slug === slug);
