import { Static, t } from 'elysia'

export const PublicFilePath = t.TemplateLiteral([t.Literal('public/'), t.String()])
export const PrivateFilePath = t.TemplateLiteral([t.Literal('private/'), t.String()])
export const TemporaryFilePath = t.TemplateLiteral([t.Literal('temp/'), t.String()])
export const FilePath = t.Union([PublicFilePath, PrivateFilePath, TemporaryFilePath])

export type FilePath = Static<typeof FilePath>
export type PublicFilePath = Static<typeof PublicFilePath>
export type PrivateFilePath = Static<typeof PrivateFilePath>
export type TemporaryFilePath = Static<typeof TemporaryFilePath>
