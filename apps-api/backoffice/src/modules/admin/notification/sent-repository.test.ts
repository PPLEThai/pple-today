import type { PrismaService } from '@pple-today/api-common/services'
import { describe, expect, test, vi } from 'vitest'

import { AdminSentNotificationRepository } from './sent-repository'

import { canonicalLinkNameSelect } from '../../mini-app/link-name'

describe('AdminSentNotificationRepository.findMiniAppSlug', () => {
  const repositoryFor = (row: unknown) => {
    const findFirst = vi.fn().mockResolvedValue(row)
    const prisma = { miniApp: { findFirst } } as unknown as PrismaService
    return {
      findFirst,
      repository: new AdminSentNotificationRepository(prisma, {} as never),
    }
  }

  test('loads the slug and the canonical Link Name in one query', async () => {
    const { findFirst, repository } = repositoryFor({
      slug: 'brave-purple-lion',
      linkNames: [{ name: 'donate' }],
    })

    const result = await repository.findMiniAppSlug('app-1')

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'app-1', retiredAt: null },
      select: { slug: true, linkNames: canonicalLinkNameSelect },
    })
    expect(result._unsafeUnwrap()).toEqual({ slug: 'brave-purple-lion', linkName: 'donate' })
  })

  test('an app with no Link Name returns a null name beside the slug', async () => {
    const { repository } = repositoryFor({ slug: 'volunteer', linkNames: [] })

    expect((await repository.findMiniAppSlug('app-1'))._unsafeUnwrap()).toEqual({
      slug: 'volunteer',
      linkName: null,
    })
  })

  test('an unknown or retired app is null', async () => {
    const { repository } = repositoryFor(null)

    expect((await repository.findMiniAppSlug('gone'))._unsafeUnwrap()).toBeNull()
  })
})
