import { TAnySchema } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'
import { Elysia } from 'elysia'
import { err, fromPromise, ok } from 'neverthrow'

import { FeedItemType } from '../../../__generated__/prisma'
import serverEnv from '../../config/env'
import { InternalErrorCode } from '../../dtos/error'
import {
  ExternalFacebookAccessTokenResponse,
  ExternalFacebookErrorBody,
  ExternalFacebookGetPageDetailsResponse,
  ExternalFacebookGetPagePostsResponse,
  ExternalFacebookInspectAccessTokenResponse,
  ExternalFacebookListUserPageResponse,
  ExternalFacebookPagePost,
} from '../../dtos/facebook'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

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
    private readonly prismaService: PrismaService
  ) {}

  private async makeRequest<T extends TAnySchema>(
    options: Partial<RequestInit> & {
      path: string
      responseSchema: T
    }
  ) {
    const { path, responseSchema, ...requestOptions } = options

    const response = await fetch(`${this.facebookConfig.apiUrl}${path}`, requestOptions)

    if (!response.ok) {
      console.error('Facebook API request failed:', response.status, response.statusText)
      console.error('Response body:', await response.text())
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: 'Failed to fetch from Facebook API',
      })
    }

    const jsonBody = await fromPromise(response.json(), () => ({
      code: InternalErrorCode.FACEBOOK_API_ERROR,
      message: 'Failed to parse Facebook API response',
    }))

    if (jsonBody.isErr()) {
      return err(jsonBody.error)
    }

    if (Check(ExternalFacebookErrorBody, jsonBody.value)) {
      return err({
        code: InternalErrorCode.FACEBOOK_API_ERROR,
        message: jsonBody.value.error.message,
      })
    }

    if (!Check(responseSchema, jsonBody.value)) {
      console.error('Invalid response format from Facebook API:', JSON.stringify(jsonBody.value))
      return err({
        code: InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
        message: 'Invalid response format from Facebook API',
      })
    }

    return ok(jsonBody.value)
  }

  private async getAccessToken(queryParams: URLSearchParams) {
    const response = await this.makeRequest({
      path: `/oauth/access_token?${queryParams.toString()}`,
      responseSchema: ExternalFacebookAccessTokenResponse,
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

    const response = await this.makeRequest({
      path: `/debug_token?${queryParams.toString()}`,
      responseSchema: ExternalFacebookInspectAccessTokenResponse,
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

  // TODO: Implement the following methods when webhooks are available
  private async subscribeToPostUpdates(userId: string, pageId: string) {
    return await fromPrismaPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId },
        data: {
          isSubscribed: true,
        },
      })
    )
  }

  private async unsubscribeFromPostUpdates(userId: string, pageId: string) {
    return await fromPrismaPromise(
      this.prismaService.facebookPage.update({
        where: { id: pageId, managerId: userId },
        data: {
          isSubscribed: false,
        },
      })
    )
  }

  private async syncPostsFromPage(userId: string, posts: ExternalFacebookPagePost[]) {
    this.prismaService.$transaction(async (tx) => {
      await Promise.all(
        posts.map(async (post) => {
          const existingPost = await tx.post.findUnique({
            where: { facebookPostId: post.id },
            include: {
              images: true,
              hashTags: {
                include: {
                  hashTag: true,
                },
              },
            },
          })

          if (existingPost) {
            await tx.post.update({
              where: { feedItemId: existingPost.feedItemId },
              data: {
                content: post.message,
                images: {
                  deleteMany: {},
                  create:
                    post.attachments?.map((attachment) => ({
                      url: attachment.media.image.src,
                    })) ?? [],
                },
                hashTags: {
                  deleteMany: {},
                  create:
                    post.message_tags?.map((tag) => ({
                      hashTag: {
                        connectOrCreate: {
                          where: { name: tag.data.name },
                          create: { name: tag.data.name },
                        },
                      },
                    })) ?? [],
                },
              },
            })
            return
          }

          await tx.feedItem.create({
            data: {
              author: {
                connect: { id: userId },
              },
              type: FeedItemType.POST,
              post: {
                create: {
                  facebookPostId: post.id,
                  content: post.message,
                  hashTags: {
                    create:
                      post.message_tags?.map((tag) => ({
                        hashTag: {
                          connectOrCreate: {
                            where: { name: tag.data.name },
                            create: { name: tag.data.name },
                          },
                        },
                      })) ?? [],
                  },
                  images: {
                    create:
                      post.attachments?.map((attachment) => ({
                        url: attachment.media.image.src,
                      })) ?? [],
                  },
                },
              },
            },
          })
        })
      )
    })
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
      fields: 'id,name,picture',
    })

    const response = await this.makeRequest({
      path: `/${inspectResponse.value.data.user_id}/accounts?${queryParams.toString()}`,
      responseSchema: ExternalFacebookListUserPageResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getUserPageById(userAccessToken: string, pageId: string) {
    const inspectResponse = await this.inspectUserAccessToken(userAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: userAccessToken,
      fields: 'access_token,id,name,picture',
    })

    const response = await this.makeRequest({
      path: `/${pageId}?${queryParams.toString()}`,
      responseSchema: ExternalFacebookGetPageDetailsResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async getPagePosts(userAccessToken: string, pageId: string) {
    const inspectResponse = await this.inspectUserAccessToken(userAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: userAccessToken,
      fields: 'id,message_tags,message,attachments,updated_time,created_time',
      limit: '100',
    })

    const response = await this.makeRequest({
      path: `/${pageId}/posts?${queryParams.toString()}`,
      responseSchema: ExternalFacebookGetPagePostsResponse,
    })

    if (response.isErr()) {
      return err(response.error)
    }

    return ok(response.value)
  }

  async linkFacebookPageToUser({
    userId,
    facebookPageId,
    facebookAccessToken,
  }: {
    userId: string
    facebookPageId: string
    facebookAccessToken: string
  }) {
    const existingPage = await this.prismaService.facebookPage.findUnique({
      where: {
        managerId: userId,
      },
    })

    if (existingPage) {
      return ok(existingPage)
    }

    const initialPagePosts = await this.getPagePosts(facebookAccessToken, facebookPageId)

    if (initialPagePosts.isErr()) {
      return err(initialPagePosts.error)
    }

    await this.syncPostsFromPage(userId, initialPagePosts.value.data)

    const result = await this.subscribeToPostUpdates(userId, facebookPageId)

    if (result.isErr()) {
      return err(result.error)
    }

    return ok()
  }

  async unlinkFacebookPageFromUser({ userId }: { userId: string }) {
    const deleteResult = await fromPrismaPromise(
      this.prismaService.facebookPage.delete({
        where: {
          managerId: userId,
        },
      })
    )

    if (deleteResult.isErr()) {
      return err(deleteResult.error)
    }

    const unsubscribeResult = await this.unsubscribeFromPostUpdates(userId, deleteResult.value.id)

    if (unsubscribeResult.isErr()) {
      return err(unsubscribeResult.error)
    }

    return ok()
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

    return ok(
      linkedPage.value
        ? {
            id: linkedPage.value.id,
            name: linkedPage.value.name,
            profilePictureUrl: linkedPage.value.profilePictureUrl,
          }
        : null
    )
  }
}

export const FacebookRepositoryPlugin = new Elysia({
  name: 'FacebookRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    facebookRepository: new FacebookRepository(
      {
        apiUrl: serverEnv.FACEBOOK_API_URL,
        appId: serverEnv.FACEBOOK_APP_ID,
        appSecret: serverEnv.FACEBOOK_APP_SECRET,
      },
      prismaService
    ),
  }))
