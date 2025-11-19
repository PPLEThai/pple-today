import Elysia from 'elysia'

import { HealthStatus } from './models'

export class HealthService {
  constructor() {}

  async checkReadiness(): Promise<{
    isReady: boolean
    details: Record<string, { status: HealthStatus }>
  }> {
    return {
      isReady: true,
      details: {},
    }
  }
}

export const HealthServicePlugin = new Elysia({
  name: 'HealthService',
}).decorate(() => ({
  healthService: new HealthService(),
}))
