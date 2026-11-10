import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

import { readClientInteraction } from './interaction-read'
import type { InteractionRepository } from './interaction-repository'
import type { LiveActivityRepository } from './live-activity-repository'
import { verifyResponseToken } from './response-token'

import type { LiveActivityContentState } from '../../utils/push-payload'

/** Most activities one sweep ends, so a backlog cannot make a run unbounded. */
export const LIVE_ACTIVITY_SWEEP_LIMIT = 200

/** The one thing the service needs from FCM; narrow so tests need no config graph. */
export interface LiveActivityEndSender {
  sendLiveActivityEnds(
    ends: { deviceToken: string; pushToken: string; state: LiveActivityContentState }[]
  ): Promise<{ ok: boolean; error?: unknown }[]>
}

/** What the answer and close paths call after their commit. Never throws. */
export interface LiveActivityEnder {
  endForAnswer(notificationId: string, userId: string, actionLabel: string): Promise<void>
  endForClose(notificationId: string): Promise<void>
}

/**
 * Live Activity bookkeeping: storing each activity's update token, and ending
 * activities when the question is answered, closed or expires
 * (docs/interactive-notifications.md, "Ending it on every device").
 *
 * Everything that sends is best effort: a failure is logged and never reaches
 * the request that triggered it.
 */
export class LiveActivityService implements LiveActivityEnder {
  constructor(
    private readonly liveActivityRepository: Pick<
      LiveActivityRepository,
      'getDeviceTokenByHash' | 'upsert' | 'listUnended' | 'listExpiredUnended' | 'markEnded'
    >,
    private readonly interactionRepository: Pick<InteractionRepository, 'getForResponse'>,
    private readonly sender: LiveActivityEndSender,
    private readonly loggerService: ElysiaLoggerInstance,
    private readonly options: {
      interactiveNotificationsEnabled: boolean
      /** `LIVE_ACTIVITY_DISABLED`: ends are not sent and rows stay un-ended. */
      liveActivityDisabled?: boolean
      responseTokenSecret?: string
      responseTokenSecretPrevious?: string
    },
    private readonly now: () => Date = () => new Date()
  ) {}

  /**
   * Store the update token of an activity, authorised by the tray response
   * token alone (no session: this runs headless). Checks match the tray answer
   * path: signature and expiry, same notification, device still registered
   * (all 401), then the caller must be a recipient with an interaction (404).
   * Answers with this user's interaction state. A row for a question that is no
   * longer open is stored already ended: there is nothing to end remotely, the
   * app ends it locally from the state.
   */
  async registerPushToken(
    notificationId: string,
    responseToken: string | undefined,
    pushToken: string
  ) {
    const invalidToken = () =>
      err({
        code: InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID,
        message: 'The response token is invalid or has expired',
      })

    const { responseTokenSecret, responseTokenSecretPrevious } = this.options
    const secrets = [responseTokenSecret, responseTokenSecretPrevious].filter((s): s is string =>
      Boolean(s)
    )
    const verified =
      responseToken && secrets.length > 0
        ? verifyResponseToken(responseToken, secrets, this.now())
        : null
    if (!verified?.ok || verified.notificationId !== notificationId) return invalidToken()

    const device = await this.liveActivityRepository.getDeviceTokenByHash(
      verified.userId,
      verified.deviceHash
    )
    if (device.isErr()) return mapRepositoryError(device.error)
    if (!device.value) return invalidToken()

    const loaded = await this.interactionRepository.getForResponse(verified.userId, notificationId)
    if (loaded.isErr()) return mapRepositoryError(loaded.error)
    const now = this.now()
    const interaction = loaded.value
      ? readClientInteraction(loaded.value, now, {
          enabled: this.options.interactiveNotificationsEnabled,
        })
      : undefined
    if (!interaction) {
      return err({
        code: InternalErrorCode.NOTIFICATION_NOT_FOUND,
        message: 'Notification not found',
      })
    }

    const stored = await this.liveActivityRepository.upsert({
      notificationId,
      userId: verified.userId,
      deviceToken: device.value,
      pushToken,
      ended: interaction.state !== 'OPEN',
      now,
    })
    if (stored.isErr()) return mapRepositoryError(stored.error)

    const actionLabel =
      interaction.state === 'RESPONDED'
        ? interaction.actions.find((a) => a.id === interaction.response?.actionId)?.label
        : undefined
    return ok({ state: interaction.state, ...(actionLabel ? { actionLabel } : {}) })
  }

  /** The user answered (any channel): end their own activities for it. */
  async endForAnswer(notificationId: string, userId: string, actionLabel: string) {
    await this.guarded('answer', async () => {
      const rows = await this.liveActivityRepository.listUnended({ notificationId, userId })
      if (rows.isErr()) throw rows.error
      await this.end(
        rows.value.map((r) => ({ ...r, state: { status: 'answered', label: actionLabel } }))
      )
    })
  }

  /** The app closed the question: end every activity of the notification. */
  async endForClose(notificationId: string) {
    await this.guarded('close', async () => {
      const rows = await this.liveActivityRepository.listUnended({ notificationId })
      if (rows.isErr()) throw rows.error
      await this.end(rows.value.map((r) => ({ ...r, state: { status: 'closed' } })))
    })
  }

  /**
   * Called by the callback sweep: end activities whose question has expired.
   * Returns how many it ended. Bounded by `LIVE_ACTIVITY_SWEEP_LIMIT`.
   */
  async sweepExpired(): Promise<number> {
    let ended = 0
    await this.guarded('sweep', async () => {
      if (this.options.liveActivityDisabled) return
      const rows = await this.liveActivityRepository.listExpiredUnended(
        this.now(),
        LIVE_ACTIVITY_SWEEP_LIMIT
      )
      if (rows.isErr()) throw rows.error
      ended = await this.end(
        rows.value.map((r) => ({
          id: r.id,
          deviceToken: r.deviceToken,
          pushToken: r.pushToken,
          state: r.notification.interactionClosedAt ? { status: 'closed' } : { status: 'expired' },
        }))
      )
    })
    return ended
  }

  /**
   * Sends the end pushes and stamps `endedAt` whether or not FCM accepted each
   * one (failures are logged). While `LIVE_ACTIVITY_DISABLED` is on nothing is
   * sent and the rows stay un-ended.
   */
  private async end(
    items: {
      id: string
      deviceToken: string
      pushToken: string
      state: LiveActivityContentState
    }[]
  ) {
    if (items.length === 0 || this.options.liveActivityDisabled) return 0
    const results = await this.sender.sendLiveActivityEnds(
      items.map(({ deviceToken, pushToken, state }) => ({ deviceToken, pushToken, state }))
    )
    results.forEach((r, i) => {
      if (!r.ok) {
        this.loggerService.error({
          message: 'Failed to send a Live Activity end push',
          liveActivityId: items[i].id,
          details: r.error,
        })
      }
    })
    const marked = await this.liveActivityRepository.markEnded(
      items.map((i) => i.id),
      this.now()
    )
    if (marked.isErr()) throw marked.error
    return items.length
  }

  private async guarded(what: string, fn: () => Promise<void>) {
    try {
      await fn()
    } catch (e) {
      this.loggerService.error({
        message: `Failed to end Live Activities (${what})`,
        details: e,
      })
    }
  }
}
