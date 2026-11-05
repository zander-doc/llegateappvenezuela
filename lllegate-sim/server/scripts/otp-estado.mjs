import "dotenv/config";

// Imprime SOLO el estado de la plantilla de OTP, pasado por una lista blanca.
// Nunca imprime el token, ni el cuerpo de una respuesta de error, ni URLs de Graph.

const BLANCA = new Set(["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED", "TEMPLATE"]);
const wabaId = process.argv[2] || process.env.WHATSAPP_WABA_ID;
const token = process.env.WHATSAPP_TOKEN;
const nombre = process.env.WHATSAPP_OTP_TEMPLATE || "llegate_otp";
const idioma = process.env.WHATSAPP_OTP_LANGUAGE || "es";
const version = process.env.WHATSAPP_API_VERSION || "v21.0";

if (!token || !wabaId) {
  // Solo dice qué falta; nunca imprime valores.
  console.log(`estado=SIN_CONFIGURACION ${token ? "token_ok" : "falta_token"} ${wabaId ? "waba_ok" : "falta_waba"}`);
  process.exit(0);
}

const url = new URL(`https://graph.facebook.com/${version}/${wabaId}/message_templates`);
url.searchParams.set("name", nombre);
url.searchParams.set("language", idioma);
url.searchParams.set("fields", "status");

try {
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!respuesta.ok) {
    console.log(`estado=CONSULTA_FALLO http=${respuesta.status}`);
    process.exit(0);
  }
  const datos = await respuesta.json();
  const bruta = String(datos?.data?.[0]?.status ?? "NO_ENCONTRADA");
  console.log(`estado=${BLANCA.has(bruta) ? bruta : "DESCONOCIDA"}`);
} catch {
  console.log("estado=CONSULTA_FALLO http=0");
}
