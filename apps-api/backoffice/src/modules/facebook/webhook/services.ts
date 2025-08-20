import * as crypto from 'node:crypto'

import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { HandleFacebookWebhookBody, ValidateFacebookWebhookQuery } from './models'
import { FacebookWebhookRepository, FacebookWebhookRepositoryPlugin } from './repository'

import { PostAttachmentType } from '../../../../__generated__/prisma'
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
import { getFileName, getHashTag } from '../../../utils/facebook'
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

  private getAttachmentsFromPagePost(post: PagePost) {
    return R.pipe(
      post.attachments?.data ?? [],
      R.map((attachment) => {
        if (attachment.type === 'album') {
          return R.pipe(
            attachment.subattachments!.data,
            R.map((subattachment) => {
              if (subattachment.type === 'video_autoplay') {
                if (!subattachment.media.source) return
                return {
                  url: subattachment.media.source,
                  type: PostAttachmentType.VIDEO,
                  cacheKey: getFileName(subattachment.media.source),
                }
              }
              if (subattachment.type === 'photo') {
                return {
                  url: subattachment.media.image.src,
                  type: PostAttachmentType.IMAGE,
                  cacheKey: getFileName(subattachment.media.image.src),
                }
              }
            }),
            R.filter((val) => !!val),
            R.flat()
          )
        }

        if (attachment.type === 'photo') {
          if (!attachment.media.image.src) return
          return {
            url: attachment.media.image.src,
            type: PostAttachmentType.IMAGE,
            cacheKey: getFileName(attachment.media.image.src),
          }
        }
        if (attachment.media.source && attachment.type === 'video_autoplay') {
          return {
            url: attachment.media.source,
            type: PostAttachmentType.VIDEO,
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
      case WebhookChangesVerb.ADD: {
        const hashTags = getHashTag(body.message)
        const updateAttachmentResult = await this.facebookWebhookRepository.handleAttachmentChanges(
          body.from.id,
          [],
          body.photos?.map((image) => ({
            url: image,
            type: PostAttachmentType.IMAGE,
            cacheKey: getFileName(image),
          })) ?? []
        )

        if (updateAttachmentResult.isErr()) {
          return mapRepositoryError(updateAttachmentResult.error)
        }
        const [newUploads, fileTx] = updateAttachmentResult.value

        const publishResult = await this.facebookWebhookRepository.publishNewPost({
          facebookPageId: body.from.id,
          postId: body.post_id,
          content: body.message,
          hashTags,
          attachments: newUploads.newUploads,
        })

        if (publishResult.isErr()) {
          const rollbackResult = await fileTx.rollback()
          if (rollbackResult.isErr()) return err(rollbackResult.error)
          return mapRepositoryError(publishResult.error, {
            UNIQUE_CONSTRAINT_FAILED: {
              code: InternalErrorCode.FEED_ITEM_ALREADY_EXISTED,
              message: 'Post already exists',
            },
          })
        }

        return ok()
      }
      case WebhookChangesVerb.EDIT: {
        if (!body.photos && !body.message) {
          const deleteResult = await this.facebookWebhookRepository.deletePost(body.post_id)

          if (deleteResult.isErr()) {
            return mapRepositoryError(deleteResult.error, {
              RECORD_NOT_FOUND: {
                code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
                message: 'Post not found',
              },
            })
          }

          return ok()
        }

        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          return mapRepositoryError(existingPost.error)
        }

        if (!existingPost.value) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Post not found',
          })
        }

        const updateAttachmentResult = await this.facebookWebhookRepository.handleAttachmentChanges(
          body.from.id,
          existingPost.value.attachments.filter((a) => a.type === PostAttachmentType.IMAGE) ?? [],
          body.photos?.map((image) => ({
            url: image,
            type: PostAttachmentType.IMAGE,
            cacheKey: getFileName(image),
          })) ?? []
        )

        if (updateAttachmentResult.isErr()) {
          return mapRepositoryError(updateAttachmentResult.error)
        }
        const [updatedAttachment, fileTx] = updateAttachmentResult.value

        const hashTags = getHashTag(body.message)
        const updateResult = await this.facebookWebhookRepository.updatePost({
          postId: body.post_id,
          facebookPageId: body.from.id,
          content: body.message,
          hashTags,
          attachments: [
            ...existingPost.value.attachments.filter((a) => a.type !== PostAttachmentType.IMAGE),
            ...updatedAttachment.unchangedAttachments,
            ...updatedAttachment.newUploads,
          ],
        })

        if (updateResult.isErr()) {
          const rollbackResult = await fileTx.rollback()
          if (rollbackResult.isErr()) return err(rollbackResult.error)
          return mapRepositoryError(updateResult.error)
        }

        return ok()
      }
    }

    return ok()
  }

  private async handleFeedPhotoChange(body: Extract<WebhookFeedChanges, { item: 'photo' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD:
      case WebhookChangesVerb.EDIT: {
        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          return mapRepositoryError(existingPost.error)
        }

        const result = await this.facebookWebhookRepository.handleAttachmentChanges(
          body.from.id,
          existingPost.value?.attachments ?? [],
          body.link
            ? [
                {
                  cacheKey: getFileName(body.link),
                  url: body.link,
                  type: PostAttachmentType.IMAGE,
                },
              ]
            : []
        )

        if (result.isErr()) {
          return mapRepositoryError(result.error)
        }
        const [attachments, fileTx] = result.value

        if (!existingPost.value) {
          const publishResult = await this.facebookWebhookRepository.publishNewPost({
            postId: body.post_id,
            content: body.message,
            facebookPageId: body.from.id,
            attachments: attachments.newUploads,
            hashTags: getHashTag(body.message),
          })

          if (publishResult.isErr()) {
            const rollbackResult = await fileTx.rollback()
            if (rollbackResult.isErr()) return err(rollbackResult.error)
            return mapRepositoryError(publishResult.error)
          }

          return ok()
        }

        const addResult = await this.facebookWebhookRepository.updatePost({
          postId: body.post_id,
          content: body.message,
          facebookPageId: body.from.id,
          attachments: attachments.newUploads,
          hashTags: getHashTag(body.message),
        })

        if (addResult.isErr()) {
          const rollbackResult = await fileTx.rollback()
          if (rollbackResult.isErr()) return err(rollbackResult.error)
          return mapRepositoryError(addResult.error)
        }

        break
      }
    }
    return ok()
  }

  private async handleFeedVideoChange(body: Extract<WebhookFeedChanges, { item: 'video' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD: {
        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          return mapRepositoryError(existingPost.error)
        }

        const result = await this.facebookWebhookRepository.handleAttachmentChanges(
          body.from.id,
          existingPost.value?.attachments ?? [],
          body.link
            ? [
                {
                  url: body.link,
                  type: PostAttachmentType.VIDEO,
                  cacheKey: getFileName(body.link),
                },
              ]
            : []
        )

        if (result.isErr()) {
          return mapRepositoryError(result.error)
        }
        const [attachments, fileTx] = result.value

        if (!existingPost.value) {
          const publishResult = await this.facebookWebhookRepository.publishNewPost({
            postId: body.post_id,
            content: body.message,
            facebookPageId: body.from.id,
            attachments: attachments.newUploads,
            hashTags: getHashTag(body.message),
          })

          if (publishResult.isErr()) {
            const rollbackResult = await fileTx.rollback()
            if (rollbackResult.isErr()) return err(rollbackResult.error)
            return mapRepositoryError(publishResult.error)
          }

          return ok()
        }

        const addResult = await this.facebookWebhookRepository.addNewAttachments(body.post_id, [
          ...attachments.unchangedAttachments,
          ...attachments.newUploads,
        ])

        if (addResult.isErr()) {
          const rollbackResult = await fileTx.rollback()
          if (rollbackResult.isErr()) return err(rollbackResult.error)
          return mapRepositoryError(addResult.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
              message: 'Post not found',
            },
          })
        }

        break
      }
      case WebhookChangesVerb.REMOVE: {
        const localPostDetails =
          await this.facebookWebhookRepository.getExistingPostByFacebookPostId(body.post_id)

        if (localPostDetails.isErr()) {
          return mapRepositoryError(localPostDetails.error)
        }

        if (!localPostDetails.value) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Post not found',
          })
        }

        const userPageResult = await this.facebookRepository.getLocalFacebookPage(body.from.id)

        if (userPageResult.isErr()) {
          return mapRepositoryError(userPageResult.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.FACEBOOK_LINKED_PAGE_NOT_FOUND,
              message: 'Facebook page not found',
            },
          })
        }

        if (!userPageResult.value.pageAccessToken)
          return err({
            code: InternalErrorCode.FACEBOOK_LINKED_PAGE_NOT_FOUND,
            message: 'Facebook page access token not found',
          })

        const postDetails = await this.facebookRepository.getFacebookPostByPostId(
          body.post_id,
          userPageResult.value.pageAccessToken
        )

        if (postDetails.isErr()) {
          return err(postDetails.error)
        }

        const newAttachments = this.getAttachmentsFromPagePost(postDetails.value)
        const attachmentChangesResult =
          await this.facebookWebhookRepository.handleAttachmentChanges(
            body.from.id,
            localPostDetails.value.attachments ?? [],
            newAttachments
          )

        if (attachmentChangesResult.isErr()) {
          return mapRepositoryError(attachmentChangesResult.error)
        }
        const [attachments, fileTx] = attachmentChangesResult.value

        const updatedPostResult = await this.facebookWebhookRepository.updatePost({
          facebookPageId: body.from.id,
          postId: body.post_id,
          // NOTE: New upload should have less attachments than old ones because this is removal action
          attachments: attachments.unchangedAttachments,
          content: body.message,
          hashTags: getHashTag(body.message),
        })

        if (updatedPostResult.isErr()) {
          const rollbackResult = await fileTx.rollback()
          if (rollbackResult.isErr()) return err(rollbackResult.error)
          return mapRepositoryError(updatedPostResult.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
              message: 'Post not found',
            },
          })
        }

        break
      }
    }
    // Handle the feed video change
    return ok()
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
