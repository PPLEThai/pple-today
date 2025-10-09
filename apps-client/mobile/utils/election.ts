import { Buffer } from 'buffer'
import forge from 'node-forge'

export function encryptBallot(candidateId: string, publicKeyBase64: string): string {
  // Parse the PEM public key
  const rawPublicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf-8')
  const publicKey = forge.pki.publicKeyFromPem(rawPublicKey)

  // Encrypt with RSA-OAEP + SHA-256
  const encrypted = publicKey.encrypt(
    JSON.stringify({
      candidateId,
    }),
    'RSA-OAEP',
    {
      md: forge.md.sha256.create(),
      mgf1: forge.mgf.mgf1.create(forge.md.sha256.create()),
    }
  )

  // Return Base64 string
  return forge.util.encode64(encrypted)
}
