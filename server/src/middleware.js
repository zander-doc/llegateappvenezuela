import { verificarAcceso } from "./auth/tokens.js";
import { fila } from "./db.js";
import { asyncHandler, bearerToken, HttpError } from "./http.js";

export const requireUser = asyncHandler(async (req, _res, next) => {
  const accessToken = bearerToken(req);
  const sesion = verificarAcceso(accessToken);

  if (!sesion) {
    throw new HttpError(401, "token_invalido", "Sesión inválida o expirada");
  }

  // Un logout o un refresh rotado revocan la fila: el token deja de servir
  // aunque su firma siga vigente.
  const vigente = await fila(
    `select 1 as valida
       from auth.sesiones
      where id = $1 and usuario_id = $2 and revocada_en is null and expira_en > now()`,
    [sesion.sid, sesion.sub],
  );

  if (!vigente) {
    throw new HttpError(401, "sesion_invalida", "La sesión expiró; vuelve a ingresar con tu código");
  }

  req.accessToken = accessToken;
  req.sesionId = sesion.sid;
  req.user = { id: sesion.sub };
  next();
});

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const perfil = await fila("select rol from public.usuarios where id = $1", [req.user.id]);

  if (perfil?.rol !== "admin") {
    throw new HttpError(403, "solo_admin", "Se requiere rol administrador");
  }
  next();
});
