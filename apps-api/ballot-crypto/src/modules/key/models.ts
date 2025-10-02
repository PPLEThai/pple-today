import { Static, t } from 'elysia'

export const CreateKeyBody = t.Object({
  electionId: t.String(),
})
export type CreateKeyBody = Static<typeof CreateKeyBody>

export const CreateKeyResponse = t.Object({
  encryptionPublicKey: t.String(),
  signingPublicKey: t.String(),
})
export type CreateKeyResponse = Static<typeof CreateKeyResponse>
