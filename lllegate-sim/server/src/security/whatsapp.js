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
        // Meta exige el botón "Copiar código" en las plantillas de
        // autenticación y que el código viaje también en ese componente.
        {
          type: "button",
          sub_type: "url",
          index: "0",
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

/** Los números que Meta reconoce dentro del WABA, con su identificador real. */
export async function numerosDelWaba({
  wabaId,
  fetchImpl = globalThis.fetch,
  whatsapp = config.otp.whatsapp,
}) {
  if (!whatsapp.token || !wabaId) {
    throw new Error("whatsapp_sin_credenciales_para_consultar");
  }

  const url = new URL(`https://graph.facebook.com/${whatsapp.apiVersion}/${wabaId}/phone_numbers`);
  url.searchParams.set("fields", "id,display_phone_number,verified_name");

  const respuesta = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${whatsapp.token}` },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`whatsapp_${respuesta.status}: ${detalle.slice(0, 200)}`);
  }

  const datos = await respuesta.json().catch(() => null);
  return (datos?.data ?? []).map((numero) => ({
    id: String(numero.id),
    numero: numero.display_phone_number ?? "?",
    nombre: numero.verified_name ?? "",
  }));
}

/**
 * Frase para el log: dice si el remitente configurado existe de verdad. Un
 * WHATSAPP_PHONE_ID mal copiado se veía como un misterioso "does not exist" de
 * Meta; aquí queda el candidato correcto a la vista.
 */
export function diagnosticoRemitente({ phoneId, numeros }) {
  if (!phoneId) return "[otp] WHATSAPP_PHONE_ID no está configurado.";
  if (!numeros.length) return `[otp] el WABA no tiene ningún número de teléfono; configurado: ${phoneId}`;

  const coincide = numeros.find((numero) => numero.id === phoneId);
  if (coincide) return `[otp] remitente configurado es correcto: ${coincide.id} (${coincide.numero}).`;

  const opciones = numeros.map((numero) => `${numero.id} (${numero.numero})`).join(", ");
  return `[otp] WHATSAPP_PHONE_ID=${phoneId} no es un número de este WABA. Opciones válidas: ${opciones}`;
}
