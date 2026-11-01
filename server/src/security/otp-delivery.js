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
export function canalOtp() {
  if (whatsappDisponible()) return "whatsapp";
  if (smsDisponible()) return "sms";
  if (config.otp.registrarEnLog) return "log";
  return null;
}

export async function enviarCodigoOtp({ telefono, codigo }) {
  const canal = canalOtp();

  if (canal === "whatsapp") {
    await enviarCodigoWhatsApp({ telefono, codigo });
    return "whatsapp";
  }
  if (canal === "sms") {
    await enviarCodigoSms({ telefono, codigo });
    return "sms";
  }
  if (canal === "log") {
    console.log(`[otp] ${telefono}: ${codigo}`);
    return "log";
  }

  throw new Error("otp_no_configurado");
}
