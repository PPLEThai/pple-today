import { TAnySchema } from '@sinclair/typebox'
import { Check } from '@sinclair/typebox/value'
import { Elysia, t } from 'elysia'
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
      console.error('Request options:', path)
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
        where: { id: pageId, managerId: userId },
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
    return await fromPrismaPromise(
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
                      post.attachments?.data.map((attachment) => ({
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
                        post.attachments?.data.map((attachment) => ({
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
      fields: 'access_token,id,name,picture',
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

  async getPageById(pageAccessToken: string, pageId: string) {
    const inspectResponse = await this.inspectUserAccessToken(pageAccessToken)

    if (inspectResponse.isErr()) {
      return err(inspectResponse.error)
    }

    const queryParams = new URLSearchParams({
      access_token: pageAccessToken,
      fields: 'id,name,picture',
    })

    const response = await this.makeRequest({
      path: `/${pageId}?${queryParams.toString()}`,
      responseSchema: t.Omit(ExternalFacebookGetPageDetailsResponse, ['access_token']),
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
    facebookPageAccessToken,
  }: {
    userId: string
    facebookPageId: string
    facebookPageAccessToken: string
  }) {
    const pageDetails = await this.getPageById(facebookPageAccessToken, facebookPageId)

    if (pageDetails.isErr()) {
      return err(pageDetails.error)
    }

    const profilePictureUrl = `profile/profile-picture-${facebookPageId}.png`
    const uploadResult = await fromPromise(
      this.fileService.uploadFileStream(pageDetails.value.picture.data.url, profilePictureUrl),
      (err) => ({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: `Failed to upload profile image: ${(err as any).message}`,
      })
    )

    if (uploadResult.isErr()) {
      return err(uploadResult.error)
    }

    const createResult = await fromPrismaPromise(
      this.prismaService.facebookPage.upsert({
        where: {
          id: facebookPageId,
        },
        create: {
          id: facebookPageId,
          name: pageDetails.value.name,
          profilePictureUrl,
          pageAccessToken: facebookPageAccessToken,
          manager: {
            connect: { id: userId },
          },
          isSubscribed: true,
        },
        update: {
          name: pageDetails.value.name,
          profilePictureUrl,
          pageAccessToken: facebookPageAccessToken,
          manager: {
            connect: { id: userId },
          },
          isSubscribed: true,
        },
      })
    )

    if (createResult.isErr()) {
      return err(createResult.error)
    }

    const initialPagePosts = await this.getPagePosts(facebookPageAccessToken, facebookPageId)

    if (initialPagePosts.isErr()) {
      return err(initialPagePosts.error)
    }

    const syncResult = await this.syncPostsFromPage(userId, initialPagePosts.value.data)

    if (syncResult.isErr()) {
      return err(syncResult.error)
    }

    return await this.subscribeToPostUpdates(userId, facebookPageId)
  }

  async unlinkFacebookPageFromUser({ userId }: { userId: string }) {
    const unlinkResult = await fromPrismaPromise(
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

    if (unlinkResult.isErr()) {
      return err(unlinkResult.error)
    }

    const unsubscribeResult = await this.unsubscribeFromPostUpdates(userId, unlinkResult.value.id)

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

    if (!linkedPage.value) {
      return ok(null)
    }

    const profilePictureUrl = await fromPromise(
      this.fileService.getSignedUrl(linkedPage.value.profilePictureUrl),
      (err) => ({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: `Failed to get signed URL for profile picture: ${(err as any).message}`,
      })
    )

    if (profilePictureUrl.isErr()) {
      return err(profilePictureUrl.error)
    }

    return ok({
      id: linkedPage.value.id,
      name: linkedPage.value.name,
      profilePictureUrl: profilePictureUrl.value,
    })
  }
}

export const FacebookRepositoryPlugin = new Elysia({
  name: 'FacebookRepository',
})
  .use(PrismaServicePlugin)
  .use(FileServicePlugin)
  .decorate(({ prismaService, fileService }) => ({
    facebookRepository: new FacebookRepository(
      {
        apiUrl: serverEnv.FACEBOOK_API_URL,
        appId: serverEnv.FACEBOOK_APP_ID,
        appSecret: serverEnv.FACEBOOK_APP_SECRET,
      },
      fileService,
      prismaService
    ),
  }))
