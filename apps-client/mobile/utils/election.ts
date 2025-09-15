import crypto from 'crypto'

function secureRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

export function encryptBallot(candidateId: string, publicKey: string): string {
  const NONCE_LENGTH = 32
  const nonce = secureRandomString(NONCE_LENGTH)
  const message = `${candidateId}:${nonce}`
  const decrypted = crypto.publicEncrypt(publicKey, Buffer.from(message))
  return decrypted.toString()
}
