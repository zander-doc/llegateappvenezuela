import "dotenv/config";

// Pregunta a Meta qué números de teléfono existen DENTRO del WABA y cuáles son
// sus destinatarios permitidos. Sirve para detectar un WHATSAPP_PHONE_ID mal
// copiado, que es la causa del error "Object with ID ... does not exist".
// Imprime identificadores, números y estados: ningún secreto.

const wabaId = process.argv[2] || process.env.WHATSAPP_WABA_ID;
const token = process.env.WHATSAPP_TOKEN;
const version = process.env.WHATSAPP_API_VERSION || "v21.0";

async function graph(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  for (const [clave, valor] of Object.entries(params)) url.searchParams.set(clave, valor);
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const datos = await respuesta.json().catch(() => null);
  return { ok: respuesta.ok, status: respuesta.status, datos };
}

function errorDe(datos) {
  const error = datos?.error || {};
  return `code=${error.code ?? "?"} ${String(error.message || "").slice(0, 180)}`;
}

async function main() {
  if (!token || !wabaId) {
    console.log(`SIN_CONFIGURACION ${token ? "token_ok" : "falta_token"} ${wabaId ? "waba_ok" : "pasa_el_waba_id"}`);
    console.log("uso: npm run whatsapp:numeros -- <WABA_ID>");
    process.exitCode = 1;
    return;
  }

  const numeros = await graph(`${wabaId}/phone_numbers`, {
    fields: "id,display_phone_number,platform_type,verified_name,name_status",
  });
  if (!numeros.ok) {
    console.log(`NUMEROS_FALLO http=${numeros.status} ${errorDe(numeros.datos)}`);
    process.exitCode = 1;
    return;
  }

  const lista = numeros.datos?.data ?? [];
  if (!lista.length) {
    console.log("NUMEROS=0 este WABA no tiene ningún número de teléfono");
    return;
  }

  console.log(`NUMEROS=${lista.length} en el WABA ${wabaId}`);
  for (const numero of lista) {
    console.log(`  id=${numero.id} ${numero.display_phone_number ?? "?"} ${numero.platform_type ?? "?"} ${numero.verified_name ?? ""}`);

    const permitidos = await graph(`${numero.id}/allowed_whatsapp_numbers`, {
      fields: "number,verification_status",
    });
    if (!permitidos.ok) {
      console.log(`    destinatarios: no disponible (${errorDe(permitidos.datos)})`);
      continue;
    }
    const destinatarios = permitidos.datos?.data ?? [];
    if (!destinatarios.length) {
      console.log("    destinatarios: 0 (nadie puede recibir de este número)");
      continue;
    }
    console.log(`    destinatarios: ${destinatarios.map((d) => `${d.number ?? "?"} ${d.verification_status ?? "?"}`).join(", ")}`);
  }
}

await main();
