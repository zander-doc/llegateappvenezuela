#!/usr/bin/env node
// Prueba las migraciones contra un PostgreSQL 15 local con stubs de Supabase.
// Requiere un contenedor en ejecución:
//   docker run --name llegate-pg -e POSTGRES_HOST_AUTH_METHOD=trust \
//     -p 55432:5432 -d postgres:15-alpine
//
// Variables opcionales:
//   LLEGATE_PG_CONTAINER  nombre del contenedor (por defecto llegate-pg)
//   LLEGATE_TEST_DB       base de datos de prueba (por defecto llegate_test)

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const container = process.env.LLEGATE_PG_CONTAINER ?? "llegate-pg";
const database = process.env.LLEGATE_TEST_DB ?? "llegate_test";

if (!/^[a-z_][a-z0-9_]*$/.test(database)) {
  console.error(`Nombre de base de datos inválido: ${database}`);
  process.exit(1);
}

function docker(args, { input, quiet = false } = {}) {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      console.error("No se encontró Docker. Instálalo o ejecuta las pruebas con otro PostgreSQL 15.");
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return quiet ? "" : result.stdout;
}

function psql(sql, { quiet = true, db = database } = {}) {
  return docker(["exec", "-i", container, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-q"], {
    input: sql,
    quiet,
  });
}

function psqlFile(path) {
  return psql(readFileSync(path, "utf8"));
}

const inspect = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", container], {
  encoding: "utf8",
});
const containerReady = inspect.status === 0 && inspect.stdout.trim() === "true";

if (!containerReady) {
  if (inspect.error?.code === "ENOENT") {
    console.error("No se encontró Docker. Instálalo o ejecuta las pruebas con otro PostgreSQL 15.");
  } else if (inspect.status !== 0) {
    console.error(`No existe el contenedor ${container}.`);
  } else {
    console.error(`El contenedor ${container} no está en ejecución.`);
  }
  console.error(
    `\nInicia PostgreSQL así:\n  docker run --name ${container} -e POSTGRES_HOST_AUTH_METHOD=trust -p 55432:5432 -d postgres:15-alpine`
  );
  process.exit(1);
}

console.log(`Creando ${database} en ${container}…`);
psql(`drop database if exists ${database} with (force);`, { db: "postgres" });
docker([
  "exec",
  container,
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-q",
  "-c",
  `create database ${database};`,
]);

const migrationsDir = join(root, "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

console.log(`Aplicando stubs y ${migrations.length} migraciones…`);
psqlFile(join(root, "supabase", "tests", "00_supabase_stubs.sql"));
for (const migration of migrations) {
  psqlFile(join(migrationsDir, migration));
}

console.log("Ejecutando pruebas SQL…\n");
for (const testFile of ["10_billetera.sql", "20_prepago.sql", "30_identidad.sql"]) {
  const output = psql(readFileSync(join(root, "supabase", "tests", testFile), "utf8"), {
    quiet: false,
  });
  process.stdout.write(output);
}

console.log(
  `\nBase de prueba ${database} lista para inspeccionar (docker exec -it ${container} psql -U postgres -d ${database}).`
);
