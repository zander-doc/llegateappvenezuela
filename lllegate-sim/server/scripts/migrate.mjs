#!/usr/bin/env node
// Aplica db/migrations en orden sobre la base de DATABASE_URL y registra cada
// archivo en public.migraciones_aplicadas. Se puede repetir: lo ya aplicado se
// salta. Pensado para Neon y cualquier PostgreSQL 15+.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import pg from "pg";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const carpeta = join(raiz, "db", "migrations");
const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error("Falta DATABASE_URL. Completa server/.env o pásala en el entorno.");
  process.exit(1);
}

const tls = process.env.DATABASE_SSL
  ? ["1", "true", "si", "sí", "yes"].includes(process.env.DATABASE_SSL.toLowerCase())
  : /sslmode=require|neon\.tech|render\.com|railway/.test(url);

const migraciones = readdirSync(carpeta)
  .filter((nombre) => nombre.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: tls ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

try {
  await client.query(`
    create table if not exists public.migraciones_aplicadas (
      nombre text primary key,
      aplicada_en timestamptz not null default now()
    )
  `);

  for (const nombre of migraciones) {
    const { rowCount } = await client.query(
      "select 1 from public.migraciones_aplicadas where nombre = $1",
      [nombre],
    );
    if (rowCount > 0) {
      console.log(`  ya aplicada  ${nombre}`);
      continue;
    }

    process.stdout.write(`  aplicando    ${nombre}… `);
    await client.query("begin");
    try {
      await client.query(readFileSync(join(carpeta, nombre), "utf8"));
      await client.query(
        "insert into public.migraciones_aplicadas (nombre) values ($1)",
        [nombre],
      );
      await client.query("commit");
      console.log("ok");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log("\nMigraciones al día.");
} finally {
  await client.end();
}
