export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function parse(schema, payload, field) {
  const result = schema.safeParse(payload ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      campo: [field, issue.path.join(".")].filter(Boolean).join("."),
      mensaje: issue.message,
    }));
    throw new HttpError(422, "datos_invalidos", "Revisa los datos enviados", issues);
  }
  return result.data;
}

export function bearerToken(req) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "token_requerido", "Envía el access_token de Supabase en el header Authorization");
  }
  return token;
}

export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

const STATUS_BY_CODE = {
  42501: 403,
  23505: 409,
  23503: 409,
  23514: 400,
  "22P02": 400,
  P0001: 400,
  P0002: 404,
};

export function errorHandler(err, _req, res, _next) {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "json_invalido", mensaje: "El cuerpo no es JSON válido" });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      mensaje: err.message,
      ...(err.details ? { detalles: err.details } : {}),
    });
  }

  const status = STATUS_BY_CODE[err?.code];
  if (status) {
    return res.status(status).json({
      error: err.code === "42501" ? "no_autorizado" : err.code,
      mensaje: err.message ?? "Operación rechazada por la base de datos",
    });
  }

  console.error(err);
  return res.status(500).json({
    error: "error_interno",
    mensaje: "Error interno del servidor",
  });
}
