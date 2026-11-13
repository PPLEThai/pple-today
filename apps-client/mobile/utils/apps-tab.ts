/**
 * Pure rules behind the แอปฯ tab, kept apart from React so they can be tested.
 * See docs/apps-tab-redesign.md for the decisions they encode.
 */

export type MiniAppTier = 'DRAFT' | 'BETA' | 'LIVE'

/** The fields of a `/mini-app` list item these rules read. */
export interface ListedMiniApp {
  slug: string
  name: string
  tier: MiniAppTier
  /** Absent on servers older than the field. */
  tagline?: string | null
}

export interface PartitionedMiniApps<T extends ListedMiniApp> {
  /** The party's apps, listed by role. */
  live: T[]
  /**
   * Beta apps the user can open — their own, ones they help build, or ones they
   * were invited to test. Grouped by tier, not by relation: Beta is a stage of
   * the platform lifecycle (Draft → Beta → Live), whoever the user is to it.
   */
  beta: T[]
  /** Draft apps, which only their builders can see. */
  draft: T[]
}

/** Group apps by Publication Tier. */
export function partitionMiniApps<T extends ListedMiniApp>(apps: T[]): PartitionedMiniApps<T> {
  const result: PartitionedMiniApps<T> = { live: [], beta: [], draft: [] }
  for (const app of apps) {
    if (app.tier === 'LIVE') result.live.push(app)
    else if (app.tier === 'BETA') result.beta.push(app)
    else result.draft.push(app)
  }
  return result
}

/**
 * Search and recents only earn their place when there are more apps than fit at
 * a glance. Counted on the Live list alone so they don't flicker on and off as
 * test apps come and go.
 */
export const DISCOVERY_TOOLS_THRESHOLD = 8

export function showsDiscoveryTools(liveCount: number): boolean {
  return liveCount > DISCOVERY_TOOLS_THRESHOLD
}

// Zero-width space, non-joiner, joiner, and byte-order mark — easy to paste in
// with Thai text and invisible in the field.
const ZERO_WIDTH = /[​-‍﻿]/g

/** Normalise text for matching: NFC, no zero-width marks, lowercased, single spaces. */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFC').replace(ZERO_WIDTH, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Apps whose name or tagline contains the query anywhere. Substring rather than
 * prefix matching, because Thai has no spaces between words: "ความรู้" must find
 * "คลังความรู้". An empty query matches nothing; the caller shows the full list.
 */
export function searchMiniApps<T extends ListedMiniApp>(apps: T[], query: string): T[] {
  const needle = normalizeSearchText(query)
  if (!needle) return []
  return apps.filter((app) =>
    [app.name, app.tagline ?? ''].some((field) => normalizeSearchText(field).includes(needle))
  )
}

const THAI_CONSONANT = /[ก-ฮ]/
const LATIN_OR_DIGIT = /[A-Za-z0-9]/

/**
 * The letter shown on an app that has no icon: its first Thai consonant —
 * skipping leading vowels such as เ แ โ ใ ไ, which would make "เลือกตั้ง" and
 * "แจ้งเรื่อง" look alike — or its first Latin letter or digit, uppercased.
 */
export function monogramLetter(name: string): string {
  for (const char of name) {
    if (THAI_CONSONANT.test(char)) return char
    if (LATIN_OR_DIGIT.test(char)) return char.toUpperCase()
  }
  return '?'
}

/**
 * Backgrounds for letter icons. Dark enough for white text (each clears 4.5:1),
 * and kept away from the saturated reds and blues other parties use, so a
 * generated icon never reads as someone else's brand.
 */
export const MONOGRAM_COLORS = [
  '#0F766E', // teal
  '#4338CA', // indigo
  '#334155', // slate
  '#9A3412', // burnt orange
  '#86198F', // plum
  '#3F6212', // olive
  '#155E75', // deep cyan
  '#78350F', // brown
] as const

/** A stable background for an app's letter icon, picked by its slug. */
export function monogramColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  }
  return MONOGRAM_COLORS[hash % MONOGRAM_COLORS.length]!
}

export const RECENTS_LIMIT = 4

/** Put a just-opened app first, without duplicates, keeping at most `RECENTS_LIMIT`. */
export function pushRecent(recents: string[], slug: string): string[] {
  return [slug, ...recents.filter((entry) => entry !== slug)].slice(0, RECENTS_LIMIT)
}

/**
 * The recent apps to show, in recency order. Only apps still in the Live list
 * survive, so an app that was retired, unlisted, or dropped from this role
 * disappears from recents by itself.
 */
export function selectRecentApps<T extends ListedMiniApp>(recents: string[], live: T[]): T[] {
  const bySlug = new Map(live.map((app) => [app.slug, app]))
  return recents.flatMap((slug) => {
    const app = bySlug.get(slug)
    return app ? [app] : []
  })
}
