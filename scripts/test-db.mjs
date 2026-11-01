#!/usr/bin/env node
// Aplica las migraciones sobre un PostgreSQL real embebido y ejecuta la suite
// SQL. No requiere Docker ni credenciales.
//
// Variables opcionales:
//   LLEGATE_TEST_PORT  puerto del clúster efímero (por defecto 55432)

import { join } from "node:path";
import {
  aplicarMigraciones,
  iniciarPostgres,
  leerSql,
  listarMigraciones,
  root,
} from "./embedded-postgres.mjs";

const puerto = Number(process.env.LLEGATE_TEST_PORT ?? 55432);
const base = "llegate_test";

const pruebas = [
  "10_billetera.sql",
  "20_prepago.sql",
  "30_identidad.sql",
  "40_pagos.sql",
  "50_verificacion.sql",
];

const { pg } = await iniciarPostgres({ puerto, base });
const client = pg.getPgClient(base);
await client.connect();

try {
  const migraciones = listarMigraciones();
  console.log(`Aplicando ${migraciones.length} migraciones…`);
  await aplicarMigraciones(client, migraciones);

  console.log("Ejecutando pruebas SQL…\n");
  for (const archivo of pruebas) {
    // Cada archivo usaba su propia sesión de psql; ahora comparten conexión.
    await client.query("drop table if exists _ctx");
    await client.query(leerSql(join(root, "db", "tests", archivo)));
    console.log(`  ok  ${archivo}`);
  }

  console.log("\nSuite SQL completa.");
} finally {
  await client.end().catch(() => {});
  await pg.stop();
}
