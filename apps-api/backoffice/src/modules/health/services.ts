import Elysia from 'elysia'

import { HealthStatus } from './models'
import { HealthRepository, HealthRepositoryPlugin } from './repository'

export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async checkReadiness(): Promise<{
    isReady: boolean
    details: {
      database: {
        status: HealthStatus
      }
    }
  }> {
    const databaseConnection = await this.healthRepository.checkDatabaseConnection()

    return {
      isReady: databaseConnection,
      details: {
        database: {
          status: databaseConnection ? HealthStatus.UP : HealthStatus.DOWN,
        },
      },
    }
  }
}

export const HealthServicePlugin = new Elysia({
  name: 'HealthService',
})
  .use(HealthRepositoryPlugin)
  .decorate(({ healthRepository }) => ({
    healthService: new HealthService(healthRepository),
  }))
