export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
export const PERSON_NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{3,}$/;

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isVenezuelanPhone(value: string) {
  return /^(0\d{10}|58\d{10}|\d{10})$/.test(normalizeDigits(value));
}

export function toVenezuelanE164(value: string): string | null {
  const digits = normalizeDigits(value);
  if (digits.length === 12 && digits.startsWith("58")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+58${digits.slice(1)}`;
  if (digits.length === 10) return `+58${digits}`;
  return null;
}

export const E164_RE = /^\+[1-9]\d{7,14}$/;

export function isContact(value: string) {
  const clean = value.trim();
  if (!clean) return false;
  if (isEmail(clean)) return true;
  const digits = normalizeDigits(clean);
  return digits.length >= 7 && digits.length <= 15;
}

// La API admite el contacto como correo o como E.164; los formularios aceptan
// "0414 1234567", así que se normaliza aquí en vez de en cada modal.
export function contactoParaSolicitud(value: string): string {
  const clean = value.trim();
  if (isEmail(clean) || E164_RE.test(clean)) return clean;
  const venezolano = toVenezuelanE164(clean);
  if (venezolano) return venezolano;
  const digits = normalizeDigits(clean);
  return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : clean;
}

export function isCedula(value: string) {
  return /^[VE]\d{6,9}$/.test(value.trim().replace(/[-.\s]/g, "").toUpperCase());
}

export function isPersonName(value: string) {
  return PERSON_NAME_RE.test(value.trim());
}
