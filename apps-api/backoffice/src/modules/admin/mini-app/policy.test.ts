import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { isOrderEditable, isPlatformManaged } from './policy'

describe('isPlatformManaged', () => {
  test('is true for apps provisioned by the platform', () => {
    expect(isPlatformManaged(MiniAppSource.PLATFORM)).toBe(true)
  })

  test('is false for apps managed manually by an admin (existing behavior)', () => {
    expect(isPlatformManaged(MiniAppSource.ADMIN)).toBe(false)
  })
})

describe('isOrderEditable', () => {
  const app = (overrides: Partial<Parameters<typeof isOrderEditable>[0]> = {}) => ({
    source: MiniAppSource.PLATFORM,
    tier: MiniAppTier.LIVE,
    unlisted: false,
    retiredAt: null,
    ...overrides,
  })

  test('a Live, listed platform app may be ordered', () => {
    expect(isOrderEditable(app())).toBe(true)
  })

  test('an unlisted Live platform app may not — it is listed to no one', () => {
    expect(isOrderEditable(app({ unlisted: true }))).toBe(false)
  })

  test.each([MiniAppTier.DRAFT, MiniAppTier.BETA])(
    'a %s platform app may not — it is not on the public list yet',
    (tier) => {
      expect(isOrderEditable(app({ tier }))).toBe(false)
    }
  )

  test('a retired app may not, whatever its source', () => {
    expect(isOrderEditable(app({ retiredAt: new Date() }))).toBe(false)
    expect(isOrderEditable(app({ source: MiniAppSource.ADMIN, retiredAt: new Date() }))).toBe(false)
  })

  test('an admin app may always be ordered, whatever its tier', () => {
    expect(isOrderEditable(app({ source: MiniAppSource.ADMIN, tier: MiniAppTier.DRAFT }))).toBe(
      true
    )
  })
})
