import { TAnySchema } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'
import { createHmac } from 'crypto'
import { Elysia, t } from 'elysia'
import { fromPromise, ok } from 'neverthrow'

import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import {
  AccessTokenResponse,
  ErrorBody,
  GetPageDetailsResponse,
  GetPagePostsResponse,
  InspectAccessTokenResponse,
  ListUserPageResponse,
  PagePost,
} from '../../dtos/facebook'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '../../plugins/logger'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { err } from '../../utils/error'
import { fromPrismaPromise } from '../../utils/prisma'
import { FileService, FileServicePlugin } from '../file/services'

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

      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: responseText,
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

  private async fetchLongLivedAccessToken(pageAccessToken: string) {
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

    const response = await this.makeRequest({
      path: `/debug_token`,
      query: queryParams,
      responseSchema: InspectAccessTokenResponse,
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
      return err(result.error)
    }

    if (!result.value.success) {
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: 'Failed to subscribe to feed updates',
      })
    }

    return await fromPrismaPromise(
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

    return await fromPrismaPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId },
        data: {
          isSubscribed: false,
        },
      })
    )
  }

  // TODO: implement the following methods when starting to sync posts
  // async syncInitialPostsFromPage(userId: string, posts: PagePost[]) {
  //   return await fromPrismaPromise(
  //     this.prismaService.$transaction(async (tx) => {
  //       await Promise.all(
  //         posts.map(async (post) => {
  //           const existingPost = await tx.post.findUnique({
  //             where: { facebookPostId: post.id },
  //             include: {
  //               images: true,
  //               hashTags: {
  //                 include: {
  //                   hashTag: true,
  //                 },
  //               },
  //             },
  //           })

  //           if (existingPost) {
  //             await tx.post.update({
  //               where: { feedItemId: existingPost.feedItemId },
  //               data: {
  //                 content: post.message,
  //                 images: {
  //                   deleteMany: {},
  //                   create:
  //                     post.attachments?.data.map((attachment, idx) => ({
  //                       cacheKey: attachment.target.id,
  //                       url: attachment.media.image.src,
  //                       order: idx,
  //                     })) ?? [],
  //                 },
  //                 hashTags: {
  //                   deleteMany: {},
  //                   create:
  //                     post.message_tags?.map((tag) => ({
  //                       hashTag: {
  //                         connectOrCreate: {
  //                           where: { name: tag.data.name },
  //                           create: { name: tag.data.name },
  //                         },
  //                       },
  //                     })) ?? [],
  //                 },
  //               },
  //             })
  //             return
  //           }

  //           await tx.feedItem.create({
  //             data: {
  //               author: {
  //                 connect: { id: userId },
  //               },
  //               type: FeedItemType.POST,
  //               post: {
  //                 create: {
  //                   facebookPostId: post.id,
  //                   content: post.message,
  //                   hashTags: {
  //                     create:
  //                       post.message_tags?.map((tag) => ({
  //                         hashTag: {
  //                           connectOrCreate: {
  //                             where: { name: tag.data.name },
  //                             create: { name: tag.data.name },
  //                           },
  //                         },
  //                       })) ?? [],
  //                   },
  //                   images: {
  //                     create:
  //                       post.attachments?.data.map((attachment, idx) => ({
  //                         cacheKey: attachment.target.id,
  //                         url: attachment.media.image.src,
  //                         order: idx,
  //                       })) ?? [],
  //                   },
  //                 },
  //               },
  //             },
  //           })
  //         })
  //       )
  //     })
  //   )
  // }

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

  async getFacebookPageById(pageAccessToken: string, pageId: string) {
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

  async getLocalFacebookPage(pageId: string) {
    return await fromPrismaPromise(
      this.prismaService.facebookPage.findUniqueOrThrow({
        where: {
          id: pageId,
        },
      })
    )
  }

  async getLocalPageById(facebookPageId: string) {
    return await fromPrismaPromise(
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
      profilePictureUrl: string
      profilePictureCacheKey: string
      pageName: string
    }
  ) {
    const { facebookPageAccessToken, profilePictureUrl, profilePictureCacheKey, pageName } = data

    return await fromPrismaPromise(
      this.prismaService.facebookPage.upsert({
        where: {
          id: facebookPageId,
        },
        create: {
          id: facebookPageId,
          name: pageName,
          profilePictureUrl,
          pageAccessToken: facebookPageAccessToken,
          manager: {
            connect: { id: userId },
          },
          profilePictureCacheKey: profilePictureCacheKey,
        },
        update: {
          name: pageName,
          profilePictureUrl,
          pageAccessToken: facebookPageAccessToken,
          manager: {
            connect: { id: userId },
          },
        },
      })
    )
  }

  async unlinkFacebookPageFromUser(userId: string) {
    return await fromPrismaPromise(
      this.prismaService.facebookPage.update({
        where: {
          managerId: userId,
        },
        data: {
          manager: {
            disconnect: true,
          },
        },
      })
    )
  }

  async getLinkedFacebookPage(userId: string) {
    const linkedPage = await fromPrismaPromise(
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
      profilePictureUrl: linkedPage.value.profilePictureUrl,
    })
  }
}

export const FacebookRepositoryPlugin = new Elysia({
  name: 'FacebookRepository',
})
  .use(PrismaServicePlugin)
  .use(FileServicePlugin)
  .use(ElysiaLoggerPlugin({ name: 'FacebookRepository' }))
  .decorate(({ prismaService, fileService, loggerService }) => ({
    facebookRepository: new FacebookRepository(
      {
        apiUrl: serverEnv.FACEBOOK_API_URL,
        appId: serverEnv.FACEBOOK_APP_ID,
        appSecret: serverEnv.FACEBOOK_APP_SECRET,
      },
      fileService,
      prismaService,
      loggerService
    ),
  }))
