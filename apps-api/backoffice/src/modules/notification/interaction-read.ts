import type { NotificationInteraction } from '@pple-today/api-common/dtos'
import { NotificationOrigin } from '@pple-today/database/prisma'

import { deriveInteractionState, type StoredInteraction, toClientInteraction } from './interaction'

/** The slice of a Notification row (plus the caller's own response) that decides what the client sees. */
export interface InteractionRow {
  interaction: unknown
  interactionExpiresAt: Date | null
  interactionClosedAt: Date | null
  miniApp: { retiredAt: Date | null } | null
  /** Absent reads as `API`: the row predates origin, or the caller did not select it. */
  origin?: NotificationOrigin
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
 * True when the app that sent the notification no longer accepts answers: it was
 * retired, or deleted (`miniApp` is null because `miniAppId` was set null).
 *
 * An `ADMIN_PORTAL` notification never had an app: its answers are kept here and
 * read in the admin portal, so having no app is its normal state, not a gone one.
 */
export const isAppGone = (row: Pick<InteractionRow, 'miniApp' | 'origin'>) =>
  row.origin !== NotificationOrigin.ADMIN_PORTAL &&
  (row.miniApp === null || row.miniApp.retiredAt != null)

/**
 * The client-facing interaction for one caller, or undefined for a notification
 * that has none (or one stored in a shape this build does not know).
 *
 * `enabled` is `INTERACTIVE_NOTIFICATIONS_ENABLED`. While it is off nothing can
 * be answered, so anything not already RESPONDED reads CLOSED rather than
 * offering a form that would 503.
 */
export function readClientInteraction(
  row: InteractionRow,
  now: Date,
  { enabled }: { enabled: boolean }
): NotificationInteraction | undefined {
  if (!isStoredInteraction(row.interaction)) return undefined
  const response = row.responses[0]
  const state = deriveInteractionState({
    hasResponse: response !== undefined,
    closedAt: row.interactionClosedAt,
    expiresAt: row.interactionExpiresAt,
    appGone: isAppGone(row),
    now,
  })
  return toClientInteraction(
    row.interaction,
    !enabled && state !== 'RESPONDED' ? 'CLOSED' : state,
    response
      ? {
          actionId: response.actionId,
          values: response.values as Record<string, string | string[]> | null,
          respondedAt: response.respondedAt,
        }
      : undefined
  )
}
