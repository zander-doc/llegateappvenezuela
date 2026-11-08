import { Router } from "express";
import { verificarAcceso } from "../auth/tokens.js";
import { config } from "../config.js";
import { fila, filas } from "../db.js";
import { asyncHandler, HttpError, parse } from "../http.js";
import { negocioSchema, negociosQuerySchema } from "../schemas.js";
import { hitRateLimit } from "../security/rateLimit.js";

export const negociosRouter = Router();

// `contacto` es el canal privado del dueño para verificar la propiedad del
// negocio: nunca sale por la vitrina. `nota_admin` y `motivo_rechazo` tampoco.
const COLUMNAS_VITRINA = `id, slug, nombre, categoria, ciudad, zona, direccion, horario,
                          oferta, descripcion, sitio, telefono_publico, verificado, publicada_en`;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,7}$/;

function ipDe(req) {
  return req.ip || req.socket?.remoteAddress || "desconocida";
}

function slugDe(nombre) {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base.length >= 3 ? base : "negocio-motor";
}

// Se leen los slugs que empiezan igual y se busca el primer hueco: una sola
// consulta en vez de reintentar el insert contra la restricción de unicidad.
async function slugLibre(base) {
  const usadas = await filas(`select slug from public.negocios where slug like $1`, [`${base}%`]);
  const nombres = new Set(usadas.map((usada) => usada.slug));

  if (!nombres.has(base)) return base;

  for (let sufijo = 2; sufijo <= 99; sufijo += 1) {
    const candidato = `${base}-${sufijo}`;
    if (!nombres.has(candidato)) return candidato;
  }

  return `${base}-${Date.now().toString(36)}`.slice(0, 80);
}

// Si quien publica ya tiene sesión, la ficha queda vinculada a su cuenta: es la
// única forma de dejarle actualizarla después. Un token caducado no rompe el
// envío, simplemente la ficha nace sin dueño.
async function usuarioDeSesion(req) {
  // Aquí el token es opcional: quien propone sin cuenta deja una ficha sin dueño.
  const encabezado = req.headers.authorization ?? "";
  const [esquema, accessToken] = encabezado.split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !accessToken) return null;

  const sesion = verificarAcceso(accessToken);
  if (!sesion) return null;

  const vigente = await fila(
    `select 1 as valida
       from auth.sesiones
      where id = $1 and usuario_id = $2 and revocada_en is null and expira_en > now()`,
    [sesion.sid, sesion.sub],
  );

  return vigente ? sesion.sub : null;
}

negociosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filtros = parse(negociosQuerySchema, req.query);
    const limite = Math.min(filtros.limite ?? config.mercado.listadoMax, config.mercado.listadoMax);

    const condiciones = ["estado = 'publicado'"];
    const valores = [];

    if (filtros.categoria) {
      valores.push(filtros.categoria);
      condiciones.push(`categoria = $${valores.length}`);
    }
    if (filtros.ciudad) {
      valores.push(filtros.ciudad);
      condiciones.push(`lower(btrim(ciudad)) = lower(btrim($${valores.length}))`);
    }
    if (filtros.q) {
      valores.push(`%${filtros.q}%`);
      const parametro = `$${valores.length}`;
      condiciones.push(
        `(nombre ilike ${parametro} or coalesce(oferta, '') ilike ${parametro}
          or coalesce(descripcion, '') ilike ${parametro} or coalesce(zona, '') ilike ${parametro})`,
      );
    }

    const where = condiciones.join(" and ");
    valores.push(limite);

    const [negocios, total, conteoCategoria] = await Promise.all([
      filas(
        `select ${COLUMNAS_VITRINA}
           from public.negocios
          where ${where}
          order by verificado desc, publicada_en desc, nombre asc
          limit $${valores.length}`,
        valores,
      ),
      fila(`select count(*)::int as total from public.negocios where ${where}`, valores.slice(0, -1)),
      filas(
        `select categoria, count(*)::int as total
           from public.negocios
          where estado = 'publicado'
          group by categoria`,
      ),
    ]);

    res.json({
      ok: true,
      total: total.total,
      negocios,
      categorias: Object.fromEntries(conteoCategoria.map((fila) => [fila.categoria, fila.total])),
    });
  }),
);

negociosRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug.toLowerCase();

    if (!SLUG_RE.test(slug)) {
      throw new HttpError(422, "datos_invalidos", "Ese enlace de ficha no es válido");
    }

    const negocio = await fila(
      `select ${COLUMNAS_VITRINA}
         from public.negocios
        where slug = $1 and estado = 'publicado'`,
      [slug],
    );

    if (!negocio) {
      throw new HttpError(404, "negocio_no_encontrado", "Esa ficha todavía no está publicada");
    }

    res.json({ ok: true, negocio });
  }),
);

negociosRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(negocioSchema, req.body);

    const { limits } = config.mercado;
    const windowMs = limits.ventanaMinutos * 60_000;
    const controles = [
      {
        clave: `negocios:ip:${ipDe(req)}`,
        limit: limits.porIp,
        mensaje: `Has enviado varias fichas seguidas. Espera ${limits.ventanaMinutos} minutos.`,
      },
      {
        clave: `negocios:contacto:${body.contacto.toLowerCase()}`,
        limit: limits.porContacto,
        mensaje: "Ya tenemos una ficha tuya en revisión. Te avisamos cuando quede publicada.",
      },
    ];

    for (const control of controles) {
      const resultado = hitRateLimit(control.clave, { limit: control.limit, windowMs });
      if (!resultado.ok) {
        res.set("Retry-After", String(resultado.retryAfter));
        throw new HttpError(429, "demasiados_intentos", control.mensaje, {
          retry_after: resultado.retryAfter,
        });
      }
    }

    const slug = await slugLibre(slugDe(body.nombre));
    const usuarioId = await usuarioDeSesion(req);

    const creada = await fila(
      `insert into public.negocios (
         nombre, slug, categoria, ciudad, zona, direccion, horario, oferta,
         descripcion, sitio, contacto, telefono_publico, usuario_id
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       returning id, slug, nombre, estado, verificado, created_at`,
      [
        body.nombre,
        slug,
        body.categoria,
        body.ciudad,
        body.zona ?? null,
        body.direccion ?? null,
        body.horario ?? null,
        body.oferta ?? null,
        body.descripcion ?? null,
        body.sitio ?? null,
        body.contacto,
        body.telefono_publico ?? null,
        usuarioId,
      ],
    );

    res.status(201).json({
      ok: true,
      id: creada.id,
      slug: creada.slug,
      estado: creada.estado,
      mensaje: "Recibimos tu negocio. El equipo de operaciones lo revisa y te escribe por el contacto que diste.",
    });
  }),
);
