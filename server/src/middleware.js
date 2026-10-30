import { asyncHandler, bearerToken, HttpError, unwrap } from "./http.js";
import { supabaseForUser } from "./supabase.js";

export const requireUser = asyncHandler(async (req, _res, next) => {
  const accessToken = bearerToken(req);
  const client = supabaseForUser(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new HttpError(401, "token_invalido", "Sesión inválida o expirada");
  }

  req.accessToken = accessToken;
  req.supabase = client;
  req.user = data.user;
  next();
});

export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const perfil = unwrap(
    await req.supabase.from("usuarios").select("rol").eq("id", req.user.id).maybeSingle(),
  );

  if (perfil?.rol !== "admin") {
    throw new HttpError(403, "solo_admin", "Se requiere rol administrador");
  }
  next();
});
