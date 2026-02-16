import {
  ElectionCandidate,
  ElectionInfo,
  FilePath,
  ImageFileMimeType,
} from '@pple-today/api-common/dtos'
import { EligibleVoterType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ElectionWithCurrentStatus = t.Composite([
  ElectionInfo,
  t.Object({
    votePercentage: t.Number(),
    isRegistered: t.Nullable(t.Boolean()),
    isVoted: t.Boolean(),
    isRemindMe: t.Boolean(),
  }),
])
export type ElectionWithCurrentStatus = Static<typeof ElectionWithCurrentStatus>

export const ListElectionQuery = t.Object({
  in: t.Optional(
    t.Enum(
      {
        OFFICIAL: 'OFFICIAL',
        PROFILE: 'PROFILE',
      },
      {
        description: 'The page to list elections for',
        default: 'OFFICIAL',
      }
    )
  ),
})
export type ListElectionQuery = Static<typeof ListElectionQuery>

export const ListElectionResponse = t.Array(ElectionWithCurrentStatus)
export type ListElectionResponse = Static<typeof ListElectionResponse>

export const GetElectionParams = t.Object({
  electionId: t.String(),
})
export type GetElectionParams = Static<typeof GetElectionParams>

export const ElectionCandidateWithVoteScore = t.Composite([
  t.Omit(ElectionCandidate, ['profileImagePath']),
  t.Object({
    voteScorePercent: t.Optional(t.Integer({ description: 'Percentage of vote score' })),
  }),
])
export type ElectionCandidateWithVoteScore = Static<typeof ElectionCandidateWithVoteScore>

export const GetElectionResponse = t.Composite([
  ElectionWithCurrentStatus,
  t.Object({
    candidates: t.Array(ElectionCandidateWithVoteScore),
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

export const CreateFaceImageUploadURLBody = t.Object({
  contentType: ImageFileMimeType,
})
export type CreateFaceImageUploadURLBody = Static<typeof CreateFaceImageUploadURLBody>

export const CreateFaceImageUploadURLResponse = t.Object({
  fileKey: FilePath,
  uploadUrl: t.String({ description: 'The signed URL to upload the file' }),
  uploadFields: t.Record(t.String(), t.String(), {
    description: 'The fields required for the upload',
  }),
})
export type CreateFaceImageUploadURLResponse = Static<typeof CreateFaceImageUploadURLResponse>

export const CreateBallotParams = t.Object({
  electionId: t.String(),
})
export type CreateBallotParams = Static<typeof CreateBallotParams>

export const CreateBallotBody = t.Object({
  faceImagePath: FilePath,
  location: t.String(),
  encryptedBallot: t.String(),
})
export type CreateBallotBody = Static<typeof CreateBallotBody>

export const CreateBallotResponse = t.Object({
  message: t.String(),
})
export type CreateBallotResponse = Static<typeof CreateBallotResponse>

export const CreateElectionNotificationParams = t.Object({
  electionId: t.String(),
})
export type CreateElectionNotificationParams = Static<typeof CreateElectionNotificationParams>

export const CreateElectionNotificationResponse = t.Object({
  message: t.String(),
})
export type CreateElectionNotificationResponse = Static<typeof CreateElectionNotificationResponse>

export const DeleteElectionNotificationParams = t.Object({
  electionId: t.String(),
})
export type DeleteElectionNotificationParams = Static<typeof DeleteElectionNotificationParams>

export const DeleteElectionNotificationResponse = t.Object({
  message: t.String(),
})
export type DeleteElectionNotificationResponse = Static<typeof DeleteElectionNotificationResponse>
