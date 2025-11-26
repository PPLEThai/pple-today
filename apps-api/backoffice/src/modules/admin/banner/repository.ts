import { FilePath, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { exhaustiveGuard, fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  AnnouncementStatus,
  BannerInAppType,
  BannerNavigationType,
  BannerStatusType,
  HashTagStatus,
  PollStatus,
  PostStatus,
  TopicStatus,
  UserStatus,
} from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { LexoRank } from 'lexorank'
import { err, ok } from 'neverthrow'

import {
  CreateBannerBody,
  DeleteBannerParams,
  GetBannerByIdParams,
  GetBannersQuery,
  ReorderBannerByIdBody,
  ReorderBannerByIdParams,
  UpdateBannerBody,
  UpdateBannerParams,
} from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

const PUBLISHED_BANNER_LIMIT = 5

export class AdminBannerRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  private async checkValidInAppType(inAppType: BannerInAppType, inAppId: string) {
    switch (inAppType) {
      case BannerInAppType.POST:
        await this.prismaService.post.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: PostStatus.PUBLISHED },
        })
        return true
      case BannerInAppType.POLL:
        await this.prismaService.poll.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: PollStatus.PUBLISHED },
        })
        return true
      case BannerInAppType.TOPIC:
        await this.prismaService.topic.findUniqueOrThrow({
          where: { id: inAppId, status: TopicStatus.PUBLISHED },
        })
        return true
      case BannerInAppType.ANNOUNCEMENT:
        await this.prismaService.announcement.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: AnnouncementStatus.PUBLISHED },
        })
        return true
      case BannerInAppType.ELECTION:
        await this.prismaService.election.findUniqueOrThrow({
          where: {
            id: inAppId,
            isCancelled: false,
            publishDate: { lte: new Date() },
          },
        })
        return true
      case BannerInAppType.HASHTAG:
        await this.prismaService.hashTag.findUniqueOrThrow({
          where: { id: inAppId, status: HashTagStatus.PUBLISHED },
        })
        return true
      case BannerInAppType.USER:
        await this.prismaService.user.findUniqueOrThrow({
          where: { id: inAppId, status: UserStatus.ACTIVE },
        })
        return true
      default:
        exhaustiveGuard(inAppType)
    }
  }

  async getBanners(query: GetBannersQuery) {
    return fromRepositoryPromise(
      this.prismaService.banner.findMany({
        orderBy: { order: 'asc' },
        where: {
          ...(query.search && {
            headline: {
              contains: query.search,
              mode: 'insensitive',
            },
          }),
          ...(query.status &&
            query.status.length > 0 && {
              status: {
                in: query.status,
              },
            }),
        },
        include: { miniApp: true },
      })
    )
  }

  async getBannerById(id: GetBannerByIdParams['id']) {
    return fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        include: { miniApp: true },
      })
    )
  }

  async createBanner(data: CreateBannerBody) {
    if (data.navigation === BannerNavigationType.IN_APP_NAVIGATION) {
      const isValidInAppType = await fromRepositoryPromise(
        this.checkValidInAppType(data.inAppType!, data.inAppId!)
      )

      if (isValidInAppType.isErr()) {
        if (isValidInAppType.error.code === 'RECORD_NOT_FOUND') {
          return err({
            code: InternalErrorCode.BANNER_INVALID_IN_APP_NAVIGATION,
            message: 'The provided inAppId is not valid for the specified inAppType',
          })
        }
        return err(isValidInAppType.error)
      }
    }

    const moveFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )

    if (moveFileResult.isErr()) return err(moveFileResult.error)
    const [newFileName, fileTx] = moveFileResult.value

    const createBannerResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const lastBanner = await this.prismaService.banner.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        })

        return tx.banner.create({
          data: {
            imageFilePath: newFileName,
            headline: data.headline,
            navigation: data.navigation,
            ...(data.navigation === BannerNavigationType.MINI_APP
              ? { miniApp: { connect: { id: data.miniAppId } } }
              : data.navigation === BannerNavigationType.IN_APP_NAVIGATION
                ? {
                    inAppId: data.inAppId,
                    inAppType: data.inAppType,
                  }
                : { destination: data.destination }),
            order: lastBanner?.order
              ? LexoRank.parse(lastBanner.order).genNext().toString()
              : LexoRank.min().toString(),
          },
          select: {
            id: true,
          },
        })
      })
    )

    if (createBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(createBannerResult.error)
    }

    return ok(createBannerResult.value)
  }

  async updateBannerById(id: UpdateBannerParams['id'], data: UpdateBannerBody) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        select: {
          imageFilePath: true,
          miniAppId: true,
          destination: true,
          inAppId: true,
          inAppType: true,
          navigation: true,
          status: true,
        },
      })
    )
    if (existingBanner.isErr()) return err(existingBanner.error)

    if (
      data.navigation === BannerNavigationType.IN_APP_NAVIGATION ||
      (!data.navigation &&
        existingBanner.value.navigation === BannerNavigationType.IN_APP_NAVIGATION)
    ) {
      const isValidInAppType = await fromRepositoryPromise(
        this.checkValidInAppType(data.inAppType ?? existingBanner.value.inAppType!, data.inAppId!)
      )

      if (isValidInAppType.isErr()) {
        if (isValidInAppType.error.code === 'RECORD_NOT_FOUND') {
          return err({
            code: InternalErrorCode.BANNER_INVALID_IN_APP_NAVIGATION,
            message: 'The provided inAppId is not valid for the specified inAppType',
          })
        }
        return err(isValidInAppType.error)
      }
    }

    const totalPublishedBanners = await fromRepositoryPromise(
      this.prismaService.banner.count({
        where: { status: BannerStatusType.PUBLISHED },
      })
    )
    if (totalPublishedBanners.isErr()) return err(totalPublishedBanners.error)

    if (
      totalPublishedBanners.value === PUBLISHED_BANNER_LIMIT &&
      existingBanner.value.status !== data.status &&
      data.status === BannerStatusType.PUBLISHED
    )
      return err({
        code: InternalErrorCode.BANNER_PUBLISHING_LIMIT_REACHED,
        message:
          'You can only have 5 published banners. Please unpublish a banner before publishing another one.',
      })

    const updateFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        if (!data.imageFilePath || existingBanner.value.imageFilePath === data.imageFilePath)
          return existingBanner.value.imageFilePath

        const deleteResult = await fileTx.deleteFile(existingBanner.value.imageFilePath as FilePath)
        if (deleteResult.isErr()) return deleteResult

        const moveResult = await fileTx.bulkMoveToPublicFolder([data.imageFilePath])
        if (moveResult.isErr()) return moveResult
        return moveResult.value[0]
      })
    )

    if (updateFileResult.isErr()) {
      return err(updateFileResult.error)
    }

    const [newImageFilePath, fileTx] = updateFileResult.value
    const updateBannerResult = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const lastBanner = await this.prismaService.banner.findFirst({
          orderBy: { order: 'desc' },
          select: { order: true },
        })

        let connectionResult = {}
        if (data.navigation === undefined) {
          if (existingBanner.value.destination && data.destination) {
            connectionResult = {
              destination: data.destination,
            }
          } else if (existingBanner.value.miniAppId && data.miniAppId) {
            connectionResult = {
              miniApp: { disconnect: {}, connect: { id: data.miniAppId } },
            }
          } else {
            connectionResult = {
              inAppId: data.inAppId,
              inAppType: data.inAppType,
            }
          }
        } else if (data.navigation === BannerNavigationType.MINI_APP) {
          if (data.miniAppId) {
            connectionResult = {
              navigation: data.navigation,
              miniApp: { disconnect: {}, connect: { id: data.miniAppId } },
              destination: null,
            }
          } else {
            throw new Error('`miniAppId` cannot be null or undefined when `navigation` is MINI_APP')
          }
        } else if (data.navigation === BannerNavigationType.EXTERNAL_BROWSER && data.destination) {
          connectionResult = {
            navigation: data.navigation,
            miniApp: { disconnect: {} },
            destination: data.destination,
          }
        } else if (data.navigation === BannerNavigationType.IN_APP_NAVIGATION) {
          connectionResult = {
            navigation: data.navigation,
            inAppId: data.inAppId,
            inAppType: data.inAppType,
            miniApp: { disconnect: {} },
            destination: null,
          }
        }

        return tx.banner.update({
          where: { id },
          data: {
            imageFilePath: newImageFilePath,
            headline: data.headline,
            status: data.status,
            ...connectionResult,
            ...(data.status && {
              order: lastBanner?.order
                ? LexoRank.parse(lastBanner.order).genNext().toString()
                : LexoRank.min().toString(),
            }),
          },
        })
      })
    )

    if (updateBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateBannerResult.error)
    }

    return ok()
  }

  async deleteBannerById(id: DeleteBannerParams['id']) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findUniqueOrThrow({
        where: { id },
        select: { imageFilePath: true },
      })
    )

    if (existingBanner.isErr()) return err(existingBanner.error)

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const deleteResult = await fileTx.deleteFile(existingBanner.value.imageFilePath as FilePath)
        if (deleteResult.isErr()) return deleteResult
        return deleteResult.value
      })
    )

    if (deleteFileResult.isErr()) return err(deleteFileResult.error)
    const [deletedFile, fileTx] = deleteFileResult.value

    const deleteBannerResult = await fromRepositoryPromise(
      this.prismaService.banner.delete({ where: { id } })
    )

    if (deleteBannerResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteBannerResult.error)
    }

    return ok(deletedFile)
  }

  async reorderBanner(id: ReorderBannerByIdParams['id'], data: ReorderBannerByIdBody) {
    const existingBanner = await fromRepositoryPromise(
      this.prismaService.banner.findMany({
        select: {
          id: true,
          order: true,
        },
        orderBy: { order: 'asc' },
        where: { status: BannerStatusType.PUBLISHED },
      })
    )
    if (existingBanner.isErr()) return err(existingBanner.error)

    const currentIdIndex = existingBanner.value.findIndex((banner) => banner.id === id)
    if (currentIdIndex === -1)
      return err({
        code: InternalErrorCode.BANNER_NOT_FOUND,
        message: 'Banner not found.',
      })

    if (currentIdIndex <= 0 && data.movement === 'up')
      return err({
        code: InternalErrorCode.BANNER_MOVING_POSITION_INVALID,
        message: 'You cannot move the first banner up.',
      })
    if (currentIdIndex >= PUBLISHED_BANNER_LIMIT - 1 && data.movement === 'down')
      return err({
        code: InternalErrorCode.BANNER_MOVING_POSITION_INVALID,
        message: 'You cannot move the last banner down.',
      })

    let newOrder = ''
    if (currentIdIndex === 1 && data.movement === 'up') {
      newOrder = LexoRank.parse(existingBanner.value[currentIdIndex - 1].order)
        .genPrev()
        .toString()
    } else if (currentIdIndex === PUBLISHED_BANNER_LIMIT - 2 && data.movement === 'down') {
      newOrder = LexoRank.parse(existingBanner.value[currentIdIndex + 1].order)
        .genNext()
        .toString()
    } else {
      const beforeIndex = data.movement === 'up' ? currentIdIndex - 2 : currentIdIndex + 1
      const afterIndex = data.movement === 'up' ? currentIdIndex - 1 : currentIdIndex + 2

      const beforeLexoRank = LexoRank.parse(existingBanner.value[beforeIndex].order)
      const afterLexoRank = LexoRank.parse(existingBanner.value[afterIndex].order)

      newOrder = beforeLexoRank.between(afterLexoRank).toString()
    }

    return fromRepositoryPromise(
      this.prismaService.banner.update({
        where: { id },
        data: { order: newOrder },
      })
    )
  }
}

export const AdminBannerRepositoryPlugin = new Elysia({ name: 'AdminBannerRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    bannerRepository: new AdminBannerRepository(prismaService, fileService),
  }))
