import { InternalErrorCode } from '@pple-today/api-common/dtos'

/** Longest Link Name the platform may set. A path segment, not a sentence. */
export const LINK_NAME_MAX_LENGTH = 100

export const LINK_NAME_INVALID = {
  code: InternalErrorCode.MINI_APP_INVALID_INPUT,
  message: `Link Name must be one path segment, at most ${LINK_NAME_MAX_LENGTH} characters, with no spaces or / ? # %`,
} as const

export const LINK_NAME_CLASHES_WITH_SLUG = {
  code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
  message: 'Link Name clashes with a mini-app slug',
} as const

export const LINK_NAME_ALREADY_HELD = {
  code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
  message: 'Link Name is already held',
} as const

export const SLUG_CLASHES_WITH_LINK_NAME = {
  code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
  message: 'Slug clashes with a held Link Name',
} as const

/**
 * The one canonical Link Name, read in the same query as the slug. Replaced
 * names stay out: a send uses the name the app holds now.
 */
export const canonicalLinkNameSelect = {
  where: { canonicalForId: { not: null } },
  select: { name: true },
  take: 1,
} as const

export const readCanonicalLinkName = (linkNames: readonly { name: string }[] | null | undefined) =>
  linkNames?.[0]?.name ?? null

/**
 * The entry a new Today Link is built from. A canonical Link Name when the app
 * holds one; otherwise the slug, which is what every link used before names.
 */
export const todayLinkEntry = (slug: string, linkName: string | null | undefined) =>
  linkName && linkName.length > 0 ? linkName : slug

const UNSAFE_IN_PATH_SEGMENT = /[\s/?#\\%]/

function hasAsciiControl(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

/**
 * The stored form of a Link Name: trimmed and lowercased, or null when the
 * value cannot be a single Today Link path segment. The redirect host matches
 * this form, so `Donate` and `donate` are the same name.
 */
export function normalizeLinkName(input: string): string | null {
  const name = input.trim().toLowerCase()
  if (name.length === 0 || name.length > LINK_NAME_MAX_LENGTH) return null
  if (name === '.' || name === '..') return null
  if (UNSAFE_IN_PATH_SEGMENT.test(name) || hasAsciiControl(name)) return null
  return name
}

/**
 * The application checks a clash before writing. The migration's triggers are
 * the backstop for a race, and they raise a unique violation whose message
 * says "link name" or, as Prisma's P2002 reports it, names the
 * `MiniAppLinkName_name_not_slug` / `MiniApp_slug_not_link_name` constraint.
 * That text is how a constraint failure stays
 * `MINI_APP_LINK_NAME_TAKEN` instead of a slug/slug clash.
 */
export function linkNameTakenError(error: { code: string; message?: string }): {
  code: typeof InternalErrorCode.MINI_APP_LINK_NAME_TAKEN
  message: string
} | null {
  if (error.code === InternalErrorCode.MINI_APP_LINK_NAME_TAKEN) {
    return {
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: error.message ?? LINK_NAME_ALREADY_HELD.message,
    }
  }

  if (error.code === 'UNIQUE_CONSTRAINT_FAILED' && /link[\s_]?name/i.test(error.message ?? '')) {
    return {
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: LINK_NAME_ALREADY_HELD.message,
    }
  }

  return null
}
