import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'
import { fromPromise } from 'neverthrow'
import { createClient, RedisClientType } from 'redis'

import { ConfigServicePlugin } from './config'

export class RedisService {
  private _client: RedisClientType

  constructor(
    protected readonly config: { redisUri: string; database?: number },
    protected readonly loggerService: ElysiaLoggerInstance
  ) {
    this._client = createClient({ url: config.redisUri, database: config.database })
  }

  async connect() {
    try {
      await this.client.connect()
    } catch (error) {
      this.loggerService.error('Failed to connect to Redis', { error })
      throw error
    }
  }

  async disconnect() {
    this.client.destroy()
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
  .onStart(async (app) => {
    await app.decorator.redisService.connect()
  })
  .onStop(async (app) => {
    await app.decorator.redisService.disconnect()
  })

export type ElectionNotificationMessage = {
  electionId: string
  type: 'START_VOTING' | 'START_RESULT'
}

export class RedisElectionService extends RedisService {
  private expirationListeners: Array<(message: ElectionNotificationMessage) => void> = []

  constructor(
    config: { redisUri: string; database?: number },
    loggerService: ElysiaLoggerInstance
  ) {
    super(config, loggerService)
  }

  private async handleExpiration(message: string, channel: string) {
    if (!channel.startsWith('election:')) return
    for (const listener of this.expirationListeners) {
      listener(JSON.parse(message) as ElectionNotificationMessage)
    }
  }

  override async connect() {
    await super.connect()
    await this.client.configSet('notify-keyspace-events', 'Ex')
    await this.client.subscribe(
      `__keyevent@${this.config.database ?? 0}__:expired`,
      this.handleExpiration
    )
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

    return fromPromise(this.client.setEx(key, ttlSeconds, JSON.stringify(resultData)), (error) => {
      this.loggerService.error('Failed to set election publish schedule in Redis', {
        error,
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

    return fromPromise(this.client.setEx(key, ttlSeconds, JSON.stringify(resultData)), (error) => {
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

    return fromPromise(this.client.setNX(key, 'locked'), (error) => {
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
  .onStart(async (app) => {
    await app.decorator.redisElectionService.connect()
  })
  .onStop(async (app) => {
    await app.decorator.redisElectionService.disconnect()
  })
