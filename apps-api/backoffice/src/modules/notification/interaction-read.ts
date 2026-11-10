import type { NotificationInteraction } from '@pple-today/api-common/dtos'

import { deriveInteractionState, type StoredInteraction, toClientInteraction } from './interaction'

/** The slice of a Notification row (plus the caller's own response) that decides what the client sees. */
export interface InteractionRow {
  interaction: unknown
  interactionExpiresAt: Date | null
  interactionClosedAt: Date | null
  miniApp: { retiredAt: Date | null } | null
  /** Already filtered to the caller by the query: zero or one row. */
  responses: {
    actionId: string
    values: unknown
    respondedAt: Date
  }[]
}

/** True when the stored JSON is an interaction this code knows how to render. */
export const isStoredInteraction = (value: unknown): value is StoredInteraction =>
  typeof value === 'object' && value !== null && (value as { v?: unknown }).v === 1

/**
 * The client-facing interaction for one caller, or undefined for a notification
 * that has none (or one stored in a shape this build does not know).
 */
export function readClientInteraction(
  row: InteractionRow,
  now: Date
): NotificationInteraction | undefined {
  if (!isStoredInteraction(row.interaction)) return undefined
  const response = row.responses[0]
  const state = deriveInteractionState({
    hasResponse: response !== undefined,
    closedAt: row.interactionClosedAt,
    expiresAt: row.interactionExpiresAt,
    appRetired: row.miniApp?.retiredAt != null,
    now,
  })
  return toClientInteraction(
    row.interaction,
    state,
    response
      ? {
          actionId: response.actionId,
          values: response.values as Record<string, string | string[]> | null,
          respondedAt: response.respondedAt,
        }
      : undefined
  )
}
