import { ElectionType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ElectionStatus = t.Enum({
  NOT_OPENED_VOTE: 'NOT_OPENED_VOTE',
  OPEN_VOTE: 'OPEN_VOTE',
  CLOSED_VOTE: 'CLOSED_VOTE',
  RESULT_ANNOUNCE: 'RESULT_ANNOUNCE',
})
export type ElectionStatus = Static<typeof ElectionStatus>

export const ElectionInfo = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  location: t.Nullable(t.String()),
  type: t.Enum(ElectionType),

  publishDate: t.Nullable(t.Date()),
  openRegister: t.Nullable(t.Date()),
  closeRegister: t.Nullable(t.Date()),
  openVoting: t.Date(),
  closeVoting: t.Date(),
  startResult: t.Nullable(t.Date()),
  endResult: t.Nullable(t.Date()),

  createdAt: t.Date(),
  updatedAt: t.Date(),

  status: ElectionStatus,
  votePercentage: t.Number(),
  isRegistered: t.Nullable(t.Boolean()),
})
export type ElectionInfo = Static<typeof ElectionInfo>

export const ListElectionResponse = t.Array(ElectionInfo)
export type ListElectionResponse = Static<typeof ListElectionResponse>

export const GetElectionQuery = t.Object({
  electionId: t.String(),
})

export const ElectionCandidate = t.Object({
  id: t.String(),
  electionId: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  profileImage: t.Nullable(t.String()),
  number: t.Nullable(t.Number()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})
export type ElectionCandidate = Static<typeof ElectionCandidate>

export const GetElectionResponse = t.Intersect([
  ElectionInfo,
  t.Object({
    candidates: t.Array(ElectionCandidate),
  }),
])
export type GetElectionResponse = Static<typeof GetElectionResponse>
