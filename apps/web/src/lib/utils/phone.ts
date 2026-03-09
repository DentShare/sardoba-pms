const UZ_PHONE_RE = /^\+998\d{9}$/;

/**
 * Normalizes a raw phone string to +998XXXXXXXXX format.
 * Strips spaces, dashes, parentheses; auto-prepends +998 when possible.
 * Returns null if the result is not a valid Uzbekistan number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');

  let phone: string;
  if (digits.length === 12 && digits.startsWith('998')) {
    phone = `+${digits}`;
  } else if (digits.length === 9) {
    phone = `+998${digits}`;
  } else {
    return null;
  }

  return UZ_PHONE_RE.test(phone) ? phone : null;
}

/**
 * Formats a +998XXXXXXXXX number into a human-readable form:
 * +998 (XX) XXX-XX-XX
 */
export function formatPhone(phone: string): string {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!m) return phone;
  return `+998 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}`;
}
