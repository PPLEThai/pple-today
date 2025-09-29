import {
  ElectionCandidate,
  ElectionElgibleVoter,
  ElectionInfo,
  FilePath,
  ImageFileMimeType,
  ListQuery,
  PaginationMetadataResponse,
} from '@pple-today/api-common/dtos'
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

export const AdminCancelElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminCancelElectionParams = Static<typeof AdminCancelElectionParams>

export const AdminCancelElectionResponse = t.Object({
  message: t.String(),
})
export type AdminCancelElectionResponse = Static<typeof AdminCancelElectionResponse>

export const AdminListElectionCandidatesParams = t.Object({
  electionId: t.String(),
})
export type AdminListElectionCandidatesParams = Static<typeof AdminListElectionCandidatesParams>

export const AdminListElectionCandidatesResponse = t.Array(ElectionCandidate)
export type AdminListElectionCandidatesResponse = Static<typeof AdminListElectionCandidatesResponse>

export const AdminCreateCandidateProfileUploadURLBody = t.Object({
  contentType: ImageFileMimeType,
})
export type AdminCreateCandidateProfileUploadURLBody = Static<
  typeof AdminCreateCandidateProfileUploadURLBody
>

export const AdminCreateCandidateProfileUploadURLResponse = t.Object({
  fileKey: FilePath,
  uploadUrl: t.String({ description: 'The signed URL to upload the file' }),
  uploadFields: t.Record(t.String(), t.String(), {
    description: 'The fields required for the upload',
  }),
})
export type AdminCreateCandidateProfileUploadURLResponse = Static<
  typeof AdminCreateCandidateProfileUploadURLResponse
>

export const AdminCreateElectionCandidateParams = t.Object({
  electionId: t.String(),
})
export type AdminCreateElectionCandidateParams = Static<typeof AdminCreateElectionCandidateParams>

export const AdminCreateElectionCandidateBody = t.Object({
  name: t.String(),
  description: t.Nullable(t.String()),
  profileImagePath: t.Nullable(FilePath),
  number: t.Nullable(t.Integer()),
})
export type AdminCreateElectionCandidateBody = Static<typeof AdminCreateElectionCandidateBody>

export const AdminCreateElectionCandidateResponse = ElectionCandidate
export type AdminCreateElectionCandidateResponse = Static<
  typeof AdminCreateElectionCandidateResponse
>

export const AdminUpdateElectionCandidateParams = t.Object({
  electionId: t.String(),
  candidateId: t.String(),
})
export type AdminUpdateElectionCandidateParams = Static<typeof AdminUpdateElectionCandidateParams>

export const AdminUpdateElectionCandidateBody = t.Object({
  name: t.String(),
  description: t.Nullable(t.String()),
  profileImagePath: t.Nullable(FilePath),
  number: t.Nullable(t.Integer()),
})
export type AdminUpdateElectionCandidateBody = Static<typeof AdminUpdateElectionCandidateBody>

export const AdminUpdateElectionCandidateResponse = ElectionCandidate
export type AdminUpdateElectionCandidateResponse = Static<
  typeof AdminUpdateElectionCandidateResponse
>

export const AdminDeleteElectionCandidateParams = t.Object({
  electionId: t.String(),
  candidateId: t.String(),
})
export type AdminDeleteElectionCandidateParams = Static<typeof AdminDeleteElectionCandidateParams>

export const AdminDeleteElectionCandidateResponse = t.Object({
  message: t.String(),
})
export type AdminDeleteElectionCandidateResponse = Static<
  typeof AdminDeleteElectionCandidateResponse
>

export const AdminListElectionElgibleVoterParams = t.Object({
  electionId: t.String(),
})
export type AdminListElectionElgibleVoterParams = Static<typeof AdminListElectionElgibleVoterParams>

export const AdminListElectionElgibleVoterResponse = t.Array(ElectionElgibleVoter)
export type AdminListElectionElgibleVoterResponse = Static<
  typeof AdminListElectionElgibleVoterResponse
>
