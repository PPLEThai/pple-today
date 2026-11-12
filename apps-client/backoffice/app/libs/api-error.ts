/**
 * Read an error thrown by the API client safely.
 *
 * An HTTP error from the API is `{ status, value: { error: { code, message } } }`,
 * but when `fetch` itself fails (network, CORS, wrong API URL) the client throws
 * a plain `TypeError` with no `value`, so `error.value.error` must never be read
 * directly.
 */
export function apiErrorCode(error: unknown): string | undefined {
  return apiErrorBody(error)?.code
}

export function apiErrorMessage(error: unknown): string | undefined {
  const body = apiErrorBody(error)
  if (body?.message) return body.message
  if (error instanceof Error && error.message) {
    return error.message === 'Failed to fetch'
      ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Failed to fetch)'
      : error.message
  }
  return undefined
}

function apiErrorBody(error: unknown): { code?: string; message?: string } | undefined {
  if (!error || typeof error !== 'object' || !('value' in error)) return undefined
  const value = (error as { value?: unknown }).value
  if (!value || typeof value !== 'object' || !('error' in value)) return undefined
  const body = (value as { error?: unknown }).error
  return body && typeof body === 'object'
    ? (body as { code?: string; message?: string })
    : undefined
}
