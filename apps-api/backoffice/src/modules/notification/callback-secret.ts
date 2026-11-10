import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Encryption at rest for `MiniApp.notificationCallbackSecret`.
 *
 * The secret has to be usable to sign callbacks, so it cannot be hashed like a
 * notification key. It is encrypted with AES-256-GCM under a key derived (SHA-256)
 * from `NOTIFICATION_CALLBACK_SECRET_KEY`, so the env value may be any string.
 *
 * Stored form: `k1.<kid>.v1:<iv b64url>:<tag b64url>:<ciphertext b64url>`, where
 * `kid` is the first 8 hex chars of SHA-256 of the key material. Decryption picks
 * the key whose kid matches (the current key or `NOTIFICATION_CALLBACK_SECRET_KEY_PREVIOUS`),
 * so the key can be rotated without breaking stored secrets. Values written before
 * key ids existed have no `k1.` prefix: they are tried against the current key,
 * then the previous one. Encryption always uses the current key.
 */
const VERSION = 'v1'
const KID_PREFIX = 'k1'
const SECRET_PREFIX = 'whsec_'

export type CallbackSecretKeys = { current?: string; previous?: string }

const deriveKey = (key: string) => createHash('sha256').update(key, 'utf8').digest()

/** First 8 hex chars of SHA-256 of the key material. */
export const keyId = (key: string) =>
  createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 8)

export const generateCallbackSecret = (): string =>
  `${SECRET_PREFIX}${randomBytes(32).toString('base64url')}`

export const encryptCallbackSecret = (plaintext: string, key: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(key), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${KID_PREFIX}.${keyId(key)}.${[
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':')}`
}

const decryptBody = (body: string, key: string): string | null => {
  const [version, iv, tag, ciphertext, ...rest] = body.split(':')
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

/**
 * Returns null when the value is malformed, tampered with, or no configured key
 * matches. A bare string is the current key.
 */
export const decryptCallbackSecret = (
  stored: string,
  keys: string | CallbackSecretKeys
): string | null => {
  const { current, previous } = typeof keys === 'string' ? { current: keys } : keys
  const candidates = [current, previous].filter((k): k is string => !!k)

  const match = /^k1\.([0-9a-f]{8})\.([\s\S]*)$/.exec(stored)
  if (match) {
    const key = candidates.find((k) => keyId(k) === match[1])
    return key ? decryptBody(match[2], key) : null
  }
  // Pre-kid value: no way to tell which key wrote it.
  for (const key of candidates) {
    const plain = decryptBody(stored, key)
    if (plain !== null) return plain
  }
  return null
}
