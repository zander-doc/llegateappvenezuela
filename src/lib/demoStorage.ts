const SENSITIVE_KEY_RE =
  /(password|contrasen|contraseñ|cedula|identificacion|identificación|phone|telefono|teléfono|whatsapp|documento|comprobante|token|secret)/i;

const PHONE_LIKE_RE = /^\+?[\d\s()./-]{7,}$/;

const DRAFT_PREFIX = "llegate_sim_draft:";

export function sanitizeDemoPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDemoPayload(item)) as T;
  }

  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEY_RE.test(key)) continue;
      if (typeof item === "string" && PHONE_LIKE_RE.test(item.trim())) continue;
      clean[key] = sanitizeDemoPayload(item);
    }
    return clean as T;
  }

  return value;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: la simulación sigue funcionando */
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDemoLead(key: string, payload: Record<string, unknown>) {
  const list = readJson<unknown[]>(key) ?? [];
  list.push({ ...sanitizeDemoPayload(payload), savedAt: new Date().toISOString() });
  saveJson(key, list.slice(-25));
}

export function saveDraft(name: string, payload: Record<string, unknown>) {
  saveJson(`${DRAFT_PREFIX}${name}`, sanitizeDemoPayload(payload));
}

export function loadDraft<T>(name: string): T | null {
  const value = readJson<T>(`${DRAFT_PREFIX}${name}`);
  return value && typeof value === "object" ? value : null;
}

export function clearDraft(name: string) {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${name}`);
  } catch {
    /* noop */
  }
}
