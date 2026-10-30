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

export const uuidSchema = z.string().uuid("Identificador inválido");

export const otpRequestSchema = z.object({
  telefono,
  nombre: z.string().trim().min(2).max(120).optional(),
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
  cedula_url: documento,
  licencia_url: documento,
  certificado_medico_url: documento,
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

export const createTripSchema = z.object({
  origen: z.string().trim().min(3).max(200),
  destino: z.string().trim().min(3).max(200),
  precio_usd: montoUsd,
  distancia_km: z.coerce.number().positive().max(500).optional(),
  metodo_pago: z.enum(["efectivo", "pago_movil", "binance_pay", "saldo"]).default("efectivo"),
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
