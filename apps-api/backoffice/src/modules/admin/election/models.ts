import {
  ElectionCandidate,
  ElectionEligibleVoter,
  ElectionInfo,
  FilePath,
  ImageFileMimeType,
  ListQuery,
  PaginationMetadataResponse,
} from '@pple-today/api-common/dtos'
import { ElectionKeysStatus, ElectionMode, ElectionType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const AdminCreateElectionBody = t.Object({
  name: t.String(),
  description: t.Optional(t.Nullable(t.String())),
  location: t.Optional(
    t.Nullable(
      t.String({ description: 'Address of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  locationMapUrl: t.Optional(
    t.Nullable(
      t.String({
        description: 'Google Maps URL of the location, required if type is ONSITE or HYBRID',
      })
    )
  ),
  province: t.Optional(
    t.Nullable(
      t.String({ description: 'Province of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  district: t.Optional(
    t.Nullable(
      t.String({ description: 'District of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  type: t.Enum(ElectionType),
  mode: t.Enum(ElectionMode),
  openRegister: t.Optional(t.Nullable(t.Date({ description: 'Required if type is HYBRID' }))),
  closeRegister: t.Optional(t.Nullable(t.Date({ description: 'Required if type is HYBRID' }))),
  openVoting: t.Date(),
  closeVoting: t.Date(),
})
export type AdminCreateElectionBody = Static<typeof AdminCreateElectionBody>

export const AdminCreateElectionResponse = ElectionInfo
export type AdminCreateElectionResponse = Static<typeof AdminCreateElectionResponse>

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
  description: t.Optional(t.Nullable(t.String())),
  location: t.Optional(
    t.Nullable(
      t.String({ description: 'Address of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  locationMapUrl: t.Optional(
    t.Nullable(
      t.String({
        description: 'Google Maps URL of the location, required if type is ONSITE or HYBRID',
      })
    )
  ),
  province: t.Optional(
    t.Nullable(
      t.String({ description: 'Province of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  district: t.Optional(
    t.Nullable(
      t.String({ description: 'District of the election, required if type is ONSITE or HYBRID' })
    )
  ),
  type: t.Enum(ElectionType),
  openRegister: t.Optional(t.Nullable(t.Date({ description: 'Required if type is HYBRID' }))),
  closeRegister: t.Optional(t.Nullable(t.Date({ description: 'Required if type is HYBRID' }))),
  openVoting: t.Date(),
  closeVoting: t.Date(),
})
export type AdminUpdateElectionBody = Static<typeof AdminUpdateElectionBody>

export const AdminUpdateElectionResponse = ElectionInfo
export type AdminUpdateElectionResponse = Static<typeof AdminUpdateElectionResponse>

export const AdminDeleteElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminDeleteElectionParams = Static<typeof AdminDeleteElectionParams>

export const AdminDeleteElectionResponse = t.Object({
  message: t.String(),
})
export type AdminDeleteElectionResponse = Static<typeof AdminDeleteElectionResponse>

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

export const AdminListElectionEligibleVoterParams = t.Object({
  electionId: t.String(),
})
export type AdminListElectionEligibleVoterParams = Static<
  typeof AdminListElectionEligibleVoterParams
>

export const AdminListElectionEligibleVoterResponse = t.Array(ElectionEligibleVoter)
export type AdminListElectionEligibleVoterResponse = Static<
  typeof AdminListElectionEligibleVoterResponse
>

export const AdminDeleteElectionEligibleVoterParams = t.Object({
  electionId: t.String(),
})
export type AdminDeleteElectionEligibleVoterParams = Static<
  typeof AdminDeleteElectionEligibleVoterParams
>

export const ElectionEligibleVoterIdentifier = {
  USER_ID: 'USER_ID',
  PHONE_NUMBER: 'PHONE_NUMBER',
} as const
export type ElectionEligibleVoterIdentifier = typeof ElectionEligibleVoterIdentifier

export const AdminCreateElectionEligibleVoterParams = t.Object({
  electionId: t.String(),
})
export type AdminCreateElectionEligibleVoterParams = Static<
  typeof AdminCreateElectionEligibleVoterParams
>

export const AdminCreateElectionEligibleVoterByUserIdBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.USER_ID),
  userId: t.String(),
})
export type AdminCreateElectionEligibleVoterByUserIdBody = Static<
  typeof AdminCreateElectionEligibleVoterByUserIdBody
>

export const AdminCreateElectionEligibleVoterByPhoneNumberBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.PHONE_NUMBER),
  phoneNumber: t.String(),
})
export type AdminCreateElectionEligibleVoterByPhoneNumberBody = Static<
  typeof AdminCreateElectionEligibleVoterByPhoneNumberBody
>

export const AdminCreateElectionEligibleVoterBody = t.Union([
  AdminCreateElectionEligibleVoterByPhoneNumberBody,
  AdminCreateElectionEligibleVoterByUserIdBody,
])

export const AdminCreateElectionEligibleVoterResponse = t.Object({
  message: t.String(),
})
export type AdminCreateElectionEligibleVoterResponse = Static<
  typeof AdminCreateElectionEligibleVoterResponse
>

export const AdminBulkCreateElectionEligibleVoterParams = t.Object({
  electionId: t.String(),
})
export type AdminBulkCreateElectionEligibleVoterParams = Static<
  typeof AdminBulkCreateElectionEligibleVoterParams
>

export const AdminBulkCreateElectionEligibleVoterByUserIdsBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.USER_ID),
  userIds: t.Array(t.String()),
})
export type AdminBulkCreateElectionEligibleVoterByUserIdsBody = Static<
  typeof AdminBulkCreateElectionEligibleVoterByUserIdsBody
>

export const AdminBulkCreateElectionEligibleVoterByPhoneNumbersBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.PHONE_NUMBER),
  phoneNumbers: t.Array(t.String()),
})
export type AdminBulkCreateElectionEligibleVoterByPhoneNumbersBody = Static<
  typeof AdminBulkCreateElectionEligibleVoterByPhoneNumbersBody
>

export const AdminBulkCreateElectionEligibleVoterBody = t.Union([
  AdminBulkCreateElectionEligibleVoterByPhoneNumbersBody,
  AdminBulkCreateElectionEligibleVoterByUserIdsBody,
])

export const AdminBulkCreateElectionEligibleVoterResponse = t.Object({
  message: t.String(),
})
export type AdminBulkCreateElectionEligibleVoterResponse = Static<
  typeof AdminBulkCreateElectionEligibleVoterResponse
>

export const AdminDeleteElectionEligibleVoterByUserIdsBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.USER_ID),
  userIds: t.Array(t.String()),
})
export type AdminDeleteElectionEligibleVoterByUserIdsBody = Static<
  typeof AdminDeleteElectionEligibleVoterByUserIdsBody
>

export const AdminDeleteElectionEligibleVoterByPhoneNumbersBody = t.Object({
  identifier: t.Literal(ElectionEligibleVoterIdentifier.PHONE_NUMBER),
  phoneNumbers: t.Array(t.String()),
})
export type AdminDeleteElectionEligibleVoterByPhoneNumbersBody = Static<
  typeof AdminDeleteElectionEligibleVoterByPhoneNumbersBody
>

export const AdminDeleteElectionEligibleVoterBody = t.Union([
  AdminDeleteElectionEligibleVoterByPhoneNumbersBody,
  AdminDeleteElectionEligibleVoterByUserIdsBody,
])
export type AdminDeleteElectionEligibleVoterBody = Static<
  typeof AdminDeleteElectionEligibleVoterBody
>

export const AdminDeleteElectionEligibleVoterResponse = t.Object({
  message: t.String(),
})
export type AdminDeleteElectionEligibleVoterResponse = Static<
  typeof AdminDeleteElectionEligibleVoterResponse
>

export const AdminUpdateElectionKeysParams = t.Object({
  electionId: t.String(),
})
export type AdminUpdateElectionKeysParams = Static<typeof AdminUpdateElectionKeysParams>

export const AdminUpdateElectionKeysBody = t.Object({
  status: t.Enum(ElectionKeysStatus),
  encryptionPublicKey: t.Optional(t.String()),
  signingPublicKey: t.Optional(t.String()),
})
export type AdminUpdateElectionKeysBody = Static<typeof AdminUpdateElectionKeysBody>

export const AdminUpdateElectionKeysResponse = t.Object({
  message: t.String(),
})
export type AdminUpdateElectionKeysResponse = Static<typeof AdminUpdateElectionKeysResponse>

export const AdminPublishElectionParams = t.Object({
  electionId: t.String(),
})
export type AdminPublishElectionParams = Static<typeof AdminPublishElectionParams>

export const AdminPublishElectionBody = t.Object({
  publishDate: t.Date(),
})
export type AdminPublishElectionBody = Static<typeof AdminPublishElectionBody>

export const AdminPublishElectionResponse = t.Object({
  message: t.String(),
})
export type AdminPublishElectionResponse = Static<typeof AdminPublishElectionResponse>

export const AdminUploadOnsiteResultParams = t.Object({
  electionId: t.String(),
})
export type AdminUploadOnsiteResultParams = Static<typeof AdminUploadOnsiteResultParams>

export const AdminUploadOnsiteResultBody = t.Array(
  t.Object({
    candidateId: t.String(),
    votes: t.Integer({ description: 'Number of votes for the candidate' }),
  })
)
export type AdminUploadOnsiteResultBody = Static<typeof AdminUploadOnsiteResultBody>

export const AdminUploadOnsiteResultResponse = t.Object({
  message: t.String(),
})
export type AdminUploadOnsiteResultResponse = Static<typeof AdminUploadOnsiteResultResponse>

export const AdminUploadOnlineResultParams = t.Object({
  electionId: t.String(),
})
export type AdminUploadOnlineResultParams = Static<typeof AdminUploadOnlineResultParams>

export const AdminUploadOnlineResultBody = t.Object({
  status: t.Enum({
    COUNT_SUCCESS: 'COUNT_SUCCESS',
    COUNT_FAILED: 'COUNT_FAILED',
  }),
  signature: t.Optional(t.String()),
  result: t.Optional(
    t.Array(
      t.Object({
        candidateId: t.String(),
        votes: t.Integer({ description: 'Number of votes for the candidate' }),
      })
    )
  ),
})
export type AdminUploadOnlineResultBody = Static<typeof AdminUploadOnlineResultBody>

export const AdminUploadOnlineResultResponse = t.Object({
  message: t.String(),
})
export type AdminUploadOnlineResultResponse = Static<typeof AdminUploadOnlineResultResponse>

export const AdminCountBallotsParams = t.Object({
  electionId: t.String(),
})
export type AdminCountBallotsParams = Static<typeof AdminCountBallotsParams>

export const AdminCountBallotsResponse = t.Object({
  message: t.String(),
})
export type AdminCountBallotsResponse = Static<typeof AdminCountBallotsResponse>
