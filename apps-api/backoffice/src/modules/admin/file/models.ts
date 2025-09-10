import { FileMimeType, FilePath, ImageFileMimeType } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const UploadFileCategory = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  TOPIC: 'TOPIC',
  PROFILE_IMAGE: 'PROFILE_IMAGE',
  BANNER: 'BANNER',
} as const

export type UploadFileCategory = keyof typeof UploadFileCategory

export const CreateUploadSignedUrlBody = t.Union([
  t.Object({
    category: t.Literal(UploadFileCategory.ANNOUNCEMENT),
    contentType: FileMimeType,
  }),
  t.Object({
    category: t.Literal(UploadFileCategory.TOPIC),
    contentType: ImageFileMimeType,
  }),
  t.Object({
    category: t.Literal(UploadFileCategory.BANNER),
    contentType: ImageFileMimeType,
  }),
  t.Object({
    category: t.Literal(UploadFileCategory.PROFILE_IMAGE),
    contentType: ImageFileMimeType,
    id: t.String({ title: 'Resource id in category' }),
  }),
])
export type CreateUploadSignedUrlBody = Static<typeof CreateUploadSignedUrlBody>

export const CreateUploadSignedUrlResponse = t.Object({
  filePath: FilePath,
  uploadUrl: t.String({ title: 'Upload URL' }),
  uploadFields: t.Record(t.String(), t.String(), {
    description: 'The fields required for the upload',
  }),
})
export type CreateUploadSignedUrlResponse = Static<typeof CreateUploadSignedUrlResponse>
