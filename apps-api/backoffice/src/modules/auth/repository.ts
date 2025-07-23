import node from '@elysiajs/node'
import Elysia from 'elysia'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import prismaService from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export const AuthRepository = new Elysia({ name: 'AuthRepository', adapter: node() })
  .use(prismaService)
  .decorate(({ prisma }) => ({
    authRepository: {
      async getUserById(id: string) {
        const user = await fromPrismaPromise(
          prisma.user.findUniqueOrThrow({
            where: { id },
          })
        )

        return user
      },

      async createUser(data: IntrospectAccessTokenResult) {
        const { sub, name, phone_number } = data

        const user = await fromPrismaPromise(
          prisma.user.create({
            data: {
              id: sub,
              name,
              phoneNumber: phone_number,
            },
          })
        )

        return user
      },
    },
  }))
  .as('scoped')
