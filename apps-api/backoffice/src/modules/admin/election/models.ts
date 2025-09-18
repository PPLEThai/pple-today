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

export const AdminUpdateElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminUpdateElectionParams = Static<typeof AdminUpdateElectionParams>

export const AdminUpdateElectionBody = t.Object({
  name: t.String(),
  description: t.Nullable(t.String()),
  location: t.Nullable(t.String()),
  type: t.Enum(ElectionType),
  isCancelled: t.Boolean(),
  publishDate: t.Nullable(t.Date()),
  openRegister: t.Nullable(t.Date()),
  closeRegister: t.Nullable(t.Date()),
  openVoting: t.Date(),
  closeVoting: t.Date(),
  startResult: t.Nullable(t.Date()),
  endResult: t.Nullable(t.Date()),
})
export type AdminUpdateElectionBody = Static<typeof AdminUpdateElectionBody>

export const AdminUpdateElectionResponse = t.Object({
  message: t.String(),
})
export type AdminUpdateElectionResponse = Static<typeof AdminUpdateElectionResponse>

export const AdminDeleteElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminDeleteElectionParams = Static<typeof AdminDeleteElectionParams>

export const AdminDeleteElectionResponse = t.Object({
  message: t.String(),
})
export type AdminDeleteElectionResponse = Static<typeof AdminDeleteElectionResponse>
