import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  get_count_member_by_province,
  get_count_user_by_province,
} from '@pple-today/database/prisma/sql'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import Elysia from 'elysia'
import * as R from 'remeda'

dayjs.extend(utc)
dayjs.extend(timezone)

import { FeedItemReactionType } from '@pple-today/database/prisma'

import { GetDashboardInfoResponse } from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

const MEMBER_ROLES = ['pple-member:membership_permanant', 'pple-member:membership_yearly']

export class AdminDashboardRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getDashboardInfo() {
    const yesterdayAtMidnight = dayjs()
      .tz('Asia/Bangkok')
      .subtract(1, 'day')
      .startOf('day')
      .toDate()
    const todayAtMidnight = dayjs().tz('Asia/Bangkok').startOf('day').toDate()

    const getUserStats = async (roles?: string[]) => {
      const [today, yesterday, previousYesterday] = await Promise.all([
        this.prismaService.user.count({
          where: {
            ...(roles && { roles: { some: { role: { in: roles } } } }),
            createdAt: {
              gte: todayAtMidnight,
            },
          },
        }),
        this.prismaService.user.count({
          where: {
            ...(roles && { roles: { some: { role: { in: roles } } } }),
            createdAt: {
              lt: todayAtMidnight,
              gte: yesterdayAtMidnight,
            },
          },
        }),
        this.prismaService.user.count({
          where: {
            ...(roles && { roles: { some: { role: { in: roles } } } }),
            createdAt: {
              lt: yesterdayAtMidnight,
            },
          },
        }),
      ])

      return { today, yesterday, previousYesterday }
    }

    const getPostStats = async () => {
      const [today, yesterday] = await Promise.all([
        this.prismaService.post.count({
          where: {
            feedItem: {
              createdAt: {
                gte: todayAtMidnight,
              },
            },
          },
        }),
        this.prismaService.post.count({
          where: {
            feedItem: {
              createdAt: {
                lt: todayAtMidnight,
                gte: yesterdayAtMidnight,
              },
            },
          },
        }),
      ])

      return { today, yesterday }
    }

    const getCommentStats = async () => {
      const [today, yesterday] = await Promise.all([
        this.prismaService.feedItemComment.count({
          where: {
            createdAt: {
              gte: todayAtMidnight,
            },
          },
        }),
        this.prismaService.feedItemComment.count({
          where: {
            createdAt: {
              lt: todayAtMidnight,
              gte: yesterdayAtMidnight,
            },
          },
        }),
      ])

      return { today, yesterday }
    }

    const getLinkStats = async () => {
      const [today, yesterday] = await Promise.all([
        this.prismaService.feedItemReaction.count({
          where: {
            type: FeedItemReactionType.UP_VOTE,
            createdAt: {
              gte: todayAtMidnight,
            },
          },
        }),
        this.prismaService.feedItemReaction.count({
          where: {
            type: FeedItemReactionType.UP_VOTE,
            createdAt: {
              lt: todayAtMidnight,
              gte: yesterdayAtMidnight,
            },
          },
        }),
      ])

      return { today, yesterday }
    }

    const getUserPerProvince = async () => {
      const userCountByProvince = await this.prismaService.$queryRawTyped(
        get_count_user_by_province()
      )

      return R.pipe(
        userCountByProvince,
        R.filter((item) => item.province !== null && item.count !== null),
        R.map((item) => [item.province!, Number(item.count!)] as const),
        R.fromEntries()
      ) satisfies Record<string, number>
    }

    const getMemberPerProvince = async () => {
      const userCountByProvince = await this.prismaService.$queryRawTyped(
        get_count_member_by_province(MEMBER_ROLES)
      )

      return R.pipe(
        userCountByProvince,
        R.filter((item) => item.province !== null && item.count !== null),
        R.map((item) => [item.province!, Number(item.count!)] as const),
        R.fromEntries()
      ) satisfies Record<string, number>
    }

    return fromRepositoryPromise(async () => {
      const [users, members, posts, comments, likes, userPerProvince, memberPerProvince] =
        await Promise.all([
          getUserStats(),
          getUserStats(MEMBER_ROLES),
          getPostStats(),
          getCommentStats(),
          getLinkStats(),
          getUserPerProvince(),
          getMemberPerProvince(),
        ])

      return {
        users,
        members,
        posts,
        comments,
        likes,
        userPerProvince,
        memberPerProvince,
      } satisfies GetDashboardInfoResponse
    })
  }
}

export const AdminDashboardRepositoryPlugin = new Elysia({
  name: 'AdminDashboardRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminDashboardRepository: new AdminDashboardRepository(prismaService),
  }))
