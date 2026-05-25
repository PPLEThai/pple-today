import node from '@elysiajs/node'
import { loggerBuilder, RequestIdPlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'

import { buildMiniAppRedirectUrl, parseMiniAppRequestPath } from './build-url'
import {
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  isDeepLinkAssociationConfigured,
  parseSha256CertFingerprints,
} from './deeplink-association'
import { MiniAppRedirectRepositoryPlugin } from './repository'

import packageJson from '../../package.json'
import { ConfigServicePlugin } from '../plugins/config'

const configService = ConfigServicePlugin.decorator.configService

export const MiniAppRedirectController = new Elysia({ tags: ['Mini App Redirect'] })
  .use([ConfigServicePlugin, MiniAppRedirectRepositoryPlugin])
  .get('/healthz', ({ status }) =>
    status(200, {
      name: packageJson.name,
      service: 'miniapp-redirect',
      version: packageJson.version,
      timestamp: new Date().toISOString(),
    })
  )
  .get('/.well-known/apple-app-site-association', ({ configService, set, status }) => {
    const associationConfig = {
      iosTeamId: configService.get('MINIAPP_IOS_TEAM_ID'),
      iosBundleId: configService.get('MINIAPP_IOS_BUNDLE_ID'),
      androidPackageName: configService.get('MINIAPP_ANDROID_PACKAGE_NAME'),
      androidSha256CertFingerprints: parseSha256CertFingerprints(
        configService.get('MINIAPP_ANDROID_SHA256_CERT_FINGERPRINTS')
      ),
    }

    if (!isDeepLinkAssociationConfigured(associationConfig)) {
      return status(404, 'Deep link association is not configured')
    }

    set.headers['content-type'] = 'application/json'

    return buildAppleAppSiteAssociation(associationConfig)
  })
  .get('/.well-known/assetlinks.json', ({ configService, set, status }) => {
    const associationConfig = {
      iosTeamId: configService.get('MINIAPP_IOS_TEAM_ID'),
      iosBundleId: configService.get('MINIAPP_IOS_BUNDLE_ID'),
      androidPackageName: configService.get('MINIAPP_ANDROID_PACKAGE_NAME'),
      androidSha256CertFingerprints: parseSha256CertFingerprints(
        configService.get('MINIAPP_ANDROID_SHA256_CERT_FINGERPRINTS')
      ),
    }

    if (!isDeepLinkAssociationConfigured(associationConfig)) {
      return status(404, 'Deep link association is not configured')
    }

    set.headers['content-type'] = 'application/json'

    return buildAssetLinks(associationConfig)
  })
  .all('/*', async ({ request, set, status, miniAppRedirectRepository }) => {
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
  })

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
          ignore: (ctx) => ctx.path.startsWith('/healthz') || ctx.path.startsWith('/.well-known/'),
        },
      }),
      RequestIdPlugin,
      ConfigServicePlugin,
    ])
    .use(MiniAppRedirectController)
}
