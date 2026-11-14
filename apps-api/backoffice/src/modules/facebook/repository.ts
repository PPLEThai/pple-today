import { FilePath, InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  AccessTokenResponse,
  ErrorBody,
  GetPageDetailsResponse,
  GetPagePostsResponse,
  InspectAccessTokenResponse,
  ListUserPageResponse,
  PagePost,
} from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { PrismaService } from '@pple-today/api-common/services'
import { FileService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FacebookPageLinkedStatus } from '@pple-today/database/prisma'
import { TAnySchema } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'
import { createHmac } from 'crypto'
import { Elysia, t } from 'elysia'
import { fromPromise, ok } from 'neverthrow'

import { ConnectAttemptRecord } from './connect-attempt'

import { ConfigServicePlugin } from '../../plugins/config'
import { FileServicePlugin } from '../../plugins/file'
import { ElysiaLoggerPlugin } from '../../plugins/log'
import { PrismaServicePlugin } from '../../plugins/prisma'

/**
 * Permissions a page token needs once the page is approved: reading its posts
 * and subscribing to its feed webhook. Keep in step with the permissions the
 * mobile app requests (`FACEBOOK_PAGE_PERMISSIONS`).
 */
const FACEBOOK_REQUIRED_PAGE_PERMISSIONS = [
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_metadata',
] as const

/**
 * Sorts a Graph API error by what the caller can do about it, from the raw
 * error body that `makeRequest` puts in the message:
 * - `invalid-token`: OAuth error 190, the token expired or was revoked.
 * - `permission`: the token lacks a permission, or the person lacks the page
 *   role, for this call (codes 3, 10, 200–299, and 100 with subcode 33).
 */
function classifyFacebookError(rawMessage: string): 'invalid-token' | 'permission' | null {
  let body: unknown
  try {
    body = JSON.parse(rawMessage)
  } catch {
    return null
  }
  const error = (body as { error?: { code?: unknown; error_subcode?: unknown } } | null)?.error
  const code = error?.code
  if (typeof code !== 'number') return null
  if (code === 190) return 'invalid-token'
  if (code === 3 || code === 10 || (code >= 200 && code < 300)) return 'permission'
  if (code === 100 && error?.error_subcode === 33) return 'permission'
  return null
}

export class FacebookRepository {
  private apiAccessToken: {
    access_token: string
    token_type: string
  } | null = null

  constructor(
    private readonly facebookConfig: {
      apiUrl: string
      appId: string
      appSecret: string
    },
    private readonly fileService: FileService,
    private readonly prismaService: PrismaService,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  private getAppSecretProof(accessToken: string) {
    const hmac = createHmac('sha256', this.facebookConfig.appSecret)
    const hash = hmac.update(accessToken).digest('hex')

    return hash
  }

  private async makeRequest<T extends TAnySchema>(
    options: Partial<RequestInit> & {
      path: string
      responseSchema: T
      query: URLSearchParams
      accessToken?: string
    }
  ) {
    const { path, responseSchema, query, accessToken, ...requestOptions } = options

    if (accessToken) query.set('appsecret_proof', this.getAppSecretProof(accessToken))

    const response = await fetch(
      `${this.facebookConfig.apiUrl}${path}?${query.toString()}`,
      requestOptions
    )

    if (!response.ok) {
      const responseText = await response.text()

      this.loggerService.error({
        error: responseText,
        message: 'Failed to parse Facebook API response',
      })

      // Surface Facebook's own message (e.g. "(#200) ... pages_manage_metadata")
      // rather than the raw JSON body, so the backoffice UI can show it as-is.
      let errorBody: unknown
      try {
        errorBody = JSON.parse(responseText)
      } catch {
        errorBody = null
      }

      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: Check(ErrorBody, errorBody) ? errorBody.error.message : responseText,
      })
    }

    const jsonBody = await fromPromise(response.json(), () => ({
      code: InternalErrorCode.FACEBOOK_API_ERROR,
      message: 'Failed to parse Facebook API response',
    }))

    if (jsonBody.isErr()) {
      this.loggerService.error({
        error: jsonBody.error,
        message: 'Failed to parse Facebook API response',
      })
      return err(jsonBody.error)
    }

    if (Check(ErrorBody, jsonBody.value)) {
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: jsonBody.value.error.message,
      })
    }

    if (!Check(responseSchema, jsonBody.value)) {
      this.loggerService.error({
        error: jsonBody.value,
        message: 'Invalid response format from Facebook API',
      })

      return err({
        code: InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
        message: 'Invalid response format from Facebook API',
      })
    }

    this.loggerService.info({
      message: 'Successfully fetched data from Facebook API',
      path,
      data: jsonBody.value,
    })

    return ok(jsonBody.value)
  }

  private async getAccessToken(queryParams: URLSearchParams) {
    const response = await this.makeRequest({
      path: `/oauth/access_token`,
      query: queryParams,
      responseSchema: AccessTokenResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok({
      accessToken: response.value.access_token,
      tokenType: response.value.token_type,
      expiresIn: response.value.expires_in,
    })
  }

  private async fetchApiAccessToken() {
    if (this.apiAccessToken) {
      return ok(this.apiAccessToken.access_token)
    }

    const queryParams = new URLSearchParams({
      client_id: this.facebookConfig.appId,
      client_secret: this.facebookConfig.appSecret,
      grant_type: 'client_credentials',
    })

    const response = await this.getAccessToken(queryParams)

    if (response.isErr()) {
      return err(response.error)
    }

    this.apiAccessToken = {
      access_token: response.value.accessToken,
      token_type: response.value.tokenType,
    }

    return ok(this.apiAccessToken.access_token)
  }

  private async inspectUserAccessToken(userAccessToken: string) {
    const adminToken = await this.fetchApiAccessToken()

    if (adminToken.isErr()) {
      return err(adminToken.error)
    }

    const queryParams = new URLSearchParams({
      input_token: userAccessToken,
      access_token: adminToken.value,
    })

    // An invalid token's debug data leaves out fields a valid one carries, so
    // check validity before the full schema. Otherwise a dead token would come
    // back as an invalid response instead of an invalid token.
    const response = await this.makeRequest({
      path: `/debug_token`,
      query: queryParams,
      responseSchema: t.Object({ data: t.Object({ is_valid: t.Boolean() }) }),
    })

    if (response.isErr()) {
      return err(response.error)
    }

    if (!response.value.data.is_valid) {
      return err({
        code: InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN,
        message: 'The provided access token is invalid',
      })
    }

    if (!Check(InspectAccessTokenResponse, response.value)) {
      this.loggerService.error({
        error: response.value,
        message: 'Invalid debug_token response format from Facebook API',
      })
      return err({
        code: InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
        message: 'Invalid response format from Facebook API',
      })
    }

    return ok(response.value)
  }

  async subscribeToPostUpdates(userId: string, pageId: string, pageAccessToken: string) {
    const queryParams = new URLSearchParams({
      subscribed_fields: 'feed',
      access_token: pageAccessToken,
    })

    const result = await this.makeRequest({
      path: `/${pageId}/subscribed_apps`,
      method: 'POST',
      accessToken: pageAccessToken,
      query: queryParams,
      responseSchema: t.Object({
        success: t.Boolean(),
      }),
    })

    if (result.isErr()) {
      // Name the fix for whoever approves: only the page manager can repair
      // a token that lost its permissions, by reconnecting the page in the app.
      switch (classifyFacebookError(result.error.message)) {
        case 'invalid-token':
          return err({
            code: InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN,
            message:
              'The page access token is no longer valid. The page manager must unlink and reconnect the page in the app.',
          })
        case 'permission':
          return err({
            code: InternalErrorCode.FACEBOOK_INSUFFICIENT_PERMISSION,
            message: `The page manager did not grant enough Facebook access for this page and must unlink and reconnect it in the app. Facebook said: ${result.error.message}`,
          })
        default:
          return err(result.error)
      }
    }

    if (!result.value.success) {
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: 'Failed to subscribe to feed updates',
      })
    }

    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId, managerId: userId },
        data: {
          isSubscribed: true,
        },
      })
    )
  }

  async unsubscribeFromPostUpdates(pageId: string, pageAccessToken: string) {
    const queryParams = new URLSearchParams({
      access_token: pageAccessToken,
    })

    const result = await this.makeRequest({
      path: `/${pageId}/subscribed_apps`,
      method: 'DELETE',
      accessToken: pageAccessToken,
      query: queryParams,
      responseSchema: t.Object({
        success: t.Boolean(),
      }),
    })

    if (result.isErr()) {
      return err(result.error)
    }

    if (!result.value.success) {
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: 'Failed to subscribe to feed updates',
      })
    }

    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId },
        data: {
          isSubscribed: false,
        },
      })
    )
  }

  async fetchLongLivedAccessToken(pageAccessToken: string) {
    const queryParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.facebookConfig.appId,
      client_secret: this.facebookConfig.appSecret,
      fb_exchange_token: pageAccessToken,
    })

    const response = await this.getAccessToken(queryParams)

    if (response.isErr()) {
      return err(response.error)
    }

    return ok({
      accessToken: response.value.accessToken,
      tokenType: response.value.tokenType,
      expiresIn: response.value.expiresIn,
    })
  }

  async updatePageAccessToken(pageId: string, oldAccessToken: string) {
    const response = await this.fetchLongLivedAccessToken(oldAccessToken)
    if (response.isErr()) return err(response.error)

    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId },
        data: {
          pageAccessToken: response.value.accessToken,
        },
      })
    )
  }

  async getUserAccessToken(code: string, redirectUri: string) {
    const queryParams = new URLSearchParams({
      client_id: this.facebookConfig.appId,
      client_secret: this.facebookConfig.appSecret,
      redirect_uri: redirectUri,
      code,
    })

    const response = await this.getAccessToken(queryParams)

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getUserPageList(userAccessToken: string) {
    const inspectResponse = await this.inspectUserAccessToken(userAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: userAccessToken,
      fields: 'access_token,id,name,picture{cache_key,url}',
    })

    const response = await this.makeRequest({
      path: `/${inspectResponse.value.data.user_id}/accounts`,
      query: queryParams,
      accessToken: userAccessToken,
      responseSchema: ListUserPageResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getFacebookPageById(pageId: string, pageAccessToken: string) {
    const inspectResponse = await this.inspectUserAccessToken(pageAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: pageAccessToken,
      fields: 'id,name,picture{cache_key,url}',
    })

    const response = await this.makeRequest({
      path: `/${pageId}?${queryParams.toString()}`,
      query: queryParams,
      accessToken: pageAccessToken,
      responseSchema: t.Pick(GetPageDetailsResponse, ['id', 'name', 'picture']),
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  /**
   * Fails with FACEBOOK_INSUFFICIENT_PERMISSION unless the page token can do
   * everything an approved page needs, so a gap surfaces to the page manager at
   * link time instead of to an admin at approval time.
   *
   * Two checks, because neither is enough alone:
   * - The token's scopes. Facebook lets a person grant a permission for only
   *   some of their pages, so a page-scoped permission must also list this page
   *   in its granular target ids.
   * - A read of `/{page}/subscribed_apps`. Approval writes to this edge, which
   *   also needs the person to hold the MODERATE task on the page. Reading it
   *   catches a missing page role without subscribing. It is a close proxy,
   *   not a guarantee: the write can still fail for reasons the read does not
   *   need, so approval reports such failures as needing a reconnect too.
   */
  async verifyPageAccessTokenPermissions(pageId: string, pageAccessToken: string) {
    const inspectResponse = await this.inspectUserAccessToken(pageAccessToken)
    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const { scopes, granular_scopes } = inspectResponse.value.data
    const missingScopes = FACEBOOK_REQUIRED_PAGE_PERMISSIONS.filter((permission) => {
      if (!scopes.includes(permission)) return true
      const targetIds = granular_scopes.find((g) => g.scope === permission)?.target_ids
      // No target ids means the permission covers every page.
      return targetIds !== undefined && !targetIds.some((id) => String(id) === pageId)
    })
    if (missingScopes.length > 0) {
      return err({
        code: InternalErrorCode.FACEBOOK_INSUFFICIENT_PERMISSION,
        message: `Missing Facebook permissions for this page: ${missingScopes.join(', ')}`,
      })
    }

    const probe = await this.makeRequest({
      path: `/${pageId}/subscribed_apps`,
      query: new URLSearchParams({ access_token: pageAccessToken }),
      accessToken: pageAccessToken,
      responseSchema: t.Object({ data: t.Array(t.Unknown()) }),
    })
    if (probe.isErr()) {
      switch (classifyFacebookError(probe.error.message)) {
        case 'invalid-token':
          return err({
            code: InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN,
            message: 'The page access token is no longer valid',
          })
        case 'permission':
          // The scopes above already passed, so what is missing is the
          // person's role on the page, which reconnecting cannot fix.
          return err({
            code: InternalErrorCode.FACEBOOK_INSUFFICIENT_PAGE_ROLE,
            message: `The user's role on this page cannot manage its subscriptions. Facebook said: ${probe.error.message}`,
          })
        default:
          return err(probe.error)
      }
    }

    return ok()
  }

  async getPagePosts(pageAccessToken: string, pageId: string) {
    const inspectResponse = await this.inspectUserAccessToken(pageAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: pageAccessToken,
      fields: 'id,message_tags,message,attachments,updated_time,created_time,parent_id',
      limit: '100',
    })

    const response = await this.makeRequest({
      path: `/${pageId}/posts?${queryParams.toString()}`,
      query: queryParams,
      accessToken: pageAccessToken,
      responseSchema: GetPagePostsResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getFacebookPostByPostId(postId: string, pageAccessToken: string) {
    const inspectResponse = await this.inspectUserAccessToken(pageAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: pageAccessToken,
      fields: 'id,message_tags,message,attachments,updated_time,created_time,parent_id',
      limit: '100',
    })

    const response = await this.makeRequest({
      path: `/${postId}?${queryParams.toString()}`,
      query: queryParams,
      accessToken: pageAccessToken,
      responseSchema: PagePost,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getLinkedPageAvailableStatus(pageIds: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.findMany({
        where: {
          id: {
            in: pageIds,
          },
        },
      })
    )
  }

  async getLocalFacebookPage(pageId: string) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.findUniqueOrThrow({
        where: {
          id: pageId,
        },
      })
    )
  }

  async getLocalPageById(facebookPageId: string) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.findUnique({
        where: { id: facebookPageId },
      })
    )
  }

  async linkFacebookPageToUser(
    userId: string,
    facebookPageId: string,
    data: {
      facebookPageAccessToken: string
      profilePicturePath: string
      profilePictureCacheKey: string
      pageName: string
    }
  ) {
    const { facebookPageAccessToken, profilePicturePath, profilePictureCacheKey, pageName } = data

    return await fromRepositoryPromise(
      this.prismaService.facebookPage.upsert({
        where: {
          id: facebookPageId,
        },
        create: {
          id: facebookPageId,
          name: pageName,
          profilePicturePath,
          linkedStatus: FacebookPageLinkedStatus.PENDING,
          pageAccessToken: facebookPageAccessToken,
          manager: {
            connect: { id: userId },
          },
          profilePictureCacheKey: profilePictureCacheKey,
        },
        update: {
          name: pageName,
          profilePicturePath,
          linkedStatus: FacebookPageLinkedStatus.PENDING,
          pageAccessToken: facebookPageAccessToken,
          profilePictureCacheKey: profilePictureCacheKey,
          manager: {
            connect: { id: userId },
          },
        },
      })
    )
  }

  async unlinkFacebookPageFromUser(userId: string) {
    return await fromRepositoryPromise(
      this.prismaService.facebookPage.update({
        where: {
          managerId: userId,
        },
        data: {
          linkedStatus: FacebookPageLinkedStatus.UNLINKED,
          pageAccessToken: '',
          manager: {
            disconnect: true,
          },
        },
      })
    )
  }

  async getLinkedFacebookPage(userId: string) {
    const linkedPage = await fromRepositoryPromise(
      this.prismaService.facebookPage.findUnique({
        where: {
          managerId: userId,
        },
      })
    )

    if (linkedPage.isErr()) {
      return err(linkedPage.error)
    }

    if (!linkedPage.value) {
      return ok(null)
    }

    return ok({
      id: linkedPage.value.id,
      name: linkedPage.value.name,
      status: linkedPage.value.linkedStatus,
      profileImagePath: linkedPage.value.profilePicturePath,
      pageAccessToken: linkedPage.value.pageAccessToken,
      isSubscribed: linkedPage.value.isSubscribed,
    })
  }

  async createConnectAttempt(record: ConnectAttemptRecord) {
    return await fromRepositoryPromise(
      this.prismaService.facebookConnectAttempt.create({
        data: record,
        select: { id: true, referenceCode: true },
      })
    )
  }

  async deleteConnectAttemptsCreatedBefore(cutoff: Date) {
    return await fromRepositoryPromise(
      this.prismaService.facebookConnectAttempt.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
    )
  }

  async handleUploadedProfilePicture(fileUrl: string, fileName: FilePath) {
    const uploadResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (tx) => {
        const uploadFileResult = await tx.uploadFileFromUrl(fileUrl, fileName)
        if (uploadFileResult.isErr()) return err(uploadFileResult.error)

        const newFileName = await tx.bulkMoveToPublicFolder([fileName])
        if (newFileName.isErr()) return err(newFileName.error)

        return newFileName.value[0]
      })
    )

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    return ok(uploadResult.value)
  }
}

export const FacebookRepositoryPlugin = new Elysia({
  name: 'FacebookRepository',
})
  .use(PrismaServicePlugin)
  .use(FileServicePlugin)
  .use(ConfigServicePlugin)
  .use(ElysiaLoggerPlugin({ name: 'FacebookRepository' }))
  .decorate(({ prismaService, fileService, loggerService, configService }) => ({
    facebookRepository: new FacebookRepository(
      {
        apiUrl: configService.get('FACEBOOK_API_URL'),
        appId: configService.get('FACEBOOK_APP_ID'),
        appSecret: configService.get('FACEBOOK_APP_SECRET'),
      },
      fileService,
      prismaService,
      loggerService
    ),
  }))
