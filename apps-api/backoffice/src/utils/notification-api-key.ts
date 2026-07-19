import crypto from 'crypto'

/**
 * Mint a fresh notification API key (plaintext). The `pple_notification_` prefix
 * and nonce shape are the wire format callers present; keep generation in one
 * place so admin-issued and platform-issued keys can never drift apart.
 */
export const generateNotificationApiKey = () => {
  const randomNonce = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((acc, byte) => acc + byte.toString(36).padStart(2, '0'), '')

  return `pple_notification_${randomNonce}`
}

/**
 * Hash a notification API key for storage/lookup. Only the hash is ever
 * persisted; the plaintext is shown to the caller exactly once at creation.
 */
export const hashNotificationApiKey = (apiKey: string) => crypto.hash('sha256', apiKey)
