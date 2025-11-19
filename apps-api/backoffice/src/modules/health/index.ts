import Elysia from 'elysia'

import { HealthCheckResponse, ReadinessCheckResponse } from './models'
import { HealthServicePlugin } from './services'

import packageJson from '../../../package.json'

export const HealthController = new Elysia({
  tags: ['Health'],
})
  .use(HealthServicePlugin)
  .get(
    '/healthz',
    ({ status }) => {
      const body = {
        name: packageJson.name,
        version: packageJson.version,
        timestamp: new Date().toISOString(),
      }

      return status(200, body)
    },
    {
      detail: {
        summary: 'Health check endpoint',
        description: 'Health check endpoint to verify if the service is running.',
      },
      response: {
        200: HealthCheckResponse,
      },
    }
  )
  .get(
    '/readyz',
    async ({ status, healthService }) => {
      const readyStatus = await healthService.checkReadiness()

      const body = {
        name: packageJson.name,
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        details: readyStatus.details,
      }

      if (readyStatus.isReady) {
        return status(200, body)
      }

      return status(503, body)
    },
    {
      detail: {
        summary: 'Readiness check endpoint',
        description:
          'Readiness check endpoint to verify if the service is ready to handle requests.',
      },
      response: {
        200: ReadinessCheckResponse,
        503: ReadinessCheckResponse,
      },
    }
  )
