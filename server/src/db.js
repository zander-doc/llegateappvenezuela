import pg from "pg";
import { config } from "./config.js";

// node-postgres devuelve NUMERIC como texto para no perder precisión. La API
// expone montos en dólares con dos decimales, así que se entregan como número
// en el JSON.
pg.types.setTypeParser(1700, (valor) => (valor === null ? null : Number(valor)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: config.databasePoolSize,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
});

const IDENTIFICADOR = /^[a-z_][a-z0-9_]*$/;

function identificador(valor, que) {
  if (!IDENTIFICADOR.test(valor)) {
    throw new Error(`${que} inválido: ${valor}`);
  }
  return valor;
}

export async function filas(sql, parametros = []) {
  const { rows } = await pool.query(sql, parametros);
  return rows;
}

export async function fila(sql, parametros = []) {
  return (await filas(sql, parametros))[0] ?? null;
}

// Las RPC usan auth.uid() y auth.role(), que en Postgres puro leen estas
// variables de sesión. Se fijan `local`, así que mueren con la transacción y no
// se filtran a la siguiente petición que reutilice la conexión.
export async function enSesion({ usuarioId = null, rol = "authenticated" }, tarea) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)",
      [usuarioId ?? "", rol],
    );
    const resultado = await tarea(client);
    await client.query("commit");
    return resultado;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Nombres de argumento con notación `p_x => $1`: las RPC conservan sus valores
// por defecto y no dependemos del orden de la firma.
export async function rpc(nombre, argumentos = {}, { usuarioId = null, rol = "authenticated" } = {}) {
  identificador(nombre, "nombre de RPC");
  const entradas = Object.entries(argumentos);
  const parametros = entradas
    .map(([clave], indice) => `${identificador(clave, "argumento")} => $${indice + 1}`)
    .join(", ");
  const sql = `select public.${nombre}(${parametros}) as resultado`;

  return enSesion({ usuarioId, rol }, async (client) => {
    const { rows } = await client.query(sql, entradas.map(([, valor]) => valor));
    return rows[0]?.resultado ?? null;
  });
}

export async function cerrarPool() {
  await pool.end();
}
