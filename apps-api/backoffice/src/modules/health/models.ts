import { Static, t } from 'elysia'

export enum HealthStatus {
  UP = 'up',
  DOWN = 'down',
}

export const HealthCheckResponse = t.Object({
  name: t.String(),
  version: t.String(),
  timestamp: t.String(),
})

export type HealthCheckResponse = Static<typeof HealthCheckResponse>

export const ReadinessCheckResponse = t.Object({
  name: t.String(),
  version: t.String(),
  timestamp: t.String(),
  details: t.Record(t.String(), t.Object({ status: t.Enum(HealthStatus) })),
})

export type ReadinessCheckResponse = Static<typeof ReadinessCheckResponse>
