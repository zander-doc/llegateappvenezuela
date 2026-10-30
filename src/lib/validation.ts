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

export function isContact(value: string) {
  const clean = value.trim();
  if (!clean) return false;
  if (isEmail(clean)) return true;
  const digits = normalizeDigits(clean);
  return digits.length >= 7 && digits.length <= 15;
}

export function isCedula(value: string) {
  return /^[VE]\d{6,9}$/.test(value.trim().replace(/[-.\s]/g, "").toUpperCase());
}

export function isPersonName(value: string) {
  return PERSON_NAME_RE.test(value.trim());
}
