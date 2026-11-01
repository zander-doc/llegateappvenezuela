#!/usr/bin/env node
// Restaura un respaldo en una base destino. El destino debe tener el esquema
// aplicado (npm run db:migrate) y se vacía antes de cargar: nunca apunta a
// DATABASE_URL por defecto. Contra un host remoto exige --forzar.
//
// Uso:
//   npm run db:restore -- backups/llegate-20261101T030000Z.jsonl.gz --destino postgres://...
//   npm run db:restore -- <archivo> --destino <url> --forzar
//   npm run db:restore -- <archivo> --destino <url> --sin-verificar

import { resolve } from "node:path";
import "dotenv/config";
import pg from "pg";
import { leerManifiesto, restaurarRespaldo, verificarRespaldo } from "../src/backup.js";

function bandera(valor) {
  return ["1", "true", "si", "sí", "yes"].includes(valor?.trim().toLowerCase() ?? "");
}

function opcion(nombre) {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

const archivo = process.argv.slice(2).find((argumento) => !argumento.startsWith("--"));
const destino = opcion("--destino");
const forzar = process.argv.includes("--forzar");
const verificar = !process.argv.includes("--sin-verificar");

if (!archivo || !destino) {
  console.error(
    [
      "Uso: npm run db:restore -- <archivo.jsonl.gz> --destino <cadena de conexión> [--forzar]",
      "",
      "El destino se vacía y se recarga con el respaldo. No uses DATABASE_URL de",
      "producción salvo que quieras volver atrás de verdad: por eso, si el host no",
      "es local, hay que pasar --forzar.",
    ].join("\n"),
  );
  process.exit(1);
}

let anfitrion;
try {
  anfitrion = new URL(destino).hostname;
} catch {
  console.error("La cadena de --destino no es válida.");
  process.exit(1);
}

const locales = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!locales.has(anfitrion) && !forzar) {
  console.error(
    `El destino ${anfitrion} no es local. Esto BORRA las tablas de esa base y las ` +
      "reemplaza con el respaldo. Si es lo que quieres, repite el comando con --forzar.",
  );
  process.exit(1);
}

const ruta = resolve(archivo);
const tls = process.env.DATABASE_SSL
  ? bandera(process.env.DATABASE_SSL)
  : /sslmode=require|neon\.tech|render\.com|railway/.test(destino);

const cliente = new pg.Client({
  connectionString: destino,
  ssl: tls ? { rejectUnauthorized: false } : undefined,
});

await cliente.connect();

try {
  const manifiesto = await leerManifiesto(ruta);
  const filas = manifiesto.tablas.reduce((total, tabla) => total + tabla.filas, 0);
  console.log(
    `Respaldo del ${new Date(manifiesto.creado).toLocaleString()} de "${manifiesto.base}" ` +
      `(PostgreSQL ${manifiesto.version_pg}): ${filas} filas, ${manifiesto.migraciones.length} migraciones.`,
  );

  if (verificar) {
    await verificarRespaldo(ruta);
    console.log("Checksum y conteos verificados.");
  }

  console.log(`Restaurando en ${destino.replace(/\/\/[^@]+@/, "//****@")} …`);
  const resultado = await restaurarRespaldo(cliente, ruta, { log: (mensaje) => console.log(mensaje) });
  console.log(`Listo: ${resultado.filas} filas restauradas en ${resultado.manifiesto.tablas.length} tablas.`);
} catch (error) {
  console.error(`\nLa restauración falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
