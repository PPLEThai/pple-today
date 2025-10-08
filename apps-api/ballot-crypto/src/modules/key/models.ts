import { Static, t } from 'elysia'

export const CreateKeyBody = t.Object({
  electionId: t.String(),
})
export type CreateKeyBody = Static<typeof CreateKeyBody>

export const DeleteKeyParams = t.Object({
  electionId: t.String(),
})
export type DeleteKeyParams = Static<typeof DeleteKeyParams>
