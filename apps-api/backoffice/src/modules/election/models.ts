import { ElectionType } from '@pple-today/database/prisma'
import { t } from 'elysia'

export const ListElectionResponse = t.Object({
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

  status: t.Enum({
    NOT_OPENED: 'NOT_OPENED',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    RESULT_ANNOUNCE: 'RESULT_ANNOUNCE',
  }),
  votePercentage: t.Nullable(t.Number()),
  isRegistered: t.Boolean(),
})
