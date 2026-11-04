import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import pg from "pg";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = join(raiz, "db", "migrations");
const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const tls = /sslmode=require|neon\.tech|render\.com|railway/.test(url);
const locales = readdirSync(carpeta)
  .filter((n) => n.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: tls ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

try {
  const { rows } = await client.query(
    "select nombre, aplicada_en from public.migraciones_aplicadas order by nombre",
  );
  const aplicadas = new Map(rows.map((r) => [r.nombre, r.aplicada_en]));

  console.log(`Neon registra ${rows.length}; repo tiene ${locales.length}.\n`);

  const faltanEnRepo = rows
    .map((r) => r.nombre)
    .filter((n) => !locales.includes(n));
  const faltanEnBase = locales.filter((n) => !aplicadas.has(n));

  for (const n of locales) {
    const marca = aplicadas.has(n) ? "ok  " : "SIN APLICAR";
    console.log(`  ${marca}  ${n}`);
  }
  if (faltanEnBase.length) {
    console.log(`\nEn repo pero NO aplicadas en Neon: ${faltanEnBase.join(", ")}`);
  }
  if (faltanEnRepo.length) {
    console.log(`\nEn Neon pero NO existen en db/migrations: ${faltanEnRepo.join(", ")}`);
  } else {
    console.log("\nNinguna migracion existe en Neon sin archivo en el repo.");
  }

  const tablas = await client.query(`
    select table_name from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  console.log(`\ntablas public (${tablas.rows.length}): ${tablas.rows.map((r) => r.table_name).join(", ")}`);

  const funciones = await client.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' order by p.proname
  `);
  console.log(`\nfunciones public (${funciones.rows.length}):\n  ${funciones.rows.map((r) => r.proname).join("\n  ")}`);
} finally {
  await client.end();
}
