import "dotenv/config";

// Lista los destinatarios permitidos del NÚMERO DE PRUEBA de Meta
// (GET /{PHONE_NUMBER_ID}/allowed_whatsapp_numbers).
// Imprime números y estado de verificación: son los números que la app puede
// recibir, no credenciales. Nunca imprime el token.

const phoneId = process.argv[2] || process.env.WHATSAPP_PHONE_ID;
const token = process.env.WHATSAPP_TOKEN;
const version = process.env.WHATSAPP_API_VERSION || "v21.0";

async function main() {
  if (!token || !phoneId) {
    // Solo booleans: decir qué falta sin tocar los valores.
    console.log(
      `SIN_CONFIGURACION ${token ? "token_ok" : "falta_token"} ${phoneId ? "phone_ok" : "falta_phone_id"}`,
    );
    process.exitCode = 1;
    return;
  }

  const url = new URL(`https://graph.facebook.com/${version}/${phoneId}/allowed_whatsapp_numbers`);
  url.searchParams.set("fields", "number,verification_status,created_time");

  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = datos?.error || {};
    console.log(
      `CONSULTA_FALLO http=${respuesta.status} code=${error.code ?? "?"} subcode=${error.error_subcode ?? "?"} mensaje=${(error.message || "").slice(0, 160)}`,
    );
    process.exitCode = 1;
    return;
  }

  const numeros = datos?.data ?? [];
  if (!numeros.length) {
    console.log("DESTINATARIOS=0 (el número de prueba no tiene nadie agregado)");
    return;
  }

  for (const numero of numeros) {
    console.log(`${numero.number ?? "?"} ${numero.verification_status ?? "?"} ${numero.created_time ?? ""}`);
  }
}

await main();
