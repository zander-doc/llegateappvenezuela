import { z } from "zod";

const telefono = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Usa formato E.164, por ejemplo +584141234567");

const montoUsd = z.coerce
  .number()
  .positive("El monto debe ser mayor a 0")
  .max(10000, "El monto máximo por recarga es 10000 USD")
  .transform((value) => Math.round(value * 100) / 100);

const documento = z.string().trim().min(1, "Falta la ruta del documento").max(300);

// Un formulario público puede quedar en correo o en teléfono E.164: son los dos
// canales por donde el equipo puede responder.
const contacto = z
  .string()
  .trim()
  .min(3, "Escribe un correo o un teléfono para responderte")
  .max(200, "Ese contacto es demasiado largo")
  .refine(
    (valor) => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor) || /^\+[1-9]\d{7,14}$/.test(valor),
    "Escribe un correo (ana@ejemplo.com) o un teléfono con código de país (+584141234567)",
  );

// Los campos opcionales de los formularios llegan como cadena vacía cuando el
// visitante no los llena; en la bandeja eso debe ser null, no "".
function textoOpcional(max, mensaje) {
  return z
    .string()
    .trim()
    .max(max, mensaje)
    .optional()
    .transform((valor) => (valor ? valor : undefined));
}

const contenidoBase64 = z
  .string()
  .trim()
  .min(16, "El archivo está vacío")
  // 5 MB en bytes son ~6.7 MB en base64; el límite real se valida al decodificar.
  .max(7_000_000, "El archivo es demasiado grande");

export const uuidSchema = z.string().uuid("Identificador inválido");

export const otpRequestSchema = z.object({
  telefono,
  nombre: z.string().trim().min(2).max(120).optional(),
  estado: z.string().trim().min(2).max(60).optional(),
  ciudad: z.string().trim().min(2).max(120).optional(),
  rol: z.enum(["cliente", "conductor"]).default("cliente"),
});

export const otpVerifySchema = z.object({
  telefono,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código SMS tiene 6 dígitos"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .trim()
    .min(10, "Falta el refresh_token")
    .max(4096, "Refresh token inválido"),
});

// PATCH /auth/perfil: solo campos que la persona puede editar de su propia
// cuenta. El rol, el saldo y el teléfono verificado no se aceptan aquí.
export const perfilPatchSchema = z
  .object({
    nombre: z.string().trim().min(2, "El nombre necesita al menos 2 letras").max(120).optional(),
    estado: z.string().trim().min(2, "Elige tu estado").max(60).optional(),
    ciudad: z.string().trim().min(2, "Elige tu ciudad").max(120).optional(),
    whatsapp: telefono.optional(),
  })
  .refine((cambios) => Object.values(cambios).some((valor) => valor !== undefined), {
    message: "Envía al menos un dato para cambiar",
    path: ["perfil"],
  });

export const driverDetailsSchema = z.object({
  cedula: z
    .string()
    .trim()
    .regex(/^[VE][0-9]{6,9}$/i, "Cédula venezolana: V o E seguida de 6 a 9 dígitos")
    .transform((value) => value.toUpperCase()),
  tipo_vehiculo: z.enum(["moto", "carro"]),
  placa: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{5,10}$/i, "Placa inválida")
    .transform((value) => value.toUpperCase()),
  marca: z.string().trim().min(2).max(60).optional(),
  modelo: z.string().trim().min(1).max(60).optional(),
  anio: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1)
    .optional(),
  // Rutas legadas del primer registro. El flujo nuevo sube los archivos por
  // POST /drivers/me/documentos, así que ya no son obligatorias.
  cedula_url: documento.optional(),
  licencia_url: documento.optional(),
  certificado_medico_url: documento.optional(),
});

export const pagoMovilSchema = z.object({
  monto_usd: montoUsd,
  banco: z.string().trim().min(3, "Indica el banco emisor").max(60),
  referencia: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "La referencia del Pago Móvil debe tener de 6 a 12 dígitos"),
  comprobante_url: documento.optional(),
});

export const binanceSchema = z.object({
  monto_usd: montoUsd,
  referencia: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,64}$/, "Usa el ID de la orden de Binance (6 a 64 caracteres alfanuméricos)"),
  comprobante_url: documento.optional(),
});

export const paymentIntentSchema = z.object({
  metodo: z.enum(["pago_movil", "binance_pay"]),
  monto_usd: montoUsd,
});

export const paymentReportSchema = z.object({
  referencia: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "La referencia del Pago Móvil debe tener de 6 a 12 dígitos"),
  comprobante_url: documento.optional(),
});

export const createTripSchema = z.object({
  origen: z.string().trim().min(3).max(200),
  destino: z.string().trim().min(3).max(200),
  precio_usd: montoUsd,
  distancia_km: z.coerce.number().positive().max(500).optional(),
  metodo_pago: z.enum(["efectivo", "pago_movil", "binance_pay", "saldo"]).default("efectivo"),
});

const coordenadaLatitud = z.coerce.number().min(-90).max(90);
const coordenadaLongitud = z.coerce.number().min(-180).max(180);

export const createScheduledRideSchema = z
  .object({
    origen: z.string().trim().min(3).max(200),
    destino: z.string().trim().min(3).max(200),
    origen_lat: coordenadaLatitud.optional(),
    origen_lng: coordenadaLongitud.optional(),
    destino_lat: coordenadaLatitud.optional(),
    destino_lng: coordenadaLongitud.optional(),
    servicio: z.enum(["mototaxi", "taxi-pana", "delivery"]),
    programado_para: z
      .string()
      .datetime({ offset: true })
      .refine((value) => Date.parse(value) > Date.now(), "La fecha debe ser futura"),
    distancia_km: z.coerce.number().positive().max(500).optional(),
    precio_usd: montoUsd,
    metodo_pago: z.enum(["efectivo", "pago_movil", "binance_pay", "saldo"]).default("efectivo"),
  })
  .refine(
    (viaje) =>
      (viaje.origen_lat === undefined) === (viaje.origen_lng === undefined) &&
      (viaje.destino_lat === undefined) === (viaje.destino_lng === undefined),
    {
      message: "Envía latitud y longitud juntas para cada punto",
      path: ["coordenadas"],
    },
  );

export const favoriteAddressSchema = z.object({
  etiqueta: z.string().trim().min(1).max(40),
  direccion_texto: z.string().trim().min(3).max(300),
  lat: coordenadaLatitud,
  lng: coordenadaLongitud,
});

export const favoriteDriverSchema = z.object({
  conductor_id: uuidSchema,
});

export const applyReferralSchema = z.object({
  codigo_referido: z.string().trim().min(8).max(50),
});

export const rejectSchema = z.object({
  motivo: z.string().trim().min(3, "Explica el motivo del rechazo").max(300),
});

export const cancelTripSchema = z.object({
  motivo: z.string().trim().max(300).optional(),
});

export const verifyDriverSchema = z.object({
  aprobado: z.boolean(),
  motivo: z.string().trim().max(300).optional(),
});

export const estadoVerificacionSchema = z.enum(["pendiente", "aprobado", "rechazado"], {
  errorMap: () => ({ message: "Usa pendiente, aprobado o rechazado" }),
});

export const driverDocumentSchema = z.object({
  tipo: z.enum(["cedula_frente", "cedula_reverso", "licencia", "certificado_medico"]),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  contenido_base64: contenidoBase64,
});

export const TIPOS_SOLICITUD = [
  "contacto",
  "empresa",
  "aliado",
  "lanzamiento",
  "conductor",
  "cobertura",
  "plan",
];

export const tipoSolicitudSchema = z.enum(TIPOS_SOLICITUD, {
  errorMap: () => ({ message: "Ese tipo de solicitud no existe" }),
});

// El contexto del formulario (plan, servicio, plataforma) entra como objeto
// plano de valores cortos: nunca documentos, nunca credenciales.
const datosSolicitud = z
  .record(z.string().min(1).max(40), z.union([z.string().trim().max(120), z.number(), z.boolean()]))
  .refine((datos) => Object.keys(datos).length <= 12, "Demasiados datos adjuntos");

export const solicitudSchema = z.object({
  tipo: tipoSolicitudSchema,
  nombre: textoOpcional(120, "Ese nombre es demasiado largo"),
  contacto,
  ciudad: textoOpcional(120, "Esa ciudad es demasiado larga"),
  mensaje: textoOpcional(2000, "El mensaje no puede pasar de 2000 caracteres"),
  datos: datosSolicitud.optional(),
  origen: textoOpcional(200, "Ese origen es demasiado largo"),
});

export const estadoSolicitudSchema = z.enum(["nueva", "en_curso", "respondida", "archivada"], {
  errorMap: () => ({ message: "Usa nueva, en_curso, respondida o archivada" }),
});

export const solicitudNotaSchema = textoOpcional(500, "Esa nota es demasiado larga");

export const solicitudEstadoSchema = z.object({
  estado: estadoSolicitudSchema,
  nota: solicitudNotaSchema,
});

// ---------------------------------------------------------------------------
// Vitrina del Mercado Motor
// ---------------------------------------------------------------------------

// Son las seis categorías que la propia página promete; el slug viaja en texto
// y no en un enum para que añadir una categoría no exija una migración.
export const CATEGORIAS_NEGOCIO = [
  "repuestos",
  "talleres",
  "cauchos",
  "gruas",
  "lubricantes",
  "accesorios",
];

export const categoriaNegocioSchema = z.enum(CATEGORIAS_NEGOCIO, {
  errorMap: () => ({ message: "Elige una de las categorías de la vitrina" }),
});

const enlaceNegocio = z
  .string()
  .trim()
  .max(300, "Ese enlace es demasiado largo")
  .refine((valor) => valor === "" || /^https?:\/\/[^\s]+\.[^\s]{2,}$/.test(valor), {
    message: "Escribe el enlace completo, por ejemplo https://instagram.com/tu-taller",
  })
  .transform((valor) => (valor ? valor : undefined))
  .optional();

export const negocioSchema = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre del negocio").max(120),
  categoria: categoriaNegocioSchema,
  ciudad: z.string().trim().min(2, "Indica la ciudad del negocio").max(80),
  zona: textoOpcional(120, "Esa zona es demasiado larga"),
  direccion: textoOpcional(240, "Esa dirección es demasiado larga"),
  horario: textoOpcional(240, "Ese horario es demasiado largo"),
  oferta: textoOpcional(500, "La oferta no puede pasar de 500 caracteres"),
  descripcion: textoOpcional(2000, "La descripción no puede pasar de 2000 caracteres"),
  sitio: enlaceNegocio,
  contacto,
  telefono_publico: textoOpcional(40, "Ese teléfono visible es demasiado largo"),
});

export const estadoNegocioSchema = z.enum(
  ["pendiente", "publicado", "rechazado", "archivado"],
  { errorMap: () => ({ message: "Usa pendiente, publicado, rechazado o archivado" }) },
);

export const negocioEstadoSchema = z
  .object({
    estado: estadoNegocioSchema,
    // El rechazo se publica en la ficha del dueño: sin motivo no hay rechazo.
    motivo: textoOpcional(300, "Ese motivo es demasiado largo"),
    nota: solicitudNotaSchema,
    verificado: z.boolean().optional(),
  })
  .refine((valor) => valor.estado !== "rechazado" || (valor.motivo ?? "").length >= 3, {
    message: "Explica por qué se rechaza la ficha",
    path: ["motivo"],
  });

export const negociosQuerySchema = z.object({
  categoria: categoriaNegocioSchema.optional(),
  ciudad: textoOpcional(80, "Esa ciudad es demasiado larga"),
  q: textoOpcional(80, "Esa búsqueda es demasiado larga"),
  limite: z.coerce
    .number()
    .int("El límite debe ser un número entero")
    .min(1)
    .max(100, "La vitrina entrega máximo 100 fichas por página")
    .optional(),
});
