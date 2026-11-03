import "dotenv/config";

// Crea (o reutiliza) la plantilla de autenticación que envía el OTP por
// WhatsApp Cloud API. El token se lee de server/.env y nunca se imprime.
// Uso: node scripts/whatsapp-template.mjs <WABA_ID>

const wabaId = process.argv[2] || process.env.WHATSAPP_WABA_ID;
const token = process.env.WHATSAPP_TOKEN;
const name = process.env.WHATSAPP_OTP_TEMPLATE || "llegate_otp";
const language = process.env.WHATSAPP_OTP_LANGUAGE || "es";
const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

async function pedir(url, opciones) {
  const respuesta = await fetch(url, opciones);
  const texto = await respuesta.text();
  let datos;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { ok: respuesta.ok, status: respuesta.status, datos };
}

async function main() {
  if (!token) {
    console.error("Falta WHATSAPP_TOKEN en server/.env");
    process.exitCode = 1;
    return;
  }
  if (!wabaId) {
    console.error("Uso: node scripts/whatsapp-template.mjs <WABA_ID>");
    process.exitCode = 1;
    return;
  }

  const base = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;

  const existentes = await pedir(
    `${base}?name=${encodeURIComponent(name)}&fields=id,name,status,language,category`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!existentes.ok) {
    console.error("No se pudo consultar la plantilla:", existentes.status, existentes.datos);
    process.exitCode = 1;
    return;
  }

  const encontrada = existentes.datos?.data?.[0];
  if (encontrada) {
    console.log(
      `La plantilla ${name} ya existe: id ${encontrada.id}, estado ${encontrada.status}, idioma ${encontrada.language}.`,
    );
    return;
  }

  const plantilla = {
    name,
    language,
    category: "authentication",
    components: [
      { type: "body", add_security_recommendation: true },
      { type: "footer", code_expiration_minutes: 10 },
      {
        type: "buttons",
        buttons: [{ type: "otp", otp_type: "copy_code", text: "Copiar código" }],
      },
    ],
  };

  const creada = await pedir(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plantilla),
  });

  if (!creada.ok) {
    console.error("Meta rechazó la plantilla:", creada.status, creada.datos);
    process.exitCode = 1;
    return;
  }

  console.log("Plantilla enviada a revisión:", creada.datos);
}

await main();
