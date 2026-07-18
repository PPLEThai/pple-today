import { MiniAppSource } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { isPlatformManaged } from './policy'

describe('isPlatformManaged', () => {
  test('is true for apps provisioned by the platform', () => {
    expect(isPlatformManaged(MiniAppSource.PLATFORM)).toBe(true)
  })

  test('is false for apps managed manually by an admin (existing behavior)', () => {
    expect(isPlatformManaged(MiniAppSource.ADMIN)).toBe(false)
  })
})
