import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Cambia el token corto de Meta por uno de ~60 días y lo guarda en server/.env
// sin imprimirlo. Requiere WHATSAPP_APP_ID y WHATSAPP_APP_SECRET en ese archivo.

const envPath = resolve(process.cwd(), ".env");
const token = process.env.WHATSAPP_TOKEN;
const appId = process.env.WHATSAPP_APP_ID;
const appSecret = process.env.WHATSAPP_APP_SECRET;

async function main() {
  if (!token || !appId || !appSecret) {
    console.error("Faltan WHATSAPP_TOKEN, WHATSAPP_APP_ID o WHATSAPP_APP_SECRET en server/.env");
    process.exitCode = 1;
    return;
  }

  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", token);

  const respuesta = await fetch(url);
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok || !datos?.access_token) {
    console.error("Meta rechazó la extensión:", respuesta.status, datos);
    process.exitCode = 1;
    return;
  }

  const lineas = readFileSync(envPath, "utf8").split(/\r?\n/);
  let reemplazado = false;
  const nuevas = lineas.map((linea) => {
    if (!linea.startsWith("WHATSAPP_TOKEN=")) return linea;
    reemplazado = true;
    return `WHATSAPP_TOKEN=${datos.access_token}`;
  });
  if (!reemplazado) nuevas.push(`WHATSAPP_TOKEN=${datos.access_token}`);

  writeFileSync(envPath, nuevas.join("\n"));

  const vence = datos.expires_in
    ? new Date(Date.now() + datos.expires_in * 1000).toISOString()
    : "fecha desconocida";
  console.log(`Token extendido y guardado en server/.env. Vence: ${vence}.`);
}

await main();
