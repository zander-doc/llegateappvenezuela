// Respaldo y restauración contra un PostgreSQL real efímero: se crea una base
// con datos, se respalda, se restaura en otra base vacía y se comparan filas,
// tipos y secuencias. Sin red ni servicios externos.
import "./setup.mjs";
import assert from "node:assert/strict";
import { copyFile, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { after, before } from "node:test";
import {
  aplicarMigraciones,
  iniciarPostgres,
  listarMigraciones,
  root,
} from "../../scripts/embedded-postgres.mjs";
import {
  crearRespaldo,
  limpiarRespaldos,
  restaurarRespaldo,
  verificarRespaldo,
} from "../src/backup.js";

const PUERTO = 55436;
const DIR_DATOS = join(root, ".pg-data-backup");
const DIR_RESPALDOS = join(root, ".backups-test");
const ORIGEN = "llegate_respaldo_origen";
const DESTINO = "llegate_respaldo_destino";
const USUARIO = "11111111-1111-1111-1111-111111111111";

let pg;
let clienteOrigen;
let clienteDestino;
let archivo;

async function filas(cliente, consulta, parametros = []) {
  return (await cliente.query(consulta, parametros)).rows;
}

// Igual que scripts/migrate.mjs: la tabla de control no viene en los .sql.
async function registrarMigraciones(cliente, migraciones) {
  await cliente.query(
    `create table if not exists public.migraciones_aplicadas (
       nombre text primary key,
       aplicada_en timestamptz not null default now()
     )`,
  );
  for (const nombre of migraciones) {
    await cliente.query(
      "insert into public.migraciones_aplicadas (nombre) values ($1) on conflict do nothing",
      [nombre],
    );
  }
}

before(async () => {
  ({ pg } = await iniciarPostgres({ puerto: PUERTO, base: ORIGEN, datos: DIR_DATOS }));

  const admin = pg.getPgClient("postgres", "localhost");
  await admin.connect();
  try {
    await admin.query(`create database ${DESTINO} encoding 'UTF8' template template0`);
  } finally {
    await admin.end();
  }

  clienteOrigen = pg.getPgClient(ORIGEN);
  clienteDestino = pg.getPgClient(DESTINO);
  await clienteOrigen.connect();
  await clienteDestino.connect();

  const migraciones = listarMigraciones();
  await aplicarMigraciones(clienteOrigen, migraciones);
  await aplicarMigraciones(clienteDestino, migraciones);
  await registrarMigraciones(clienteOrigen, migraciones);
  await registrarMigraciones(clienteDestino, migraciones);

  await clienteOrigen.query(
    `insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data)
     values ($1, '+584141111111', now(), '{"nombre":"Ana Pérez"}')`,
    [USUARIO],
  );
  await clienteOrigen.query(
    `insert into public.conductores_detalles
       (usuario_id, cedula, tipo_vehiculo, placa, cedula_url, licencia_url, certificado_medico_url)
     values ($1, 'V12345678', 'moto', 'AB123CD', 'cedula.pdf', 'licencia.pdf', 'medico.pdf')`,
    [USUARIO],
  );
  await clienteOrigen.query(
    `insert into public.viajes (id, cliente_id, origen, destino, precio_usd, metodo_pago)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', $1, 'Catia La Mar', 'Maiquetía', 3.50, 'efectivo')`,
    [USUARIO],
  );
  await clienteOrigen.query(
    `insert into public.transacciones_billetera (id, usuario_id, tipo, estado, monto_usd, nota)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', $1, 'ajuste', 'aprobada', 5, 'ajuste de prueba')`,
    [USUARIO],
  );
  await clienteOrigen.query(
    `insert into public.eventos_seguridad (usuario_id, tipo, detalle)
     values ($1, 'prueba_respaldo', '{"a":1,"b":[2,3]}')`,
    [USUARIO],
  );
  await clienteOrigen.query(
    `insert into storage.objects (bucket_id, name, owner)
     values ('documentos-conductores', $1, $2)`,
    [`${USUARIO}/cedula.pdf`, USUARIO],
  );

  await mkdir(DIR_RESPALDOS, { recursive: true });
  archivo = join(DIR_RESPALDOS, "llegate-20261101T030000Z.jsonl.gz");
});

after(async () => {
  if (clienteOrigen) await clienteOrigen.end().catch(() => {});
  if (clienteDestino) await clienteDestino.end().catch(() => {});
  if (pg) await pg.stop().catch(() => {});
  await rm(DIR_DATOS, { recursive: true, force: true });
  await rm(DIR_RESPALDOS, { recursive: true, force: true });
});

test("el respaldo guarda datos, migraciones y conteos verificables", async () => {
  const { manifiesto, sha256 } = await crearRespaldo(clienteOrigen, archivo);

  assert.equal(manifiesto.version, 1);
  assert.equal(manifiesto.base, ORIGEN);
  assert.equal(manifiesto.migraciones.length, listarMigraciones().length);
  assert.match(sha256, /^[0-9a-f]{64}$/);

  const conteos = Object.fromEntries(manifiesto.tablas.map((tabla) => [tabla.nombre, tabla.filas]));
  assert.equal(conteos["auth.users"], 1);
  assert.equal(conteos["public.usuarios"], 1);
  assert.equal(conteos["public.conductores_detalles"], 1);
  assert.equal(conteos["public.viajes"], 1);
  assert.equal(conteos["public.transacciones_billetera"], 1);
  assert.equal(conteos["public.eventos_seguridad"], 1);
  assert.equal(conteos["storage.objects"], 1);
  assert.ok(!("public.migraciones_aplicadas" in conteos));

  const revision = await verificarRespaldo(archivo);
  assert.equal(revision.sha256, sha256);
  assert.deepEqual(
    revision.manifiesto.tablas.map((tabla) => tabla.nombre),
    manifiesto.tablas.map((tabla) => tabla.nombre),
  );
});

test("un archivo alterado no pasa la verificación", async () => {
  const copia = join(DIR_RESPALDOS, "alterado.jsonl.gz");
  await copyFile(archivo, copia);
  await writeFile(`${copia}.sha256`, `${"0".repeat(64)}  alterado.jsonl.gz\n`);
  await assert.rejects(() => verificarRespaldo(copia), /checksum/);
});

test("la restauración devuelve los mismos datos y respeta los tipos", async () => {
  const resultado = await restaurarRespaldo(clienteDestino, archivo);

  assert.equal(resultado.filas, resultado.manifiesto.tablas.reduce((t, tabla) => t + tabla.filas, 0));

  const [usuario] = await filas(
    clienteDestino,
    "select nombre, telefono, telefono_verificado, rol from public.usuarios where id = $1",
    [USUARIO],
  );
  assert.deepEqual(usuario, {
    nombre: "Ana Pérez",
    telefono: "+584141111111",
    telefono_verificado: true,
    rol: "cliente",
  });

  const [viaje] = await filas(
    clienteDestino,
    "select origen, precio_usd, metodo_pago from public.viajes where id = $1",
    ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
  );
  assert.equal(viaje.origen, "Catia La Mar");
  assert.equal(viaje.precio_usd, "3.50");
  assert.equal(viaje.metodo_pago, "efectivo");

  const [ajuste] = await filas(
    clienteDestino,
    "select monto_usd, estado from public.transacciones_billetera where id = $1",
    ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
  );
  assert.equal(ajuste.monto_usd, "5.00");
  assert.equal(ajuste.estado, "aprobada");

  const [evento] = await filas(
    clienteDestino,
    "select id, detalle from public.eventos_seguridad order by id limit 1",
  );
  assert.equal(evento.id, "1");
  assert.deepEqual(evento.detalle, { a: 1, b: [2, 3] });

  const [documento] = await filas(clienteDestino, "select name, owner from storage.objects");
  assert.equal(documento.name, `${USUARIO}/cedula.pdf`);
  assert.equal(documento.owner, USUARIO);
});

test("la secuencia de identidad sigue después del máximo restaurado", async () => {
  const [nuevo] = await filas(
    clienteDestino,
    "insert into public.eventos_seguridad (tipo) values ('despues_de_restaurar') returning id",
  );
  assert.equal(nuevo.id, "2");
});

test("restaurar dos veces deja el mismo estado", async () => {
  await restaurarRespaldo(clienteDestino, archivo);

  const [eventos] = await filas(
    clienteDestino,
    "select count(*)::int as n, max(id)::text as ultimo from public.eventos_seguridad",
  );
  assert.equal(eventos.n, 1);
  assert.equal(eventos.ultimo, "1");

  const [usuarios] = await filas(
    clienteDestino,
    "select count(*)::int as n from public.usuarios",
  );
  assert.equal(usuarios.n, 1);

  const [siguiente] = await filas(
    clienteDestino,
    "insert into public.eventos_seguridad (tipo) values ('otra_vez') returning id",
  );
  assert.equal(siguiente.id, "2");
});

test("la retención borra los viejos y conserva el más reciente", async () => {
  const viejo = join(DIR_RESPALDOS, "llegate-20200101T000000Z.jsonl.gz");
  await writeFile(viejo, "respaldo viejo");
  await writeFile(`${viejo}.sha256`, "x");
  const hace = new Date(Date.now() - 30 * 86_400_000);
  await utimes(viejo, hace, hace);
  await utimes(`${viejo}.sha256`, hace, hace);

  const borrados = await limpiarRespaldos(DIR_RESPALDOS, 14);
  assert.deepEqual(borrados, ["llegate-20200101T000000Z.jsonl.gz"]);
  await assert.rejects(() => verificarRespaldo(viejo));
  assert.equal((await verificarRespaldo(archivo)).ok, true);
});
