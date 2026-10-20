import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import { MiniAppTier, Prisma } from '@pple-today/database/prisma'
import { Check } from '@sinclair/typebox/value'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { pickMiniAppForPage } from './mini-app-page-match'
import { buildMiniAppSessionUrl } from './mini-app-session-url'
import { GenerateMiniAppTokenErrorResponse, GenerateMiniAppTokenResponse } from './models'
import { AuthRepository, AuthRepositoryPlugin } from './repository'

import { ALLOWED_ROLES } from '../../constants/roles'
import { ConfigServicePlugin } from '../../plugins/config'
import { ElysiaLoggerPlugin } from '../../plugins/log'
import { generateJwtToken } from '../../utils/jwt'
import { FileServerService, FileServerServicePlugin } from '../files/services'
import { resolveMiniAppAccess } from '../mini-app/eligibility'
import { MiniAppInviteRepository } from '../mini-app/invite-repository'
import {
  MiniAppInviteRepositoryPlugin,
  MiniAppRepository,
  MiniAppRepositoryPlugin,
} from '../mini-app/repository'

type MiniAppWithRoles = Prisma.MiniAppGetPayload<{ include: { miniAppRoles: true } }>

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly miniAppRepository: MiniAppRepository,
    private readonly miniAppInviteRepository: MiniAppInviteRepository,
    private readonly fileServerService: FileServerService,
    private readonly loggerService: ElysiaLoggerInstance,
    private readonly oidcConfig: {
      oidcClientId: string
      oidcUrl: string
      oidcPrivateJwtKey: string
      oidcKeyId: string
    }
  ) {}

  /**
   * Exchange the caller's token for a mini-app session URL.
   *
   * Access is `resolveMiniAppAccess`: Draft/Beta = builders (Owner or a
   * Collaborator), Beta also an ACCEPTED invitee, Live = role filter (empty =
   * public) unless `unlisted`, which is reachable by any authenticated member.
   * This is *access*, not listing — an unlisted Live app opens by link though it
   * is listed to no one. Hard denials return `MINI_APP_NOT_FOUND` — same as a
   * missing slug — so App User registration in the controller only runs after a
   * successful exchange.
   *
   * A Live app whose role list does not cover the caller is the one soft denial:
   * it returns `MINI_APP_ROLE_NOT_ELIGIBLE` carrying the app's name and roles,
   * so the client can offer to switch role or to open it anyway. Opening anyway
   * comes back with `acknowledgeRoleMismatch`, which waives *only* that check —
   * the mini app still authenticates and authorises the session itself.
   *
   * @param userSub The caller's PPLE ID `sub` (local user id).
   */
  async generateMiniAppToken(
    slug: string,
    token: string,
    roles: string[],
    userSub: string,
    options: { path?: string; acknowledgeRoleMismatch?: boolean } = {}
  ) {
    const miniApp = await this.miniAppRepository.getMiniAppBySlug(slug)

    if (miniApp.isErr()) {
      return mapRepositoryError(miniApp.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app not found',
        },
      })
    }

    const access = await this.checkMiniAppAccess(miniApp.value, roles, userSub, options)

    if (access.isErr()) return err(access.error)

    return await this.exchangeMiniAppToken(miniApp.value, token, options.path)
  }

  /**
   * The session bridge's exchange: a page inside the WebView asks for a session
   * naming its OIDC `clientId`, and the host forwards the WebView's own page URL.
   *
   * The app is the one registered under that client id **at the page's
   * origin** (`pickMiniAppForPage`) — so a page can only ever get a session for
   * an app hosted where it runs, whatever client id it claims. Access rules are
   * the slug exchange's, unchanged.
   *
   * An app that does not require authentication resolves with `session: null`:
   * the host still learns which app is on screen, but no token is handed to a
   * public app.
   */
  async generateMiniAppTokenForPage(
    clientId: string,
    pageUrl: string,
    token: string,
    roles: string[],
    userSub: string,
    options: { acknowledgeRoleMismatch?: boolean } = {}
  ) {
    const candidates = await this.miniAppRepository.listMiniAppsByClientId(clientId)

    if (candidates.isErr()) return mapRepositoryError(candidates.error)

    const miniApp = pickMiniAppForPage(candidates.value, pageUrl)

    if (!miniApp) {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: 'Mini app not found',
      })
    }

    if (!miniApp.requiresAuth) {
      const access = await this.checkMiniAppAccess(miniApp, roles, userSub, {
        acknowledgeRoleMismatch: true,
      })

      if (access.isErr()) return err(access.error)

      return ok({ ...this.describeMiniApp(miniApp), session: null })
    }

    const access = await this.checkMiniAppAccess(miniApp, roles, userSub, options)

    if (access.isErr()) return err(access.error)

    return await this.exchangeMiniAppToken(miniApp, token)
  }

  private async checkMiniAppAccess(
    miniApp: MiniAppWithRoles,
    roles: string[],
    userSub: string,
    { acknowledgeRoleMismatch = false }: { acknowledgeRoleMismatch?: boolean }
  ) {
    // Accepted invites are the only per-user fact not on the mini-app row, and
    // they only matter for Beta — same short-circuit as listing.
    let acceptedInviteMiniAppIds: ReadonlySet<string> = new Set()
    if (miniApp.tier === MiniAppTier.BETA) {
      const invites = await this.miniAppInviteRepository.listAcceptedMiniAppIds(userSub)

      if (invites.isErr()) {
        return mapRepositoryError(invites.error)
      }

      acceptedInviteMiniAppIds = invites.value
    }

    const access = resolveMiniAppAccess(miniApp, {
      roles,
      sub: userSub,
      acceptedInviteMiniAppIds,
    })

    if (access === 'DENIED') {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: 'Mini app not found',
      })
    }

    if (access === 'ROLE_MISMATCH' && !acknowledgeRoleMismatch) {
      return err({
        code: InternalErrorCode.MINI_APP_ROLE_NOT_ELIGIBLE,
        message: 'Your active role is not listed for this mini app',
        data: {
          appName: miniApp.name,
          requiredRoles: miniApp.miniAppRoles.map((miniAppRole) => miniAppRole.role),
        },
      })
    }

    return ok()
  }

  private describeMiniApp(miniApp: MiniAppWithRoles) {
    return {
      appName: miniApp.name,
      // Surfaced so the caller can register the App User on this first-open path.
      miniAppId: miniApp.id,
      slug: miniApp.slug,
      clientId: miniApp.clientId,
      baseUrl: miniApp.clientUrl,
    }
  }

  private async exchangeMiniAppToken(miniApp: MiniAppWithRoles, token: string, path?: string) {
    const jwtToken = generateJwtToken(this.oidcConfig)

    const httpHeaders = { 'Content-Type': 'application/json' }
    const data = {
      token,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwtToken,
    }

    const response = await fetch(`${this.oidcConfig.oidcUrl}/mini-app/${miniApp.clientId}`, {
      method: 'POST',
      headers: httpHeaders,
      body: JSON.stringify(data),
    })

    const body = await response.json()
    if (!response.ok) {
      const checkResult = Check(GenerateMiniAppTokenErrorResponse, body)
      const errorMessage = checkResult
        ? body.error
        : 'An error occurred while generating the mini app token'

      this.loggerService.error({
        error: body,
        message: `Invalid mini app token error response for clientId ${miniApp.clientId}`,
      })

      return mapRepositoryError({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      })
    }

    const miniAppToken = Check(GenerateMiniAppTokenResponse, body)

    if (!miniAppToken) {
      this.loggerService.error({
        message: `Invalid mini app token response for clientId ${miniApp.clientId}`,
      })
      return mapRepositoryError({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while generating the mini app token',
      })
    }

    const session = {
      accessToken: body.access_token,
      expiresIn: body.expires_in,
      idToken: body.id_token,
      tokenType: body.token_type,
    }

    // The launch URL still carries the session: SDKs that predate the bridge
    // read it from there, and nothing else reaches them.
    const url = buildMiniAppSessionUrl(miniApp.clientUrl, session, path)

    return ok({ ...this.describeMiniApp(miniApp), url, session })
  }

  async replaceUserRoles(id: string, roles: string[], publicRole?: string | null) {
    const result = await this.authRepository.replaceUserRoles(id, roles, publicRole)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return result
  }

  async getUserById(id: string) {
    const user = await this.authRepository.getUserById(id)

    if (user.isErr()) {
      return mapRepositoryError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.AUTH_USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok({
      id: user.value.id,
      name: user.value.name,
      address: user.value.address ?? undefined,
      onBoardingCompleted: user.value.onBoardingCompleted,
      profileImage: user.value.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(user.value.profileImagePath)
        : undefined,
      status: user.value.status,
      roles: R.pipe(
        user.value.roles,
        R.map((r) => r.role),
        R.filter((role) => ALLOWED_ROLES.includes(role))
      ),
    })
  }

  async registerUser(user: IntrospectAccessTokenResult, roles: string[]) {
    const newUser = await this.authRepository.createUser(user, roles)

    if (newUser.isErr()) {
      return mapRepositoryError(newUser.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
          message: 'User already exists',
        },
      })
    }

    return newUser
  }
}

export const AuthServicePlugin = new Elysia({ name: 'AuthService' })
  .use([
    AuthRepositoryPlugin,
    FileServerServicePlugin,
    ElysiaLoggerPlugin({ name: 'AuthService' }),
    ConfigServicePlugin,
    MiniAppRepositoryPlugin,
    MiniAppInviteRepositoryPlugin,
  ])
  .decorate(
    ({
      authRepository,
      fileServerService,
      miniAppRepository,
      miniAppInviteRepository,
      loggerService,
      configService,
    }) => ({
      authService: new AuthService(
        authRepository,
        miniAppRepository,
        miniAppInviteRepository,
        fileServerService,
        loggerService,
        {
          oidcClientId: configService.get('OIDC_CLIENT_ID'),
          oidcUrl: configService.get('OIDC_URL'),
          oidcPrivateJwtKey: configService.get('OIDC_PRIVATE_JWT_KEY'),
          oidcKeyId: configService.get('OIDC_KEY_ID'),
        }
      ),
    })
  )
