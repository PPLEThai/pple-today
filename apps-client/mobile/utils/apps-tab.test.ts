import { describe, expect, test } from 'vitest'

import {
  type ListedMiniApp,
  MONOGRAM_COLORS,
  monogramColor,
  monogramLetter,
  normalizeSearchText,
  partitionMiniApps,
  pushRecent,
  searchMiniApps,
  selectRecentApps,
  showsDiscoveryTools,
} from './apps-tab'

const app = (overrides: Partial<ListedMiniApp> & { slug: string }): ListedMiniApp => ({
  name: overrides.slug,
  tier: 'LIVE',
  ...overrides,
})

describe('partitionMiniApps', () => {
  test('groups apps by tier', () => {
    const result = partitionMiniApps([
      app({ slug: 'km' }),
      app({ slug: 'mine', tier: 'BETA' }),
      app({ slug: 'invited', tier: 'BETA' }),
      app({ slug: 'draft', tier: 'DRAFT' }),
    ])

    expect(result.live.map((a) => a.slug)).toEqual(['km'])
    expect(result.beta.map((a) => a.slug)).toEqual(['mine', 'invited'])
    expect(result.draft.map((a) => a.slug)).toEqual(['draft'])
  })
})

describe('showsDiscoveryTools', () => {
  test('appears only above 8 Live apps', () => {
    expect(showsDiscoveryTools(8)).toBe(false)
    expect(showsDiscoveryTools(9)).toBe(true)
  })
})

describe('searchMiniApps', () => {
  const apps = [
    app({ slug: 'km', name: 'PPLE Knowledge', tagline: 'ค้นคลังความรู้และเอกสารพรรค' }),
    app({ slug: 'whip', name: 'MP Whip', tagline: null }),
    app({ slug: 'agenda', name: 'วาระจังหวัด' }),
  ]

  test('matches inside Thai text with no word breaks', () => {
    expect(searchMiniApps(apps, 'ความรู้').map((a) => a.slug)).toEqual(['km'])
    expect(searchMiniApps(apps, 'จังหวัด').map((a) => a.slug)).toEqual(['agenda'])
  })

  test('ignores Latin case and surrounding space', () => {
    expect(searchMiniApps(apps, '  whip ').map((a) => a.slug)).toEqual(['whip'])
  })

  test('ignores zero-width characters pasted into the query', () => {
    expect(searchMiniApps(apps, 'วาระ​จังหวัด').map((a) => a.slug)).toEqual(['agenda'])
  })

  test('an empty query matches nothing', () => {
    expect(searchMiniApps(apps, '   ')).toEqual([])
  })
})

describe('normalizeSearchText', () => {
  test('composes decomposed text', () => {
    expect(normalizeSearchText('é')).toBe('é')
  })
})

describe('monogramLetter', () => {
  test('skips leading Thai vowels to the consonant', () => {
    expect(monogramLetter('เลือกตั้ง')).toBe('ล')
    expect(monogramLetter('แจ้งเรื่องร้องเรียน')).toBe('จ')
    expect(monogramLetter('ใบงาน')).toBe('บ')
  })

  test('uppercases a Latin first letter', () => {
    expect(monogramLetter('test 1')).toBe('T')
    expect(monogramLetter('  demo')).toBe('D')
  })

  test('falls back when there is no letter', () => {
    expect(monogramLetter('🙂')).toBe('?')
  })
})

describe('monogramColor', () => {
  test('is stable for a slug and drawn from the palette', () => {
    expect(monogramColor('demo-app')).toBe(monogramColor('demo-app'))
    expect(MONOGRAM_COLORS).toContain(monogramColor('demo-app'))
  })

  test('spreads similar slugs across colours', () => {
    const colors = new Set(['demo-app', 'test-1', 'test-app'].map(monogramColor))
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('recents', () => {
  test('pushRecent moves an app to the front and caps the list', () => {
    expect(pushRecent(['a', 'b', 'c', 'd'], 'c')).toEqual(['c', 'a', 'b', 'd'])
    expect(pushRecent(['a', 'b', 'c', 'd'], 'e')).toEqual(['e', 'a', 'b', 'c'])
  })

  test('selectRecentApps keeps order and drops apps no longer listed', () => {
    const live = [app({ slug: 'a' }), app({ slug: 'b' })]
    expect(selectRecentApps(['b', 'gone', 'a'], live).map((a) => a.slug)).toEqual(['b', 'a'])
  })
})
