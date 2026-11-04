import { config } from "../config.js";
import { HttpError } from "../http.js";

// Pago Móvil semiautomático: la API entrega los datos del comercio y el monto
// exacto en bolívares. El usuario paga desde su banco y reporta la referencia;
// un admin confirma en el panel. No se inventa una verificación bancaria que
// hoy no existe.

export function pagoMovilDisponible(options = config.payments.pagoMovil) {
  return Boolean(
    options.banco &&
      options.telefono &&
      options.cedula &&
      options.titular &&
      options.tasaBs > 0,
  );
}

export function crearIntencionPagoMovil(montoUsd, options = config.payments.pagoMovil) {
  if (!pagoMovilDisponible(options)) {
    throw new HttpError(
      503,
      "pago_movil_no_configurado",
      "Pago Móvil no está disponible en este momento. Prueba con Binance Pay o espera la revisión manual.",
    );
  }

  const montoBs = Math.round(montoUsd * options.tasaBs * 100) / 100;
  const expiraMinutos = Math.min(Math.max(options.expiraMinutos, 5), 120);

  return {
    montoBs,
    tasaBs: options.tasaBs,
    expiraMinutos,
    instrucciones: {
      tipo: "pago_movil",
      banco: options.banco,
      telefono: options.telefono,
      cedula: options.cedula,
      titular: options.titular,
      monto_bs: montoBs,
      tasa_bs: options.tasaBs,
      nota: "Paga el monto exacto en bolívares y reporta la referencia que te da tu banco.",
    },
  };
}
