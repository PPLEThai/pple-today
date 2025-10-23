import { Static, t } from 'elysia'

export const BallotCountBody = t.Object({
  electionId: t.String(),
  ballots: t.Array(t.String()),
})
export type BallotCountBody = Static<typeof BallotCountBody>

export const BallotCountResponse = t.Object({
  message: t.String(),
})
export type BallotCountResponse = Static<typeof BallotCountResponse>
