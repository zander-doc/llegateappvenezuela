// Límite de intentos en memoria. La API corre en una sola instancia; si algún
// día se escala horizontalmente, este almacén debe pasar a Redis.
//
// Se usa ventana deslizante por clave (teléfono o IP): cada intento guarda su
// marca de tiempo y se descartan los que salieron de la ventana.

const buckets = new Map();

export function hitRateLimit(key, { limit, windowMs, now = Date.now() }) {
  const desde = now - windowMs;
  const intentos = (buckets.get(key) ?? []).filter((marca) => marca > desde);

  if (intentos.length >= limit) {
    buckets.set(key, intentos);
    const retryAfter = Math.max(1, Math.ceil((intentos[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  intentos.push(now);
  buckets.set(key, intentos);
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimit(key) {
  buckets.delete(key);
}

export function resetRateLimits() {
  buckets.clear();
}
