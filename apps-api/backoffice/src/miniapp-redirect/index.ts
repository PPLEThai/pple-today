import node from '@elysiajs/node'
import { loggerBuilder, RequestIdPlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'

import { ConfigServicePlugin } from '../plugins/config'
import { buildMiniAppRedirectUrl, parseMiniAppRequestPath } from './build-url'
import { MiniAppRedirectRepositoryPlugin } from './repository'

import packageJson from '../../package.json'

const configService = ConfigServicePlugin.decorator.configService

export const MiniAppRedirectController = new Elysia({ tags: ['Mini App Redirect'] })
  .use([MiniAppRedirectRepositoryPlugin])
  .get(
    '/healthz',
    ({ status }) =>
      status(200, {
        name: packageJson.name,
        service: 'miniapp-redirect',
        version: packageJson.version,
        timestamp: new Date().toISOString(),
      })
  )
  .all(
    '/*',
    async ({ request, set, status, miniAppRedirectRepository }) => {
      const requestUrl = new URL(request.url)
      const parsedPath = parseMiniAppRequestPath(requestUrl.pathname)

      if (!parsedPath) {
        return status(404, 'Not Found')
      }

      const miniApp = await miniAppRedirectRepository.getMiniAppBySlug(parsedPath.slug)

      if (miniApp.isErr() || !miniApp.value) {
        return status(404, 'Not Found')
      }

      const location = buildMiniAppRedirectUrl(
        miniApp.value.clientUrl,
        parsedPath.appPath,
        requestUrl.search,
        requestUrl.hash
      )

      set.headers.location = location
      set.status = 301

      return
    }
  )

export function createMiniAppRedirectApp() {
  return new Elysia({ adapter: node() })
    .use([
      loggerBuilder({
        name: 'Mini App Redirect Logger',
        transport:
          configService.get('APP_ENV') === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,
      }).into({
        autoLogging: {
          ignore: (ctx) => ctx.path.startsWith('/healthz'),
        },
      }),
      RequestIdPlugin,
      ConfigServicePlugin,
    ])
    .use(MiniAppRedirectController)
}
