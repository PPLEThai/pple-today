import { Static, t } from 'elysia'

export const UploadFileCategory = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  TOPIC: 'TOPIC',
  PROFILE_IMAGE: 'PROFILE_IMAGE',
} as const

export type UploadFileCategory = keyof typeof UploadFileCategory

export const GetUploadSignedUrlBody = t.Union([
  t.Object({
    category: t.Literal(UploadFileCategory.ANNOUNCEMENT),
  }),
  t.Object({
    category: t.Literal(UploadFileCategory.TOPIC),
  }),
  t.Object({
    category: t.Literal(UploadFileCategory.PROFILE_IMAGE),
    id: t.String({ title: 'Resource id in category' }),
  }),
])
export type GetUploadSignedUrlBody = Static<typeof GetUploadSignedUrlBody>

export const GetUploadSignedUrlResponse = t.Object({
  filePath: t.String({ title: 'File Path' }),
  uploadUrl: t.String({ title: 'Upload URL' }),
  uploadFields: t.Record(t.String(), t.String(), {
    description: 'The fields required for the upload',
  }),
})
export type GetUploadSignedUrlResponse = Static<typeof GetUploadSignedUrlResponse>
