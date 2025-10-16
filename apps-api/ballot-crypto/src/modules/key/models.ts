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
  message: t.String(),
})
export type DeleteKeysResponse = Static<typeof DeleteKeysResponse>
