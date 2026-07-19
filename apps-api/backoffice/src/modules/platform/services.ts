import Elysia from 'elysia'

import { PlatformMiniAppRepository } from './mini-app-repository'
import { PlatformMiniAppService } from './mini-app-service'
import { PlatformUserLookupRepository } from './user-lookup-repository'
import { PlatformUserLookupService } from './user-lookup-service'

import { MiniAppListCachePlugin } from '../../plugins/mini-app-cache'
import { PrismaServicePlugin } from '../../plugins/prisma'
import { ZitadelServicePlugin } from '../admin/zitadel/services'

export const PlatformMiniAppRepositoryPlugin = new Elysia({
  name: 'PlatformMiniAppRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    platformMiniAppRepository: new PlatformMiniAppRepository(prismaService),
  }))

export const PlatformMiniAppServicePlugin = new Elysia({
  name: 'PlatformMiniAppService',
})
  .use([PlatformMiniAppRepositoryPlugin, ZitadelServicePlugin, MiniAppListCachePlugin])
  .decorate(({ platformMiniAppRepository, zitadelService, miniAppListCache }) => ({
    platformMiniAppService: new PlatformMiniAppService(
      platformMiniAppRepository,
      zitadelService,
      miniAppListCache
    ),
  }))

export const PlatformUserLookupRepositoryPlugin = new Elysia({
  name: 'PlatformUserLookupRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    platformUserLookupRepository: new PlatformUserLookupRepository(prismaService),
  }))

export const PlatformUserLookupServicePlugin = new Elysia({
  name: 'PlatformUserLookupService',
})
  .use([PlatformUserLookupRepositoryPlugin])
  .decorate(({ platformUserLookupRepository }) => ({
    platformUserLookupService: new PlatformUserLookupService(platformUserLookupRepository),
  }))
