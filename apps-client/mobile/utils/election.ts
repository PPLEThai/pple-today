import crypto from 'crypto'

export function encryptBallot(candidateId: string, publicKey: string): string {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(
      JSON.stringify({
        candidateId,
      })
    )
  )
  return encrypted.toString('base64')
}
