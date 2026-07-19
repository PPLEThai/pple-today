import { PrismaService } from '@pple-today/api-common/services'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { PlatformUserLookupRepository } from './user-lookup-repository'

const createPrismaService = () => {
  const user = {
    findUnique: vi.fn().mockResolvedValue(null),
  }

  return { prismaService: { user } as unknown as PrismaService, user }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PlatformUserLookupRepository.findByPhoneNumber', () => {
  test('matches the whole number exactly and reads only the identity fields', async () => {
    const { prismaService, user } = createPrismaService()
    user.findUnique.mockResolvedValue({ id: 'user-sub-1', name: 'สมชาย ใจดี' })
    const repository = new PlatformUserLookupRepository(prismaService)

    const result = await repository.findByPhoneNumber('+66812345678')

    // `findUnique` on the unique column is what makes prefix search structurally
    // impossible here — there is no `contains`/`startsWith` to reach for.
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { phoneNumber: '+66812345678' },
      select: { id: true, name: true },
    })
    expect(result._unsafeUnwrap()).toEqual({ id: 'user-sub-1', name: 'สมชาย ใจดี' })
  })

  test('returns null when no account holds the number', async () => {
    const { prismaService } = createPrismaService()
    const repository = new PlatformUserLookupRepository(prismaService)

    const result = await repository.findByPhoneNumber('+66899999999')

    expect(result._unsafeUnwrap()).toBeNull()
  })

  test('surfaces a database failure as an error rather than a miss', async () => {
    const { prismaService, user } = createPrismaService()
    user.findUnique.mockRejectedValue(new Error('connection lost'))
    const repository = new PlatformUserLookupRepository(prismaService)

    const result = await repository.findByPhoneNumber('+66812345678')

    expect(result.isErr()).toBe(true)
  })
})
