// Levanta un PostgreSQL real sin Docker ni credenciales. Lo usan la suite SQL
// y las pruebas de integración del API.
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function listarMigraciones() {
  return readdirSync(join(root, "db", "migrations"))
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort();
}

export async function iniciarPostgres({
  puerto = 55432,
  base = "llegate_test",
  datos = join(root, ".pg-data"),
} = {}) {
  const pg = new EmbeddedPostgres({
    databaseDir: datos,
    user: "postgres",
    password: "postgres",
    port: puerto,
    persistent: false,
    autoRehydrateSymlinks: true,
  });

  // Un cierre interrumpido deja archivos y initdb se niega a reutilizarlos.
  rmSync(datos, { recursive: true, force: true });
  await pg.initialise();
  await pg.start();

  // Windows inicializa el clúster en WIN1252; el esquema usa acentos y flechas.
  const admin = pg.getPgClient("postgres", "localhost");
  await admin.connect();
  try {
    await admin.query(`create database ${base} encoding 'UTF8' template template0`);
  } finally {
    await admin.end();
  }

  const conexion = `postgres://postgres:postgres@localhost:${puerto}/${base}`;
  return { pg, conexion, base, puerto };
}

export async function aplicarMigraciones(client, migraciones = listarMigraciones()) {
  for (const nombre of migraciones) {
    const sql = readFileSync(join(root, "db", "migrations", nombre), "utf8");
    await client.query(sql);
  }
}

// Los archivos de prueba empiezan con `\set ON_ERROR_STOP on`, que es de psql.
export function leerSql(ruta) {
  return readFileSync(ruta, "utf8")
    .split("\n")
    .filter((linea) => !linea.trimStart().startsWith("\\"))
    .join("\n");
}
