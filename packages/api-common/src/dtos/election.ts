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
  isCancelled: t.Boolean(),
  encryptionPublicKey: t.Nullable(t.String()),

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

export const ElectionCandidate = t.Object({
  id: t.String(),
  electionId: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  profileImagePath: t.Nullable(t.String()),
  number: t.Nullable(t.Number()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
})
export type ElectionCandidate = Static<typeof ElectionCandidate>
