import {
  ElectionCandidate,
  ElectionInfo,
  ElectionStatus,
  FilePath,
  ImageFileMimeType,
} from '@pple-today/api-common/dtos'
import { EligibleVoterType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ElectionWithCurrentStatus = t.Intersect([
  ElectionInfo,
  t.Object({
    status: ElectionStatus,
    votePercentage: t.Number(),
    isRegistered: t.Nullable(t.Boolean()),
    isVoted: t.Boolean(),
  }),
])
export type ElectionWithCurrentStatus = Static<typeof ElectionWithCurrentStatus>

export const ListElectionResponse = t.Array(ElectionWithCurrentStatus)
export type ListElectionResponse = Static<typeof ListElectionResponse>

export const GetElectionParams = t.Object({
  electionId: t.String(),
})
export type GetElectionParams = Static<typeof GetElectionParams>

export const ElectionCandidateWithVoteScore = t.Composite([
  ElectionCandidate,
  t.Object({
    voteScorePercent: t.Nullable(t.Integer({ description: 'Percentage of vote score' })),
  }),
])
export type ElectionCandidateWithVoteScore = Static<typeof ElectionCandidateWithVoteScore>

export const GetElectionResponse = t.Intersect([
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
