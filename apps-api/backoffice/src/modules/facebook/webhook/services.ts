import * as crypto from 'node:crypto'

import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { HandleFacebookWebhookBody, ValidateFacebookWebhookQuery } from './models'
import { FacebookWebhookRepository, FacebookWebhookRepositoryPlugin } from './repository'

import { PostAttachment, PostAttachmentType } from '../../../../__generated__/prisma'
import serverEnv from '../../../config/env'
import { InternalErrorCode } from '../../../dtos/error'
import {
  PagePost,
  WebhookChangesVerb,
  WebhookFeedChanges,
  WebhookFeedType,
} from '../../../dtos/facebook'
import { err } from '../../../utils/error'
import { mapRepositoryError } from '../../../utils/error'
import { getFileName } from '../../../utils/facebook'
import { FacebookRepository, FacebookRepositoryPlugin } from '../repository'

export class FacebookWebhookService {
  constructor(
    private readonly facebookConfig: {
      appSecret: string
      verifyToken: string
    },
    private readonly facebookRepository: FacebookRepository,
    private readonly facebookWebhookRepository: FacebookWebhookRepository
  ) {}

  private async upsertPostDetails(pageId: string, postId: string) {
    const page = await this.facebookRepository.getLocalFacebookPage(pageId)

    if (page.isErr()) return mapRepositoryError(page.error)

    const newPostDetails = await this.facebookRepository.getFacebookPostByPostId(
      postId,
      page.value.pageAccessToken!
    )
    if (newPostDetails.isErr()) return mapRepositoryError(newPostDetails.error)

    const newAttachments = this.getAttachmentsFromPagePost(newPostDetails.value)

    const existingPost =
      await this.facebookWebhookRepository.getExistingPostByFacebookPostId(postId)
    if (existingPost.isErr()) return mapRepositoryError(existingPost.error)

    const updatedAttachmentResult = await this.facebookWebhookRepository.handleAttachmentChanges(
      pageId,
      existingPost.value?.attachments ?? [],
      newAttachments
    )
    if (updatedAttachmentResult.isErr()) return mapRepositoryError(updatedAttachmentResult.error)
    const [updatedAttachment, fileTx] = updatedAttachmentResult.value

    const upsertResult = existingPost.value
      ? await this.facebookWebhookRepository.updatePost({
          facebookPageId: pageId,
          postId: postId,
          content: newPostDetails.value.message,
          hashTags: newPostDetails.value.message_tags?.map((tag) => tag.name) ?? [],
          attachments: updatedAttachment,
        })
      : await this.facebookWebhookRepository.publishNewPost({
          facebookPageId: pageId,
          postId: postId,
          content: newPostDetails.value.message,
          hashTags: newPostDetails.value.message_tags?.map((tag) => tag.name) ?? [],
          attachments: updatedAttachment,
        })

    if (upsertResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return rollbackResult
      return mapRepositoryError(upsertResult.error)
    }

    return ok()
  }

  private getAttachmentsFromPagePost(
    post: PagePost
  ): Pick<
    PostAttachment,
    'description' | 'cacheKey' | 'order' | 'thumbnailPath' | 'type' | 'url' | 'width' | 'height'
  >[] {
    return R.pipe(
      post.attachments?.data ?? [],
      R.map((attachment, idx) => {
        if (attachment.type === 'album') {
          return R.pipe(
            attachment.subattachments!.data,
            R.map((subattachment) => {
              if (subattachment.type === 'video_autoplay' || subattachment.type === 'video') {
                if (!subattachment.media.source) return
                return {
                  description: subattachment.description ?? null,
                  width: subattachment.media.image.width,
                  height: subattachment.media.image.height,
                  thumbnailPath: subattachment.media.image.src,
                  url: subattachment.media.source,
                  type: PostAttachmentType.VIDEO,
                  cacheKey: getFileName(subattachment.media.source),
                }
              }
              if (subattachment.type === 'photo') {
                return {
                  description: subattachment.description ?? null,
                  width: subattachment.media.image.width,
                  height: subattachment.media.image.height,
                  thumbnailPath: null,
                  url: subattachment.media.image.src,
                  type: PostAttachmentType.IMAGE,
                  cacheKey: getFileName(subattachment.media.image.src),
                }
              }
            }),
            R.filter((val) => !!val),
            R.flat(),
            R.map((value, idx) => ({
              ...value,
              order: idx + 1,
            }))
          )
        }

        if (attachment.type === 'photo') {
          return {
            description: attachment.description ?? null,
            width: attachment.media.image.width,
            height: attachment.media.image.height,
            url: attachment.media.image.src,
            thumbnailPath: null,
            type: PostAttachmentType.IMAGE,
            cacheKey: getFileName(attachment.media.image.src),
            order: idx + 1,
          }
        }
        if (attachment.media.source && attachment.type === 'video_autoplay') {
          return {
            description: attachment.description ?? null,
            width: attachment.media.image.width,
            height: attachment.media.image.height,
            thumbnailPath: attachment.media.image.src,
            url: attachment.media.source,
            type: PostAttachmentType.VIDEO,
            order: idx + 1,
            cacheKey: getFileName(attachment.media.source),
          }
        }
      }),
      R.filter((val) => !!val),
      R.flat()
    )
  }

  private async handleFeedStatusChange(body: Extract<WebhookFeedChanges, { item: 'status' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD:
      case WebhookChangesVerb.EDIT: {
        if (!body.message && !body.photos) {
          const deleteResult = await this.facebookWebhookRepository.deletePost(body.post_id)
          if (deleteResult.isErr()) return mapRepositoryError(deleteResult.error)
          return ok()
        }
        return await this.upsertPostDetails(body.from.id, body.post_id)
      }
    }

    return ok()
  }

  private async handleFeedPhotoChange(body: Extract<WebhookFeedChanges, { item: 'photo' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD:
      case WebhookChangesVerb.EDIT: {
        if (!body.link) {
          const deleteResult = await this.facebookWebhookRepository.deletePost(body.post_id)
          if (deleteResult.isErr()) return mapRepositoryError(deleteResult.error)
          return ok()
        }
        return await this.upsertPostDetails(body.from.id, body.post_id)
      }
    }
    return ok()
  }

  private async handleFeedVideoChange(body: Extract<WebhookFeedChanges, { item: 'video' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD:
      case WebhookChangesVerb.REMOVE: {
        return await this.upsertPostDetails(body.from.id, body.post_id)
      }
      case WebhookChangesVerb.EDIT: {
        if (!body.link) {
          const deleteResult = await this.facebookWebhookRepository.deletePost(body.post_id)
          if (deleteResult.isErr()) return mapRepositoryError(deleteResult.error)
          return ok()
        }
        return await this.upsertPostDetails(body.from.id, body.post_id)
      }
    }
  }

  async validateWebhookSignature(signature: string, body: Buffer) {
    if (!signature.startsWith('sha256=')) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_INVALID_SIGNATURE,
        message: 'Invalid signature format',
      })
    }

    const sha256Signature = signature.replace('sha256=', '')

    const hmac = crypto.createHmac('sha256', this.facebookConfig.appSecret)
    const hash = hmac.update(body).digest('hex')

    if (sha256Signature !== hash) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_INVALID_SIGNATURE,
        message: 'Invalid signature',
      })
    }

    return ok()
  }

  async validateFacebookWebhook(query: ValidateFacebookWebhookQuery) {
    const { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge } = query

    if (mode !== 'subscribe' || verifyToken !== this.facebookConfig.verifyToken) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_VERIFICATION_FAILED,
        message: 'Invalid verification token or mode',
      })
    }

    return ok(challenge)
  }

  async handleFacebookWebhook(body: HandleFacebookWebhookBody) {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        switch (change.value.item) {
          case WebhookFeedType.STATUS: {
            const statusResult = await this.handleFeedStatusChange(change.value)
            if (statusResult.isErr()) return statusResult

            break
          }
          case WebhookFeedType.VIDEO: {
            const videoResult = await this.handleFeedVideoChange(change.value)
            if (videoResult.isErr()) return videoResult

            break
          }
          case WebhookFeedType.PHOTO: {
            const photoResult = await this.handleFeedPhotoChange(change.value)
            if (photoResult.isErr()) return photoResult

            break
          }
        }
      }
    }

    return ok()
  }
}

export const FacebookWebhookServicePlugin = new Elysia({
  name: 'FacebookWebhookService',
})
  .use([FacebookWebhookRepositoryPlugin, FacebookRepositoryPlugin])
  .decorate(({ facebookRepository, facebookWebhookRepository }) => ({
    facebookWebhookService: new FacebookWebhookService(
      {
        appSecret: serverEnv.FACEBOOK_APP_SECRET,
        verifyToken: serverEnv.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
      },
      facebookRepository,
      facebookWebhookRepository
    ),
  }))
