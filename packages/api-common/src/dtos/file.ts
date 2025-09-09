import { Static, t } from 'elysia'

export const PublicFilePath = t.TemplateLiteral([t.Literal('public/'), t.String()])
export const PrivateFilePath = t.TemplateLiteral([t.Literal('private/'), t.String()])
export const TemporaryFilePath = t.TemplateLiteral([t.Literal('temp/'), t.String()])
export const FilePath = t.Union([PublicFilePath, PrivateFilePath, TemporaryFilePath])

export type FilePath = Static<typeof FilePath>
export type PublicFilePath = Static<typeof PublicFilePath>
export type PrivateFilePath = Static<typeof PrivateFilePath>
export type TemporaryFilePath = Static<typeof TemporaryFilePath>

export const ImageFileMimeType = t.Union([
  t.Literal('image/jpeg'),
  t.Literal('image/png'),
  t.Literal('image/webp'),
])
export type ImageFileMimeType = Static<typeof ImageFileMimeType>

export const AttachmentFileMimeType = t.Union([
  t.Literal('application/pdf'),
  t.Literal('application/msword'),
  t.Literal('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  t.Literal('application/vnd.ms-excel'),
  t.Literal('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
  t.Literal('application/vnd.ms-powerpoint'),
  t.Literal('application/vnd.openxmlformats-officedocument.presentationml.presentation'),
])
export type AttachmentFileMimeType = Static<typeof AttachmentFileMimeType>

export const FileMimeType = t.Union([ImageFileMimeType, AttachmentFileMimeType])
export type FileMimeType = Static<typeof FileMimeType>
