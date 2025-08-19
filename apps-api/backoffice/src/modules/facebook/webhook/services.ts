import * as crypto from 'node:crypto'

import cuid2 from '@paralleldrive/cuid2'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { HandleFacebookWebhookBody, ValidateFacebookWebhookQuery } from './models'
import { FacebookWebhookRepository, FacebookWebhookRepositoryPlugin } from './repository'

import { PostAttachment, PostAttachmentType } from '../../../../__generated__/prisma'
import serverEnv from '../../../config/env'
import { InternalErrorCode } from '../../../dtos/error'
import { WebhookChangesVerb, WebhookFeedChanges, WebhookFeedType } from '../../../dtos/facebook'
import { err } from '../../../utils/error'
import { getFileName, getHashTag } from '../../../utils/facebook'
import { mapRawPrismaError } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class FacebookWebhookService {
  constructor(
    private readonly facebookConfig: {
      appSecret: string
      verifyToken: string
    },
    private readonly fileService: FileService,
    private readonly facebookWebhookRepository: FacebookWebhookRepository
  ) {}

  private async handleAttachmentChanges(
    pageId: string,
    existingAttachments: PostAttachment[],
    newAttachments: string[],
    type: PostAttachmentType
  ) {
    const requiredDelete = R.pipe(
      existingAttachments,
      R.filter((ea) => !newAttachments.find((a) => ea.cacheKey === getFileName(a))),
      R.map((ea) => ea.url)
    )

    const deleteResult = await this.fileService.bulkDeleteFile(requiredDelete)

    if (deleteResult.isErr()) {
      return err(deleteResult.error)
    }

    const requiredUpload = R.pipe(
      newAttachments ?? [],
      R.filter((a) => !existingAttachments.find((ea) => ea.cacheKey === getFileName(a)))
    )

    const result = await Promise.all(
      requiredUpload.map(async (photo) => {
        const fileName = getFileName(photo)
        const newFilename = `temp/facebook/${pageId}/${cuid2.createId()}-${fileName}`
        const uploadResult = await this.fileService.uploadFileFromUrl(photo, newFilename)

        if (uploadResult.isErr()) {
          return err(uploadResult.error)
        }

        const markAsPublicResult = await this.fileService.bulkMarkAsPublic([newFilename])

        if (markAsPublicResult.isErr()) {
          return err(markAsPublicResult.error)
        }

        const moveToPublicFolderResult = await this.fileService.moveFileToPublicFolder([
          newFilename,
        ])

        if (moveToPublicFolderResult.isErr()) {
          return err(moveToPublicFolderResult.error)
        }

        return ok({
          url: newFilename,
          type,
          cacheKey: fileName,
        })
      }) ?? []
    )

    const resultWithoutFailed = R.pipe(
      result,
      R.filter((r) => r.isOk()),
      R.map((r) => r.value)
    )

    if (resultWithoutFailed.length !== result.length) {
      return err({
        code: InternalErrorCode.FILE_UPLOAD_ERROR,
        message: 'File upload failed',
      })
    }

    return ok({
      requiredDelete,
      newUploads: resultWithoutFailed,
    })
  }

  private async handleFeedStatusChange(body: Extract<WebhookFeedChanges, { item: 'status' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD: {
        const hashTags = getHashTag(body.message)

        const updateAttachmentResult = await this.handleAttachmentChanges(
          body.from.id,
          [],
          body.photos ?? [],
          PostAttachmentType.IMAGE
        )

        if (updateAttachmentResult.isErr()) {
          return err(updateAttachmentResult.error)
        }

        const publishResult = await this.facebookWebhookRepository.publishNewPost({
          facebookPageId: body.from.id,
          postId: body.post_id,
          content: body.message,
          hashTags,
          attachments: updateAttachmentResult.value.newUploads,
        })

        if (publishResult.isErr()) {
          return mapRawPrismaError(publishResult.error, {
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
            return mapRawPrismaError(deleteResult.error, {
              RECORD_NOT_FOUND: {
                code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
                message: 'Post not found',
              },
            })
          }

          const deleteFileResult = await this.fileService.bulkDeleteFile(
            deleteResult.value.post?.attachments.map((a) => a.url) ?? []
          )

          if (deleteFileResult.isErr()) {
            return err(deleteFileResult.error)
          }

          return ok()
        }

        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          return mapRawPrismaError(existingPost.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
              message: 'Post not found',
            },
          })
        }

        const updateAttachmentResult = await this.handleAttachmentChanges(
          body.from.id,
          existingPost.value.attachments ?? [],
          body.photos ?? [],
          PostAttachmentType.IMAGE
        )

        if (updateAttachmentResult.isErr()) {
          return err(updateAttachmentResult.error)
        }

        const hashTags = getHashTag(body.message)
        const updateResult = await this.facebookWebhookRepository.updatePost({
          postId: body.post_id,
          facebookPageId: body.from.id,
          content: body.message,
          hashTags,
        })

        if (updateResult.isErr()) {
          return mapRawPrismaError(updateResult.error)
        }

        return ok()
      }
    }

    return ok()
  }

  private async handleFeedPhotoChange(body: Extract<WebhookFeedChanges, { item: 'photo' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD: {
        const result = await this.handleAttachmentChanges(
          body.from.id,
          [],
          body.link ? [body.link] : [],
          PostAttachmentType.IMAGE
        )

        if (result.isErr()) {
          return result
        }

        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          const publishResult = await this.facebookWebhookRepository.publishNewPost({
            postId: body.post_id,
            content: body.message,
            facebookPageId: body.from.id,
            attachments: result.value.newUploads,
            hashTags: getHashTag(body.message),
          })

          if (publishResult.isErr()) {
            return mapRawPrismaError(publishResult.error)
          }

          return ok()
        }

        const deleteResult = await this.fileService.bulkDeleteFile(
          existingPost.value.attachments.map((a) => a.url)
        )

        if (deleteResult.isErr()) {
          return err(deleteResult.error)
        }

        const addResult = await this.facebookWebhookRepository.updatePost({
          postId: body.post_id,
          content: body.message,
          facebookPageId: body.from.id,
          attachments: result.value.newUploads,
          hashTags: getHashTag(body.message),
        })

        if (addResult.isErr()) {
          return err(addResult.error)
        }

        break
      }
    }
    return ok()
  }

  private async handleFeedVideoChange(body: Extract<WebhookFeedChanges, { item: 'video' }>) {
    switch (body.verb) {
      case WebhookChangesVerb.ADD: {
        const result = await this.handleAttachmentChanges(
          body.from.id,
          [],
          body.link ? [body.link] : [],
          PostAttachmentType.VIDEO
        )

        if (result.isErr()) {
          return result
        }

        const existingPost = await this.facebookWebhookRepository.getExistingPostByFacebookPostId(
          body.post_id
        )

        if (existingPost.isErr()) {
          const publishResult = await this.facebookWebhookRepository.publishNewPost({
            postId: body.post_id,
            content: body.message,
            facebookPageId: body.from.id,
            attachments: result.value.newUploads,
            hashTags: getHashTag(body.message),
          })

          if (publishResult.isErr()) {
            return mapRawPrismaError(publishResult.error)
          }

          return ok()
        }

        const addResult = await this.facebookWebhookRepository.addNewAttachments(body.post_id, [
          ...existingPost.value.attachments,
          ...result.value.newUploads,
        ])

        if (addResult.isErr()) {
          return mapRawPrismaError(addResult.error, {
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
            const result = await this.handleFeedStatusChange(change.value)
            if (result.isErr()) return result

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
  .use([FacebookWebhookRepositoryPlugin, FileServicePlugin])
  .decorate(({ fileService, facebookWebhookRepository }) => ({
    facebookWebhookService: new FacebookWebhookService(
      {
        appSecret: serverEnv.FACEBOOK_APP_SECRET,
        verifyToken: serverEnv.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
      },
      fileService,
      facebookWebhookRepository
    ),
  }))
