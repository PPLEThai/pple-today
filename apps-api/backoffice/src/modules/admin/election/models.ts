import { ElectionInfo, ListQuery, PaginationMetadataResponse } from '@pple-today/api-common/dtos'
import { ElectionType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const AdminListElectionQuery = ListQuery(
  t.Object({
    name: t.Optional(t.String()),
    type: t.Optional(t.Enum(ElectionType)),
    isCancelled: t.Optional(t.Boolean()),
  })
)
export type AdminListElectionQuery = Static<typeof AdminListElectionQuery>

export const AdminListElectionResponse = t.Intersect([
  PaginationMetadataResponse,
  t.Object({
    data: t.Array(ElectionInfo),
  }),
])
export type AdminListElectionResponse = Static<typeof AdminListElectionResponse>

export const AdminGetElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminGetElectionParams = Static<typeof AdminGetElectionParams>

export const AdminGetElectionResponse = ElectionInfo
export type AdminGetElectionResponse = Static<typeof AdminGetElectionResponse>
