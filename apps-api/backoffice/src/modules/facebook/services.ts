import node from '@elysiajs/node'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { FacebookRepository, FacebookRepositoryPlugin } from './repository'

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

    const signedProfilePictureUrl = await this.fileService.getSignedUrl(
      linkedPageResult.value.profilePictureUrl
    )

    if (signedProfilePictureUrl.isErr()) {
      return err(signedProfilePictureUrl.error)
    }

    return ok({
      id: linkedPageResult.value.id,
      name: linkedPageResult.value.name,
      profilePictureUrl: signedProfilePictureUrl.value,
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
      return err(existingPage.error)
    }

    const pageDetails = await this.facebookRepository.getFacebookPageById(
      facebookPageAccessToken,
      facebookPageId
    )

    if (pageDetails.isErr()) {
      return err(pageDetails.error)
    }

    const profilePictureUrl = `profile/profile-picture-${facebookPageId}.png`

    if (pageDetails.value.picture.data.cache_key !== existingPage.value?.profilePictureCacheKey) {
      const uploadResult = await this.fileService.uploadFileStream(
        pageDetails.value.picture.data.url,
        profilePictureUrl
      )

      if (uploadResult.isErr()) {
        return err(uploadResult.error)
      }
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
      return err(linkedPage.error)
    }

    return ok(linkedPage.value)
  }

  async unlinkFacebookPageFromUser(userId: string) {
    const unlinkResult = await this.facebookRepository.unlinkFacebookPageFromUser({ userId })

    if (unlinkResult.isErr()) {
      return err(unlinkResult.error)
    }

    const unlinkPostsResult = await this.facebookRepository.unsubscribeFromPostUpdates(
      userId,
      unlinkResult.value.id
    )

    if (unlinkPostsResult.isErr()) {
      return err(unlinkPostsResult.error)
    }

    return ok()
  }
}

export const FacebookServicePlugin = new Elysia({
  name: 'FacebookService',
  adapter: node(),
})
  .use([FacebookRepositoryPlugin, FileServicePlugin])
  .decorate(({ facebookRepository, fileService }) => ({
    facebookService: new FacebookService(facebookRepository, fileService),
  }))
