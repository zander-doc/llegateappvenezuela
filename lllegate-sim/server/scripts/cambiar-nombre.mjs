import "dotenv/config";
import pg from "pg";

// Cambia el nombre de la cuenta de un teléfono. Existe porque el perfil se crea
// una sola vez (el trigger hace `on conflict do nothing`) y no hay endpoint de
// edición todavía. No imprime la cadena de conexión ni otros datos.

const telefono = process.argv[2];
const nombre = process.argv[3];

if (!telefono || !nombre) {
  console.error("uso: node scripts/cambiar-nombre.mjs <telefono> <nombre>");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await cliente.connect();
  const antes = await cliente.query(
    "select nombre from public.usuarios where telefono = $1",
    [telefono],
  );

  if (!antes.rowCount) {
    console.error(`No hay ninguna cuenta con el teléfono ${telefono}.`);
    process.exit(1);
  }

  const despues = await cliente.query(
    "update public.usuarios set nombre = $2, updated_at = now() where telefono = $1 returning nombre",
    [telefono, nombre],
  );

  console.log(`Antes: ${antes.rows[0].nombre} → Ahora: ${despues.rows[0].nombre}`);
} finally {
  await cliente.end();
}
