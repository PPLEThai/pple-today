import { t } from 'elysia'

export enum UploadFileCategory {
  ANNOUNCEMENT,
  TOPIC,
  PROFILE_IMAGE,
}

export const GetUploadSignedUrlBody = t.Object({
  category: t.Enum(UploadFileCategory),
  id: t.String({ title: 'Resource id in category' }),
})
export const GetUploadSignedUrlResponse = t.Object({
  filePath: t.String({ title: 'File Path' }),
  uploadUrl: t.String({ title: 'Upload URL' }),
})
