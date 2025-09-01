import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { FacebookRepository, FacebookRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRepositoryError } from '../../utils/error'
import { FileService, FileServicePlugin } from '../file/services'
export class FacebookService {
  constructor(
    private readonly facebookRepository: FacebookRepository,
    private readonly fileService: FileService
  ) {}

  // TODO: Move to admin section
  // private async syncPostsFromPage({
  //   userId,
  //   facebookPageId,
  //   facebookPageAccessToken,
  // }: {
  //   userId: string
  //   facebookPageId: string
  //   facebookPageAccessToken: string
  // }) {
  //   const initialPagePosts = await this.facebookRepository.getPagePosts(
  //     facebookPageId,
  //     facebookPageAccessToken
  //   )

  //   if (initialPagePosts.isErr()) {
  //     return err(initialPagePosts.error)
  //   }

  //   const postWithoutParentId = initialPagePosts.value.data.filter((post) => !post.parent_id)

  //   const syncResult = await this.facebookRepository.syncInitialPostsFromPage(
  //     userId,
  //     postWithoutParentId
  //   )

  //   if (syncResult.isErr()) {
  //     return err(syncResult.error)
  //   }

  //   return await this.facebookRepository.subscribeToPostUpdates(userId, facebookPageId)
  // }

  async getUserAccessToken(code: string, redirectUri: string) {
    return await this.facebookRepository.getUserAccessToken(code, redirectUri)
  }

  async getUserPageList(facebookToken: string) {
    const userPageListResult = await this.facebookRepository.getUserPageList(facebookToken)

    if (userPageListResult.isErr()) {
      return userPageListResult
    }

    return userPageListResult.map((result) =>
      result.data.map((page) => ({
        id: page.id,
        name: page.name,
        profilePictureUrl: page.picture.data.url,
        accessToken: page.access_token,
      }))
    )
  }

  async getLinkedFacebookPage(userId: string) {
    const linkedPageResult = await this.facebookRepository.getLinkedFacebookPage(userId)

    if (linkedPageResult.isErr()) {
      return err(linkedPageResult.error)
    }

    if (!linkedPageResult.value) {
      return ok(null)
    }

    const publicProfilePictureUrl = this.fileService.getPublicFileUrl(
      linkedPageResult.value.profilePictureUrl
    )

    return ok({
      id: linkedPageResult.value.id,
      name: linkedPageResult.value.name,
      profilePictureUrl: publicProfilePictureUrl,
    })
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
    const existingPage = await this.facebookRepository.getLocalPageById(facebookPageId)

    if (existingPage.isErr()) {
      return mapRepositoryError(existingPage.error)
    }

    if (existingPage.value?.managerId) {
      return err({
        code: InternalErrorCode.FACEBOOK_PAGE_ALREADY_LINKED,
        message: 'Facebook page is already linked to another user',
      })
    }

    const pageDetails = await this.facebookRepository.getFacebookPageById(
      facebookPageAccessToken,
      facebookPageId
    )

    if (pageDetails.isErr()) {
      return err(pageDetails.error)
    }

    let profilePictureUrl = existingPage.value?.profilePictureUrl

    if (
      !profilePictureUrl ||
      pageDetails.value.picture.data.cache_key !== existingPage.value?.profilePictureCacheKey
    ) {
      const uploadResult = await this.fileService.uploadProfilePagePicture(
        pageDetails.value.picture.data.url,
        facebookPageId
      )

      if (uploadResult.isErr()) {
        return err(uploadResult.error)
      }

      profilePictureUrl = uploadResult.value
    }

    const linkedPage = await this.facebookRepository.linkFacebookPageToUser(
      userId,
      facebookPageId,
      {
        facebookPageAccessToken,
        profilePictureUrl,
        profilePictureCacheKey: pageDetails.value.picture.data.cache_key,
        pageName: pageDetails.value.name,
      }
    )

    if (linkedPage.isErr()) {
      return mapRepositoryError(linkedPage.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    const subscribeResult = await this.facebookRepository.subscribeToPostUpdates(
      userId,
      linkedPage.value.id,
      facebookPageAccessToken
    )

    if (subscribeResult.isErr()) {
      return mapRepositoryError(subscribeResult.error)
    }

    return ok(linkedPage.value)
  }

  async unlinkFacebookPageFromUser(userId: string) {
    const unlinkResult = await this.facebookRepository.unlinkFacebookPageFromUser(userId)

    if (unlinkResult.isErr()) {
      return mapRepositoryError(unlinkResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_LINKED_PAGE_NOT_FOUND,
          message: 'Linked Facebook page not found',
        },
      })
    }

    const unlinkPostsResult = await this.facebookRepository.unsubscribeFromPostUpdates(
      unlinkResult.value.id,
      unlinkResult.value.pageAccessToken ?? ''
    )

    if (unlinkPostsResult.isErr()) {
      return mapRepositoryError(unlinkPostsResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.FACEBOOK_LINKED_PAGE_NOT_FOUND,
          message: 'Linked Facebook page not found',
        },
      })
    }

    return ok()
  }
}

export const FacebookServicePlugin = new Elysia({
  name: 'FacebookService',
})
  .use([FacebookRepositoryPlugin, FileServicePlugin])
  .decorate(({ facebookRepository, fileService }) => ({
    facebookService: new FacebookService(facebookRepository, fileService),
  }))
