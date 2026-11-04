#!/usr/bin/env node
// Respaldo diario de la base. Guarda un JSONL comprimido con los datos y el
// manifiesto (migraciones aplicadas, tablas y conteos), verifica el checksum y
// conserva solo los últimos RESPALDOS_DIAS. Con RESPALDOS_R2=1 también lo sube
// a Cloudflare R2.
//
// Uso:
//   npm run db:backup
//   npm run db:backup -- --sin-subir

import { readFile, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { AwsClient } from "aws4fetch";
import pg from "pg";
import { crearRespaldo, limpiarRespaldos, verificarRespaldo } from "../src/backup.js";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error("Falta DATABASE_URL. Completa server/.env o pásala en el entorno.");
  process.exit(1);
}

function bandera(valor, porDefecto = false) {
  const texto = valor?.trim().toLowerCase();
  if (!texto) return porDefecto;
  return ["1", "true", "si", "sí", "yes"].includes(texto);
}

function tamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const tls = process.env.DATABASE_SSL
  ? bandera(process.env.DATABASE_SSL)
  : /sslmode=require|neon\.tech|render\.com|railway/.test(url);

const directorio = resolve(raiz, process.env.RESPALDOS_DIR?.trim() || "backups");
const dias = Number(process.env.RESPALDOS_DIAS ?? 14) || 14;
const subir = bandera(process.env.RESPALDOS_R2) && !process.argv.includes("--sin-subir");

function marcaDeTiempo(fecha = new Date()) {
  return fecha.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

async function subirAR2(archivos) {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (!accessKeyId || !secretAccessKey || !(endpoint || accountId)) {
    throw new Error(
      "RESPALDOS_R2=1 pero faltan R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.",
    );
  }

  const bucket = process.env.RESPALDOS_BUCKET?.trim() || process.env.STORAGE_BUCKET?.trim() || "documentos-conductores";
  const prefijo = (process.env.RESPALDOS_PREFIJO?.trim() || "respaldos").replace(/^\/+|\/+$/g, "");
  const base = (endpoint || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/$/, "");
  const cliente = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

  const subidos = [];
  for (const archivo of archivos) {
    const nombre = basename(archivo);
    const destino = `${base}/${bucket}/${prefijo}/${encodeURIComponent(nombre)}`;
    const cuerpo = await readFile(archivo);
    const peticion = await cliente.sign(destino, {
      method: "PUT",
      body: cuerpo,
      headers: {
        "content-type": archivo.endsWith(".sha256") ? "text/plain" : "application/gzip",
      },
    });
    const respuesta = await fetch(peticion);
    if (!respuesta.ok) {
      throw new Error(`R2 respondió ${respuesta.status} al subir ${nombre}`);
    }
    subidos.push(`${prefijo}/${nombre}`);
  }
  return subidos;
}

const cliente = new pg.Client({
  connectionString: url,
  ssl: tls ? { rejectUnauthorized: false } : undefined,
});

await cliente.connect();

try {
  const archivo = resolve(directorio, `llegate-${marcaDeTiempo()}.jsonl.gz`);
  console.log(`Respaldando ${url.replace(/\/\/[^@]+@/, "//****@")} …`);

  const { manifiesto, sha256 } = await crearRespaldo(cliente, archivo);
  const revision = await verificarRespaldo(archivo);

  const filas = manifiesto.tablas.reduce((total, tabla) => total + tabla.filas, 0);
  const { size } = await stat(archivo);
  console.log(`Respaldo: ${archivo} (${tamano(size)})`);
  console.log(`Verificado: checksum ${sha256.slice(0, 16)}…, ${filas} filas en ${manifiesto.tablas.length} tablas.`);
  if (revision.manifiesto.tablas.length !== manifiesto.tablas.length) {
    throw new Error("El respaldo verificado no coincide con lo recién escrito");
  }

  if (subir) {
    const claves = await subirAR2([archivo, `${archivo}.sha256`]);
    console.log(`Subido a R2: ${claves.join(", ")}`);
  } else {
    console.log("R2 desactivado: el respaldo quedó solo en disco.");
  }

  const borrados = await limpiarRespaldos(directorio, dias);
  console.log(
    borrados.length > 0
      ? `Eliminados por antigüedad (más de ${dias} días): ${borrados.join(", ")}`
      : `Sin respaldos que borrar (retención: ${dias} días).`,
  );
} catch (error) {
  console.error(`\nEl respaldo falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
