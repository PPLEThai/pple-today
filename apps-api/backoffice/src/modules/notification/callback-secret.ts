import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Encryption at rest for `MiniApp.notificationCallbackSecret`.
 *
 * The secret has to be usable to sign callbacks, so it cannot be hashed like a
 * notification key. It is encrypted with AES-256-GCM under a key derived (SHA-256)
 * from `NOTIFICATION_CALLBACK_SECRET_KEY`, so the env value may be any string.
 *
 * Stored form: `v1:<iv b64url>:<tag b64url>:<ciphertext b64url>`.
 */
const VERSION = 'v1'
const SECRET_PREFIX = 'whsec_'

const deriveKey = (key: string) => createHash('sha256').update(key, 'utf8').digest()

export const generateCallbackSecret = (): string =>
  `${SECRET_PREFIX}${randomBytes(32).toString('base64url')}`

export const encryptCallbackSecret = (plaintext: string, key: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(key), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')
}

/** Returns null when the value is malformed, tampered with, or the key is wrong. */
export const decryptCallbackSecret = (stored: string, key: string): string | null => {
  const [version, iv, tag, ciphertext, ...rest] = stored.split(':')
  if (version !== VERSION || !iv || !tag || !ciphertext || rest.length > 0) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(key), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
