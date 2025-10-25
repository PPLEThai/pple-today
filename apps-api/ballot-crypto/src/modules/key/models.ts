import { Static, t } from 'elysia'

export const CreateKeysBody = t.Object({
  electionId: t.String(),
})
export type CreateKeysBody = Static<typeof CreateKeysBody>

export const CreateKeysResponse = t.Object({
  message: t.String(),
})
export type CreateKeysResponse = Static<typeof CreateKeysResponse>

export const DeleteKeysParams = t.Object({
  electionId: t.String(),
})
export type DeleteKeysParams = Static<typeof DeleteKeysParams>

export const DeleteKeysResponse = t.Object({
  destroyScheduledDuration: t.Integer(),
})
export type DeleteKeysResponse = Static<typeof DeleteKeysResponse>

export const RestoreKeysParams = t.Object({
  electionId: t.String(),
})
export type RestoreKeysParams = Static<typeof RestoreKeysParams>

export const RestoreKeysResponse = t.Object({
  message: t.String(),
})
export type RestoreKeysResponse = Static<typeof RestoreKeysResponse>

export const GetKeysParams = t.Object({
  electionId: t.String(),
})
export type GetKeysParams = Static<typeof GetKeysParams>

export const GetKeysResponse = t.Object({
  publicEncrypt: t.String(),
  publicSigning: t.String(),
})
export type GetKeysResponse = Static<typeof GetKeysResponse>
