import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FacebookConnectAttemptOutcome, Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import {
  GetFacebookConnectAttemptsQuery,
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
} from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

/**
 * The part of a stored phone number (`+66XXXXXXXXX`) a search means, or null
 * when the search is not a phone number. "081-234-5678" -> "+66812345678",
 * "5678" -> "5678".
 */
export function phoneSearchTerm(search: string) {
  if (!/^[0-9+\s-]+$/.test(search)) return null
  const digits = search.replace(/[^0-9]/g, '')
  if (digits.length < 4) return null
  if (search.trim().startsWith('+')) return `+${digits}`
  if (digits.startsWith('0')) return `+66${digits.slice(1)}`
  return digits
}

export class AdminFacebookPageRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getFacebookPages(query: GetFacebookPagesQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    const where = {
      ...(query.search && {
        name: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.status &&
        query.status.length > 0 && {
          linkedStatus: {
            in: query.status,
          },
        }),
    }

    return fromRepositoryPromise(async () => {
      const [data, count] = await Promise.all([
        this.prismaService.facebookPage.findMany({
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                numberOfFollowers: true,
              },
            },
            linkedStatus: true,
          },
          take: limit,
          skip,
          orderBy: {
            createdAt: 'desc',
          },
          where,
        }),
        this.prismaService.facebookPage.count({
          where,
        }),
      ])

      return {
        items: data.map(({ manager, ...facebookPageData }) => ({
          ...facebookPageData,
          numberOfFollowers: manager?.numberOfFollowers,
        })),
        meta: { count },
      } satisfies GetFacebookPagesResponse
    })
  }

  async getFacebookPageById(facebookPageId: string) {
    return await fromRepositoryPromise(async () => {
      const { manager, ...result } = await this.prismaService.facebookPage.findUniqueOrThrow({
        where: { id: facebookPageId },
        select: {
          id: true,
          name: true,
          manager: {
            select: {
              numberOfFollowers: true,
              id: true,
              name: true,
              profileImagePath: true,
            },
          },
          linkedStatus: true,
          createdAt: true,
        },
      })

      return {
        ...result,
        numberOfFollowers: manager?.numberOfFollowers,
        ...(manager && {
          user: {
            id: manager.id,
            name: manager.name,
            profileImagePath: manager.profileImagePath,
          },
        }),
      } satisfies GetFacebookPageByIdResponse
    })
  }

  async updateFacebookPageById(facebookPageId: string, data: UpdateFacebookPageBody) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: { id: facebookPageId },
        data: {
          name: data.name,
          linkedStatus: data.status,
        },
      })
    )
  }

  async getConnectAttempts(query: GetFacebookConnectAttemptsQuery) {
    const { limit, page } = query
    const search = query.search?.trim()
    const where: Prisma.FacebookConnectAttemptWhereInput = {
      ...(query.userId && { userId: query.userId }),
      ...(query.outcome && query.outcome.length > 0 && { outcome: { in: query.outcome } }),
      ...(search && {
        OR: [
          { referenceCode: search.toUpperCase() },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          ...(phoneSearchTerm(search)
            ? [{ user: { phoneNumber: { contains: phoneSearchTerm(search)! } } }]
            : []),
        ],
      }),
    }

    return fromRepositoryPromise(async () => {
      const [items, count] = await Promise.all([
        this.prismaService.facebookConnectAttempt.findMany({
          where,
          omit: { context: true, steps: true, userId: true },
          include: { user: { select: { id: true, name: true, phoneNumber: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        this.prismaService.facebookConnectAttempt.count({ where }),
      ])
      return { items, meta: { count } }
    })
  }

  async getConnectAttemptById(attemptId: string) {
    return fromRepositoryPromise(
      this.prismaService.facebookConnectAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        omit: { userId: true },
        include: { user: { select: { id: true, name: true, phoneNumber: true } } },
      })
    )
  }

  async getConnectFailureSummary(since: Date) {
    return fromRepositoryPromise(async () => {
      const [outcomes, failures, failureUsers] = await Promise.all([
        this.prismaService.facebookConnectAttempt.groupBy({
          by: ['outcome'],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        this.prismaService.facebookConnectAttempt.groupBy({
          by: ['failedStep', 'platform', 'errorDomain', 'errorCode'],
          where: { createdAt: { gte: since }, outcome: FacebookConnectAttemptOutcome.FAILED },
          _count: { _all: true },
          _max: { createdAt: true, errorMessage: true },
          orderBy: { _count: { id: 'desc' } },
          take: 50,
        }),
        // groupBy cannot count distinct users, so group by user too and fold below
        this.prismaService.facebookConnectAttempt.groupBy({
          by: ['failedStep', 'platform', 'errorDomain', 'errorCode', 'userId'],
          where: { createdAt: { gte: since }, outcome: FacebookConnectAttemptOutcome.FAILED },
        }),
      ])
      return { outcomes, failures, failureUsers }
    })
  }
}

export const AdminFacebookPageRepositoryPlugin = new Elysia({ name: 'AdminFacebookPageRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    facebookPageRepository: new AdminFacebookPageRepository(prismaService),
  }))
