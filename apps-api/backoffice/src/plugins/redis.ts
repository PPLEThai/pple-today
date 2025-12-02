import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'
import { Redis } from 'ioredis'
import { fromPromise } from 'neverthrow'

import { ConfigServicePlugin } from './config'

export class RedisService {
  private _client: Redis

  constructor(
    protected readonly config: { redisUri: string; database?: number },
    protected readonly loggerService: ElysiaLoggerInstance
  ) {
    this._client = new Redis(this.config.redisUri, {
      db: this.config.database,
    })
  }

  async connect() {
    try {
      await this.client.connect()
    } catch (error) {
      this.loggerService.error('Failed to connect to Redis', { error: (error as Error).message })
      throw error
    }
  }

  async cleanup() {
    this.client.quit()
  }

  get client() {
    return this._client
  }
}

export const RedisServicePlugin = new Elysia({
  name: 'RedisServicePlugin',
})
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'RedisService' })])
  .decorate(({ configService, loggerService }) => ({
    redisService: new RedisService(
      {
        redisUri: configService.get('REDIS_URI'),
      },
      loggerService
    ),
  }))
  .onStop(async (app) => {
    await app.decorator.redisService.cleanup()
  })

export type ElectionNotificationMessage = {
  electionId: string
  type: 'START_VOTING' | 'START_RESULT'
}

export class RedisElectionService extends RedisService {
  private expirationListeners: Array<(message: ElectionNotificationMessage) => void> = []
  private subscriptionClient: Redis | null = null

  constructor(
    config: { redisUri: string; database?: number },
    loggerService: ElysiaLoggerInstance
  ) {
    super(config, loggerService)
    this.setup().catch((error) => {
      this.loggerService.error({ message: 'Failed to connect to Redis', error: error.message })
    })
  }

  private async handleExpiration(message: string, channel: string) {
    if (!channel.startsWith('election:')) return
    for (const listener of this.expirationListeners) {
      listener(JSON.parse(message) as ElectionNotificationMessage)
    }
  }

  async setup() {
    await this.client.connect()
    this.subscriptionClient = this.client.duplicate()

    if (!this.subscriptionClient) {
      throw new Error('Failed to create Redis subscription client')
    }

    await this.subscriptionClient.config('SET', 'notify-keyspace-events', 'Ex')
    await this.subscriptionClient.subscribe('__keyevent@1__:expired', (error, count) => {
      if (error) {
        this.loggerService.error('Failed to subscribe to Redis key expiration events', {
          error: error.message,
        })
      } else {
        this.loggerService.info(`Subscribed to ${count} Redis key expiration event channels`)
      }
    })
  }

  async registerExpirationCallback(callback: (message: ElectionNotificationMessage) => void) {
    this.expirationListeners.push(callback)
  }

  async unregisterExpirationCallback(callback: (message: ElectionNotificationMessage) => void) {
    this.expirationListeners = this.expirationListeners.filter((cb) => cb !== callback)
  }

  async setElectionStartVotingSchedule(
    electionId: string,
    resultData: ElectionNotificationMessage,
    sentAt: Date
  ) {
    const key = `election:startVoting:${electionId}`
    const now = new Date()
    const ttlSeconds = Math.max(1, Math.floor((sentAt.getTime() - now.getTime()) / 1000))

    return fromPromise(this.client.setex(key, ttlSeconds, JSON.stringify(resultData)), (error) => {
      this.loggerService.error({
        message: 'Failed to set election publish schedule in Redis',
        error: (error as Error).message,
        electionId,
        sentAt,
      })
      return {
        code: 'REDIS_ERROR' as const,
        message: 'Failed to set election publish schedule in Redis',
      }
    })
  }

  async setElectionStartResultSchedule(
    electionId: string,
    resultData: ElectionNotificationMessage,
    sentAt: Date
  ) {
    const key = `election:startResult:${electionId}`
    const now = new Date()
    const ttlSeconds = Math.max(1, Math.floor((sentAt.getTime() - now.getTime()) / 1000))

    return fromPromise(this.client.setex(key, ttlSeconds, JSON.stringify(resultData)), (error) => {
      this.loggerService.error('Failed to set election start result schedule in Redis', {
        error,
        electionId,
        sentAt,
      })
      return {
        code: 'REDIS_ERROR' as const,
        message: 'Failed to set election start result schedule in Redis',
      }
    })
  }

  async setMutexElectionNotification(electionId: string, type: 'START_VOTING' | 'START_RESULT') {
    const key = `election-notificationMutex:${type.toLowerCase()}:${electionId}`

    return fromPromise(this.client.setnx(key, 'locked'), (error) => {
      this.loggerService.error('Failed to set mutex for election notification in Redis', {
        error,
        electionId,
        type,
      })

      return {
        code: 'REDIS_ERROR' as const,
        message: 'Failed to set mutex for election notification in Redis',
      }
    })
  }

  override async cleanup() {
    await super.cleanup()
    if (this.subscriptionClient) {
      await this.subscriptionClient.quit()
    }
  }
}

export const RedisElectionServicePlugin = new Elysia({
  name: 'RedisElectionServicePlugin',
})
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'RedisService' })])
  .decorate(({ configService, loggerService }) => ({
    redisElectionService: new RedisElectionService(
      {
        redisUri: configService.get('REDIS_URI'),
        database: 1,
      },
      loggerService
    ),
  }))
  .onStop(async (app) => {
    await app.decorator.redisElectionService.cleanup()
  })
