/**
 * Normalizes a Thai mobile number to E.164 (+66...) format.
 * Accepts +66XXXXXXXXX or 0XXXXXXXXX (domestic leading-zero format).
 */
export function normalizeThaiPhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim()
  if (trimmed.startsWith('+')) return trimmed
  return `+66${trimmed.slice(1)}`
}
