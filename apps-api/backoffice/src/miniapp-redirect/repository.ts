import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PrismaServicePlugin } from '../plugins/prisma'

export class MiniAppRedirectRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Resolve the first path segment of a Today Link. A slug matches exactly, as
   * it always has. Anything else is a Link Name, stored lowercase, canonical or
   * replaced. A name whose app has been retired does not resolve: retire deletes
   * the rows, and a leftover row on a retired app is treated as gone too.
   */
  async getMiniAppByEntry(entry: string) {
    const bySlug = await fromRepositoryPromise(
      this.prismaService.miniApp.findUnique({
        where: { slug: entry },
        select: {
          clientUrl: true,
        },
      })
    )
    if (bySlug.isErr()) return bySlug
    if (bySlug.value) return ok(bySlug.value)

    const byName = await fromRepositoryPromise(
      this.prismaService.miniAppLinkName.findUnique({
        where: { name: entry.toLowerCase() },
        select: {
          miniApp: { select: { clientUrl: true, retiredAt: true } },
        },
      })
    )
    if (byName.isErr()) return byName
    if (!byName.value || byName.value.miniApp.retiredAt) return ok(null)

    return ok({ clientUrl: byName.value.miniApp.clientUrl })
  }
}

export const MiniAppRedirectRepositoryPlugin = new Elysia({ name: 'MiniAppRedirectRepository' })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    miniAppRedirectRepository: new MiniAppRedirectRepository(prismaService),
  }))
