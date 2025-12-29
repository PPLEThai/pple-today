import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { PrismaClient } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class CommonRepository {
  private OFFICIAL_USER_ID: string = ''

  constructor(private readonly prismaService: PrismaClient) {}

  async lookupOfficialUserId() {
    if (this.OFFICIAL_USER_ID) {
      return ok(this.OFFICIAL_USER_ID)
    }

    const findOfficialResult = await fromRepositoryPromise(
      this.prismaService.userRole.findFirst({
        where: { role: 'official' },
        select: { user: { select: { id: true } } },
      })
    )

    if (findOfficialResult.isErr()) {
      return err(findOfficialResult.error)
    }

    if (!findOfficialResult.value) {
      return err({
        message: 'Official user not found',
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      })
    }

    this.OFFICIAL_USER_ID = findOfficialResult.value.user.id
    return ok(this.OFFICIAL_USER_ID)
  }
}

export const CommonRepositoryPlugin = new Elysia({ name: 'CommonRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    commonRepository: new CommonRepository(prismaService),
  }))
