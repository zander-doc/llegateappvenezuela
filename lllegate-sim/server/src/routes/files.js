import { Router } from "express";
import { asyncHandler, HttpError } from "../http.js";
import { leer, rutaDeToken } from "../storage.js";

export const filesRouter = Router();

// Sirve documentos con el enlace firmado que genera el panel administrativo.
// El token es la credencial: no hace falta sesión y caduca solo.
filesRouter.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const ruta = rutaDeToken(req.params.token);
    if (!ruta) throw new HttpError(403, "enlace_invalido", "El enlace expiró o no es válido");

    const archivo = await leer(ruta);
    if (!archivo) throw new HttpError(404, "archivo_no_encontrado", "El archivo ya no está disponible");

    res.set("Content-Type", archivo.mime);
    res.set("Cache-Control", "private, max-age=300");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(archivo.buffer);
  }),
);
