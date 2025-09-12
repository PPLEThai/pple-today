import { ElectionCandidate, ElectionInfo } from '@pple-today/api-common/dtos'
import { EligibleVoterType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ListElectionResponse = t.Array(ElectionInfo)
export type ListElectionResponse = Static<typeof ListElectionResponse>

export const GetElectionParams = t.Object({
  electionId: t.String(),
})
export type GetElectionParams = Static<typeof GetElectionParams>

export const GetElectionResponse = t.Intersect([
  ElectionInfo,
  t.Object({
    candidates: t.Array(ElectionCandidate),
  }),
])
export type GetElectionResponse = Static<typeof GetElectionResponse>

export const RegisterElectionParams = t.Object({
  electionId: t.String(),
})
export type RegisterElectionParams = Static<typeof RegisterElectionParams>

export const RegisterElectionBody = t.Object({
  type: t.Enum(EligibleVoterType),
})
export type RegisterElectionBody = Static<typeof RegisterElectionBody>

export const RegisterElectionResponse = t.Object({
  message: t.String(),
})
export type RegisterElectionResponse = Static<typeof RegisterElectionResponse>

export const WithdrawBallotParams = t.Object({
  electionId: t.String(),
})
export type WithdrawBallotParams = Static<typeof WithdrawBallotParams>

export const WithdrawBallotResponse = t.Object({
  message: t.String(),
})
export type WithdrawBallotResponse = Static<typeof WithdrawBallotResponse>
