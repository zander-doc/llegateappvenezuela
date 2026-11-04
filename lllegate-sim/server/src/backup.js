import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";

// Respaldo lógico sin pg_dump: el esquema (tablas, funciones, políticas, roles)
// se reconstruye siempre desde db/migrations, y el archivo guarda solo los
// datos. Así el respaldo se puede tomar y restaurar con Node, en cualquier
// máquina, sin instalar herramientas de PostgreSQL.
//
// Formato: un JSONL comprimido con gzip. La primera línea es el manifiesto
// (versión, migraciones aplicadas, tablas, columnas y conteos); las siguientes
// son lotes de filas agrupadas por tabla, en orden de dependencias.

const ESQUEMAS = ["public", "auth", "storage"];
// El registro de migraciones es parte del esquema, no del contenido.
const EXCLUIR = new Set(["public.migraciones_aplicadas"]);
const VERSION = 1;
const FILAS_POR_PAGINA = 2000;
const FILAS_POR_LOTE = 500;
const MAXIMO_PARAMETROS = 60000;

function cita(nombre) {
  return `"${String(nombre).replaceAll('"', '""')}"`;
}

function completa(esquema, nombre) {
  return `${esquema}.${nombre}`;
}

async function hashArchivo(archivo) {
  const hash = createHash("sha256");
  await pipeline(
    createReadStream(archivo),
    new Transform({
      transform(trozo, _codificacion, siguiente) {
        hash.update(trozo);
        siguiente();
      },
    }),
  );
  return hash.digest("hex");
}

export async function listarTablas(client) {
  const { rows } = await client.query(
    `select c.table_schema as esquema,
            c.table_name as nombre,
            json_agg(
              json_build_object(
                'nombre', c.column_name,
                'tipo', c.udt_name,
                'generada', c.is_generated,
                'identidad', c.identity_generation
              )
              order by c.ordinal_position
            ) as columnas
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = any($1::text[]) and t.table_type = 'BASE TABLE'
      group by c.table_schema, c.table_name
      order by 1, 2`,
    [ESQUEMAS],
  );

  return rows
    .filter((tabla) => !EXCLUIR.has(completa(tabla.esquema, tabla.nombre)))
    .map((tabla) => ({
      ...tabla,
      columnas: tabla.columnas.filter((columna) => columna.generada !== "ALWAYS"),
    }));
}

// Orden topológico por claves foráneas: las tablas padre se restauran antes
// que las hijas, así no hace falta desactivar restricciones del sistema.
export async function ordenarPorDependencias(client, tablas) {
  const { rows } = await client.query(`
    select n1.nspname || '.' || c1.relname as desde,
           n2.nspname || '.' || c2.relname as hacia
      from pg_constraint con
      join pg_class c1 on c1.oid = con.conrelid
      join pg_namespace n1 on n1.oid = c1.relnamespace
      join pg_class c2 on c2.oid = con.confrelid
      join pg_namespace n2 on n2.oid = c2.relnamespace
     where con.contype = 'f'
  `);

  const nombres = tablas.map((tabla) => completa(tabla.esquema, tabla.nombre));
  const dependencias = new Map(nombres.map((nombre) => [nombre, new Set()]));
  for (const fila of rows) {
    if (fila.desde === fila.hacia) continue;
    dependencias.get(fila.desde)?.add(fila.hacia);
  }

  const orden = [];
  const listas = new Set();
  while (orden.length < nombres.length) {
    const siguiente = nombres.find(
      (nombre) =>
        !listas.has(nombre) &&
        [...(dependencias.get(nombre) ?? [])].every((padre) => listas.has(padre)),
    );
    if (!siguiente) {
      // Un ciclo entre claves foráneas no se puede ordenar; el resto se
      // restaura igual porque las filas referenciadas ya existen o son nulas.
      orden.push(...nombres.filter((nombre) => !listas.has(nombre)).sort());
      break;
    }
    orden.push(siguiente);
    listas.add(siguiente);
  }

  const porNombre = new Map(tablas.map((tabla) => [completa(tabla.esquema, tabla.nombre), tabla]));
  return orden.map((nombre) => porNombre.get(nombre));
}

export async function crearRespaldo(client, destino) {
  await mkdir(dirname(destino), { recursive: true });
  // Una sola instantánea para conteos y filas: el respaldo es consistente
  // aunque el API esté operando mientras corre.
  await client.query("begin isolation level repeatable read read only");

  try {
    const tablas = await ordenarPorDependencias(client, await listarTablas(client));
    const {
      rows: [info],
    } = await client.query(
      "select current_database() as base, current_setting('server_version') as version",
    );
    // Una base migrada con psql a mano puede no tener el registro del runner;
    // en ese caso el respaldo queda sin lista de migraciones y la restauración
    // solo comprueba que las tablas existan.
    const migraciones = (await client.query("select to_regclass('public.migraciones_aplicadas') as tabla"))
      .rows[0].tabla
      ? (
          await client.query("select nombre from public.migraciones_aplicadas order by nombre")
        ).rows.map((fila) => fila.nombre)
      : [];

    const manifiesto = {
      tipo: "manifiesto",
      version: VERSION,
      creado: new Date().toISOString(),
      base: info.base,
      version_pg: info.version,
      migraciones,
      tablas: [],
    };

    for (const tabla of tablas) {
      const { rows } = await client.query(
        `select count(*)::int as filas from ${cita(tabla.esquema)}.${cita(tabla.nombre)}`,
      );
      manifiesto.tablas.push({
        nombre: completa(tabla.esquema, tabla.nombre),
        columnas: tabla.columnas.map((columna) => ({
          nombre: columna.nombre,
          json: columna.tipo === "json" || columna.tipo === "jsonb",
        })),
        identidad: tabla.columnas.find((columna) => columna.identidad)?.nombre ?? null,
        filas: rows[0].filas,
      });
    }

    const lineas = async function* () {
      yield `${JSON.stringify(manifiesto)}\n`;

      for (const tabla of tablas) {
        const columnas = tabla.columnas.map((columna) => columna.nombre);
        const destinoSql = `${cita(tabla.esquema)}.${cita(tabla.nombre)}`;
        let cursor = "(0,0)";

        for (;;) {
          const { rows } = await client.query(
            `select ctid::text as ctid, row_to_json(fila) as datos
               from ${destinoSql} fila
              where ctid > $1::tid
              order by ctid
              limit $2`,
            [cursor, FILAS_POR_PAGINA],
          );
          if (rows.length === 0) break;

          cursor = rows[rows.length - 1].ctid;
          for (let inicio = 0; inicio < rows.length; inicio += FILAS_POR_LOTE) {
            const filas = rows
              .slice(inicio, inicio + FILAS_POR_LOTE)
              .map((fila) => columnas.map((columna) => fila.datos[columna] ?? null));
            yield `${JSON.stringify({
              tipo: "filas",
              tabla: completa(tabla.esquema, tabla.nombre),
              filas,
            })}\n`;
          }

          if (rows.length < FILAS_POR_PAGINA) break;
        }
      }
    };

    const hash = createHash("sha256");
    const firmante = new Transform({
      transform(trozo, _codificacion, siguiente) {
        hash.update(trozo);
        siguiente(null, trozo);
      },
    });

    await pipeline(
      Readable.from(lineas()),
      createGzip({ level: 9 }),
      firmante,
      createWriteStream(destino, { flags: "wx" }),
    );

    const sha256 = hash.digest("hex");
    await writeFile(`${destino}.sha256`, `${sha256}  ${basename(destino)}\n`);
    await client.query("commit");

    return { archivo: destino, sha256, manifiesto };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    await rm(destino, { force: true }).catch(() => {});
    await rm(`${destino}.sha256`, { force: true }).catch(() => {});
    throw error;
  }
}

async function abrirLineas(archivo) {
  return createInterface({
    input: createReadStream(archivo).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
}

export async function leerManifiesto(archivo) {
  const lineas = await abrirLineas(archivo);
  try {
    for await (const linea of lineas) {
      if (!linea.trim()) continue;
      const dato = JSON.parse(linea);
      if (dato.tipo !== "manifiesto") throw new Error("El respaldo no empieza con el manifiesto");
      return dato;
    }
  } finally {
    lineas.close();
  }
  throw new Error("El respaldo está vacío");
}

// Relee el archivo completo: valida el SHA-256 y que cada tabla traiga las
// filas anunciadas. Un respaldo que no pasa esto no sirve para recuperar nada.
export async function verificarRespaldo(archivo) {
  const sha256 = await hashArchivo(archivo);
  let esperado = null;
  try {
    esperado = (await readFile(`${archivo}.sha256`, "utf8")).trim().split(/\s+/)[0];
  } catch {
    esperado = null;
  }
  if (esperado && esperado !== sha256) {
    throw new Error(
      `El archivo no coincide con su checksum (${sha256.slice(0, 12)}… ≠ ${esperado.slice(0, 12)}…)`,
    );
  }

  const lineas = await abrirLineas(archivo);
  let manifiesto = null;
  const conteos = new Map();
  try {
    for await (const linea of lineas) {
      if (!linea.trim()) continue;
      const dato = JSON.parse(linea);
      if (dato.tipo === "manifiesto") {
        manifiesto = dato;
        continue;
      }
      if (!manifiesto) throw new Error("El respaldo no empieza con el manifiesto");
      if (dato.tipo !== "filas") throw new Error(`Tipo de línea desconocido: ${dato.tipo}`);
      conteos.set(dato.tabla, (conteos.get(dato.tabla) ?? 0) + dato.filas.length);
    }
  } finally {
    lineas.close();
  }

  if (!manifiesto) throw new Error("El respaldo está vacío");
  for (const tabla of manifiesto.tablas) {
    const reales = conteos.get(tabla.nombre) ?? 0;
    if (reales !== tabla.filas) {
      throw new Error(`Filas incompletas en ${tabla.nombre}: ${reales} de ${tabla.filas}`);
    }
  }

  return { ok: true, sha256, manifiesto };
}

export async function restaurarRespaldo(client, archivo, { log = () => {} } = {}) {
  const manifiesto = await leerManifiesto(archivo);
  if (manifiesto.version !== VERSION) {
    throw new Error(`Versión de respaldo no soportada: ${manifiesto.version}`);
  }

  const { rows: existentes } = await client.query(
    `select table_schema as esquema, table_name as nombre
       from information_schema.tables
      where table_schema = any($1::text[]) and table_type = 'BASE TABLE'`,
    [ESQUEMAS],
  );
  const disponibles = new Set(existentes.map((fila) => completa(fila.esquema, fila.nombre)));
  for (const tabla of manifiesto.tablas) {
    if (!disponibles.has(tabla.nombre)) {
      throw new Error(
        `La base destino no tiene ${tabla.nombre}. Aplica las migraciones primero (npm run db:migrate).`,
      );
    }
  }

  const aplicadas = (await client.query("select to_regclass('public.migraciones_aplicadas') as tabla"))
    .rows[0].tabla
    ? new Set(
        (await client.query("select nombre from public.migraciones_aplicadas")).rows.map(
          (fila) => fila.nombre,
        ),
      )
    : null;

  if (aplicadas && manifiesto.migraciones.length > 0) {
    const faltantes = manifiesto.migraciones.filter((nombre) => !aplicadas.has(nombre));
    if (faltantes.length > 0) {
      throw new Error(
        `La base destino no tiene las migraciones de este respaldo: ${faltantes.join(", ")}`,
      );
    }
    const sobrantes = [...aplicadas].filter((nombre) => !manifiesto.migraciones.includes(nombre));
    if (sobrantes.length > 0) {
      log(
        `Aviso: la base destino tiene migraciones posteriores al respaldo: ${sobrantes.join(", ")}`,
      );
    }
  }

  const informacion = new Map(manifiesto.tablas.map((tabla) => [tabla.nombre, tabla]));
  const lista = manifiesto.tablas.map((tabla) => tabla.nombre);

  const insertar = async (nombre, filas) => {
    if (filas.length === 0) return;
    const tabla = informacion.get(nombre);
    const [esquema, simple] = nombre.split(".");
    const columnas = tabla.columnas.map((columna) => cita(columna.nombre)).join(", ");
    const porFila = tabla.columnas.length;
    const limite = Math.max(1, Math.min(FILAS_POR_LOTE, Math.floor(MAXIMO_PARAMETROS / porFila)));
    const anulacion = tabla.identidad ? " overriding system value" : "";

    for (let inicio = 0; inicio < filas.length; inicio += limite) {
      const grupo = filas.slice(inicio, inicio + limite);
      const marcas = grupo
        .map(
          (_, indiceFila) =>
            `(${tabla.columnas
              .map((_, indiceColumna) => `$${indiceFila * porFila + indiceColumna + 1}`)
              .join(", ")})`,
        )
        .join(", ");
      const valores = [];
      for (const fila of grupo) {
        tabla.columnas.forEach((columna, indice) => {
          const valor = fila[indice] ?? null;
          valores.push(columna.json && valor !== null ? JSON.stringify(valor) : valor);
        });
      }

      await client.query(
        `insert into ${cita(esquema)}.${cita(simple)} (${columnas})${anulacion} values ${marcas}`,
        valores,
      );
    }
  };

  await client.query("begin");
  try {
    await client.query(
      `truncate ${lista
        .map((nombre) => {
          const [esquema, simple] = nombre.split(".");
          return `${cita(esquema)}.${cita(simple)}`;
        })
        .join(", ")} restart identity cascade`,
    );

    for (const nombre of lista) {
      const [esquema, simple] = nombre.split(".");
      await client.query(`alter table ${cita(esquema)}.${cita(simple)} disable trigger user`);
    }

    const lineas = await abrirLineas(archivo);
    try {
      for await (const linea of lineas) {
        if (!linea.trim()) continue;
        const dato = JSON.parse(linea);
        if (dato.tipo === "manifiesto") continue;
        if (dato.tipo !== "filas" || !informacion.has(dato.tabla)) {
          throw new Error(`Línea inválida en el respaldo: ${dato.tabla ?? dato.tipo}`);
        }
        await insertar(dato.tabla, dato.filas);
      }
    } finally {
      lineas.close();
    }

    for (const tabla of manifiesto.tablas) {
      if (!tabla.identidad) continue;
      const [esquema, simple] = tabla.nombre.split(".");
      const columna = cita(tabla.identidad);
      await client.query(
        `select setval(
           pg_get_serial_sequence($1, $2),
           coalesce((select max(${columna}) from ${cita(esquema)}.${cita(simple)}), 1),
           (select max(${columna}) is not null from ${cita(esquema)}.${cita(simple)})
         )`,
        [tabla.nombre, tabla.identidad],
      );
    }

    for (const tabla of manifiesto.tablas) {
      const [esquema, simple] = tabla.nombre.split(".");
      const { rows } = await client.query(
        `select count(*)::int as filas from ${cita(esquema)}.${cita(simple)}`,
      );
      if (rows[0].filas !== tabla.filas) {
        throw new Error(
          `Se esperaban ${tabla.filas} filas en ${tabla.nombre} y quedaron ${rows[0].filas}`,
        );
      }
    }

    for (const nombre of lista) {
      const [esquema, simple] = nombre.split(".");
      await client.query(`alter table ${cita(esquema)}.${cita(simple)} enable trigger user`);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }

  const filas = manifiesto.tablas.reduce((total, tabla) => total + tabla.filas, 0);
  return { manifiesto, filas };
}

// Conserva siempre el respaldo más reciente, aunque supere la antigüedad.
export async function limpiarRespaldos(directorio, dias) {
  const limite = Date.now() - dias * 86_400_000;
  const nombres = await readdir(directorio).catch(() => []);
  const archivos = [];

  for (const nombre of nombres) {
    if (!nombre.endsWith(".jsonl.gz")) continue;
    const ruta = join(directorio, nombre);
    const info = await stat(ruta).catch(() => null);
    if (info) archivos.push({ ruta, modificado: info.mtimeMs });
  }

  archivos.sort((a, b) => b.modificado - a.modificado);
  const borrados = [];
  for (const archivo of archivos.slice(1)) {
    if (archivo.modificado >= limite) continue;
    await rm(archivo.ruta, { force: true });
    await rm(`${archivo.ruta}.sha256`, { force: true });
    borrados.push(basename(archivo.ruta));
  }
  return borrados;
}
