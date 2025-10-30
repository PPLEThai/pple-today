import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { Check } from '@sinclair/typebox/value'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GenerateMiniAppTokenErrorResponse, GenerateMiniAppTokenResponse } from './models'
import { AuthRepository, AuthRepositoryPlugin } from './repository'

import { ConfigServicePlugin } from '../../plugins/config'
import { FileServicePlugin } from '../../plugins/file'
import { generateJwtToken } from '../../utils/jwt'
import { MiniAppRepository, MiniAppRepositoryPlugin } from '../mini-app/repository'

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private miniAppRepository: MiniAppRepository,
    private fileService: FileService,
    private loggerService: ElysiaLoggerInstance,
    private oidcConfig: {
      oidcClientId: string
      oidcUrl: string
      oidcPrivateJwtKey: string
      oidcKeyId: string
    }
  ) {}

  async generateMiniAppToken(slug: string, token: string, path?: string) {
    const miniApp = await this.miniAppRepository.getMiniAppBySlug(slug)

    if (miniApp.isErr()) {
      return mapRepositoryError(miniApp.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app not found',
        },
      })
    }

    const jwtToken = generateJwtToken(this.oidcConfig)

    const httpHeaders = { 'Content-Type': 'application/json' }
    const data = {
      token,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwtToken,
    }

    const response = await fetch(`${this.oidcConfig.oidcUrl}/mini-app/${miniApp.value.clientId}`, {
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
        message: `Invalid mini app token error response for clientId ${miniApp.value.clientId}`,
      })

      return mapRepositoryError({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: errorMessage,
      })
    }

    const miniAppToken = Check(GenerateMiniAppTokenResponse, body)

    if (!miniAppToken) {
      this.loggerService.error({
        message: `Invalid mini app token response for clientId ${miniApp.value.clientId}`,
      })
      return mapRepositoryError({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while generating the mini app token',
      })
    }

    const url = new URL(miniApp.value.clientUrl)

    url.searchParams.append('access_token', body.access_token)
    url.searchParams.append('expires_in', body.expires_in.toString())
    url.searchParams.append('id_token', body.id_token)
    url.searchParams.append('token_type', body.token_type)

    if (path) url.pathname = path

    return ok({
      url: url.toString(),
    })
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
        ? this.fileService.getPublicFileUrl(user.value.profileImagePath)
        : undefined,
      status: user.value.status,
      roles: user.value.roles.map((r) => r.role),
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
    FileServicePlugin,
    ElysiaLoggerPlugin({ name: 'AuthService' }),
    ConfigServicePlugin,
    MiniAppRepositoryPlugin,
  ])
  .decorate(({ authRepository, fileService, miniAppRepository, loggerService, configService }) => ({
    authService: new AuthService(authRepository, miniAppRepository, fileService, loggerService, {
      oidcClientId: configService.get('OIDC_CLIENT_ID'),
      oidcUrl: configService.get('OIDC_URL'),
      oidcPrivateJwtKey: configService.get('OIDC_PRIVATE_JWT_KEY'),
      oidcKeyId: configService.get('OIDC_KEY_ID'),
    }),
  }))
