/**
 * Normalizes a Thai mobile number to E.164 (+66...) format.
 * Accepts +66XXXXXXXXX or 0XXXXXXXXX (domestic leading-zero format).
 */
export function normalizeThaiPhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim()
  if (trimmed.startsWith('+')) return trimmed
  return `+66${trimmed.slice(1)}`
}

/** A Thai mobile number in E.164: `+66` and nine digits. */
const E164_THAI_MOBILE = /^\+66\d{9}$/

/**
 * Whether a number is a complete Thai mobile number in E.164 form.
 *
 * Pairs with `normalizeThaiPhoneNumber`, which converts the formats it
 * recognises but passes through the ones it doesn't — `66812345678` becomes
 * `+666812345678`, and `081-234-5678` becomes `+6681-234-5678`. Normalising is
 * therefore not the same as validating, and callers that care whether they hold
 * a real, whole number must check this afterwards.
 */
export function isThaiMobileE164(phoneNumber: string): boolean {
  return E164_THAI_MOBILE.test(phoneNumber)
}
