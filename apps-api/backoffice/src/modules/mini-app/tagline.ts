import { t } from 'elysia'

/** The longest tagline a form may save: one line under the app's name. */
export const TAGLINE_MAX_LENGTH = 60

/** A tagline as a create/update body accepts it. */
export const TaglineInput = t.String({
  maxLength: TAGLINE_MAX_LENGTH,
  description:
    'One verb-first line saying what the app does (e.g. "ค้นคลังความรู้และเอกสารพรรค"), at most 60 characters. Blank clears it.',
})

/**
 * Normalise a tagline for storage: trimmed, and blank stored as null so "no
 * tagline" has one representation. `undefined` passes through so an update
 * that does not mention the field leaves it untouched.
 */
export function normalizeTagline(tagline: string | null | undefined): string | null | undefined {
  if (tagline === undefined) return undefined
  if (tagline === null) return null
  const trimmed = tagline.trim()
  return trimmed === '' ? null : trimmed
}
