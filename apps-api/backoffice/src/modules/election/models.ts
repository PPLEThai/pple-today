import { t } from 'elysia'

import { ElectionType } from '../../../__generated__/prisma'

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
    VOTING: 'VOTING',
    CLOSED: 'CLOSED',
    RESULT_ANNOUNCE: 'RESULT_ANNOUNCE',
  }),
  votePercentage: t.Nullable(t.Number()),
})
