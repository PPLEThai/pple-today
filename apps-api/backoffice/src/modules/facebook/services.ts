import node from '@elysiajs/node'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { FacebookRepository, FacebookRepositoryPlugin } from './repository'

export class FacebookService {
  constructor(private readonly facebookRepository: FacebookRepository) {}

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
      }))
    )
  }

  async getLinkedFacebookPage(userId: string) {
    const linkedPageResult = await this.facebookRepository.getLinkedFacebookPage(userId)

    if (linkedPageResult.isErr()) {
      return linkedPageResult
    }

    return linkedPageResult.map((page) =>
      page
        ? {
            id: page.id,
            name: page.name,
            profilePictureUrl: page.profilePictureUrl,
          }
        : null
    )
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
    const linkResult = await this.facebookRepository.linkFacebookPageToUser({
      userId,
      facebookPageId,
      facebookAccessToken,
    })

    if (linkResult.isErr()) {
      return err(linkResult.error)
    }

    return ok()
  }

  async unlinkFacebookPageFromUser(userId: string) {
    return await this.facebookRepository.unlinkFacebookPageFromUser({ userId })
  }
}

export const FacebookServicePlugin = new Elysia({
  name: 'FacebookService',
  adapter: node(),
})
  .use(FacebookRepositoryPlugin)
  .decorate(({ facebookRepository }) => ({
    facebookService: new FacebookService(facebookRepository),
  }))
