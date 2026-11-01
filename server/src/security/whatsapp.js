import { config } from "../config.js";

// Canal preferido para el OTP en Venezuela: la plantilla de Meta no tiene costo
// por conversación de servicio dentro del plan gratuito. Si faltan las
// credenciales, el API cae a SMS o, en desarrollo, al log.

export function whatsappDisponible(whatsapp = config.otp.whatsapp) {
  return Boolean(whatsapp.token && whatsapp.phoneId);
}

export async function enviarCodigoWhatsApp({
  telefono,
  codigo,
  fetchImpl = globalThis.fetch,
  whatsapp = config.otp.whatsapp,
}) {
  if (!whatsappDisponible(whatsapp)) {
    throw new Error("whatsapp_no_configurado");
  }

  const para = String(telefono ?? "").replace(/\D/g, "");
  if (para.length < 8) throw new Error("telefono_invalido");

  const url = `https://graph.facebook.com/${whatsapp.apiVersion}/${whatsapp.phoneId}/messages`;
  const cuerpo = {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: {
      name: whatsapp.template,
      language: { code: whatsapp.language },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: String(codigo) }],
        },
      ],
    },
  };

  const respuesta = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsapp.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`whatsapp_${respuesta.status}: ${detalle.slice(0, 200)}`);
  }

  return { ok: true };
}
