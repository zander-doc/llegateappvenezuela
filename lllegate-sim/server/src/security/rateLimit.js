// Límite de intentos en memoria. La API corre en una sola instancia; si algún
// día se escala horizontalmente, este almacén debe pasar a Redis.
//
// Se usa ventana deslizante por clave (teléfono o IP): cada intento guarda su
// marca de tiempo y se descartan los que salieron de la ventana.

const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
const buckets = new Map();
let ultimaLimpieza = 0;

function limpiarExpirados(now) {
  if (now - ultimaLimpieza < CLEANUP_INTERVAL_MS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.intentos.every((marca) => marca <= now - bucket.windowMs)) {
      buckets.delete(key);
    }
  }
  ultimaLimpieza = now;
}

export function hitRateLimit(key, { limit, windowMs, now = Date.now() }) {
  limpiarExpirados(now);
  const desde = now - windowMs;
  const bucket = buckets.get(key);
  const intentos = (bucket?.intentos ?? []).filter((marca) => marca > desde);

  if (intentos.length >= limit) {
    buckets.set(key, { intentos, windowMs });
    const retryAfter = Math.max(1, Math.ceil((intentos[0] + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }

  if (!bucket && buckets.size >= MAX_BUCKETS) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil(windowMs / 1000)) };
  }

  intentos.push(now);
  buckets.delete(key);
  buckets.set(key, { intentos, windowMs });
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimit(key) {
  buckets.delete(key);
}

export function resetRateLimits() {
  buckets.clear();
  ultimaLimpieza = 0;
}
