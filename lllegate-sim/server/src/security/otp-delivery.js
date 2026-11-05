import { config } from "../config.js";
import { enviarCodigoWhatsApp, whatsappDisponible } from "./whatsapp.js";

export function smsDisponible(sms = config.otp.sms) {
  return Boolean(sms.accountSid && sms.authToken && sms.from);
}

export async function enviarCodigoSms({
  telefono,
  codigo,
  fetchImpl = globalThis.fetch,
  sms = config.otp.sms,
}) {
  if (!smsDisponible(sms)) {
    throw new Error("sms_no_configurado");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sms.accountSid)}/Messages.json`;
  const credenciales = Buffer.from(`${sms.accountSid}:${sms.authToken}`).toString("base64");
  const cuerpo = new URLSearchParams({
    To: String(telefono),
    From: sms.from,
    Body: `Tu código de Llégate es ${codigo}. Vence en ${config.otp.ttlMinutos} minutos.`,
  });

  const respuesta = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credenciales}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: cuerpo,
    signal: AbortSignal.timeout(10_000),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`sms_${respuesta.status}: ${detalle.slice(0, 200)}`);
  }

  return { ok: true };
}

// Orden de preferencia: WhatsApp (gratis en el plan de Meta para Venezuela),
// SMS por Twilio y, solo fuera de producción, el log del servidor.
export function canalOtp(
  whatsapp = config.otp.whatsapp,
  sms = config.otp.sms,
  registrarEnLog = config.otp.registrarEnLog,
) {
  if (whatsappDisponible(whatsapp)) return "whatsapp";
  if (smsDisponible(sms)) return "sms";
  if (registrarEnLog) return "log";
  return null;
}

// El número de prueba de Meta solo entrega a los destinatarios verificados.
// Si el proveedor falla, se intenta el siguiente canal para que el registro no
// quede bloqueado; el canal real se devuelve para decir la verdad al cliente.
export async function enviarCodigoOtp({
  telefono,
  codigo,
  whatsapp = config.otp.whatsapp,
  sms = config.otp.sms,
  registrarEnLog = config.otp.registrarEnLog,
  fetchImpl = globalThis.fetch,
  log = (mensaje) => console.log(mensaje),
}) {
  const fallos = [];

  if (whatsappDisponible(whatsapp)) {
    try {
      await enviarCodigoWhatsApp({ telefono, codigo, whatsapp, fetchImpl });
      return "whatsapp";
    } catch (error) {
      fallos.push(`whatsapp: ${error.message}`);
    }
  }

  if (smsDisponible(sms)) {
    try {
      await enviarCodigoSms({ telefono, codigo, sms, fetchImpl });
      return "sms";
    } catch (error) {
      fallos.push(`sms: ${error.message}`);
    }
  }

  // Sin esta línea el respaldo en el log tapa el motivo del fallo y el error de
  // Meta nunca se ve; es lo único que permite diagnosticar la entrega.
  if (fallos.length) {
    log(`[otp] fallo de envío: ${fallos.join("; ")}`);
  }

  if (registrarEnLog) {
    log(`[otp] ${telefono}: ${codigo}`);
    return "log";
  }

  if (fallos.length) {
    throw new Error(`otp_envio_error (${fallos.join("; ")})`);
  }
  throw new Error("otp_no_configurado");
}
