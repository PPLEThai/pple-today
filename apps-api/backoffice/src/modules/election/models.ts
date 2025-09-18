import {
  ElectionCandidate,
  ElectionInfo,
  FilePath,
  ImageFileMimeType,
} from '@pple-today/api-common/dtos'
import { EligibleVoterType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ListElectionResponse = t.Array(ElectionInfo)
export type ListElectionResponse = Static<typeof ListElectionResponse>

export const GetElectionParams = t.Object({
  electionId: t.String(),
})
export type GetElectionParams = Static<typeof GetElectionParams>

export const GetElectionResponse = t.Intersect([
  ElectionInfo,
  t.Object({
    candidates: t.Array(ElectionCandidate),
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
