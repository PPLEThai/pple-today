import { ElectionCandidate, ElectionInfo } from '@pple-today/api-common/dtos'
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
