import forge from 'node-forge'

export function encryptBallot(candidateId: string, publicKeyBase64: string): string {
  // Parse the PEM public key
  const publicKey = forge.pki.publicKeyFromPem(publicKeyBase64)

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
