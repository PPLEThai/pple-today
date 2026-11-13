import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import { type StoredInteraction, validateInteractionSpec } from './interaction'

/** An interaction that passed every send-time check, ready to store. */
export interface PreparedInteraction {
  spec: StoredInteraction
  /** Lifted out of the spec so "is it open?" is a column check. */
  expiresAt: Date | null
}

/** Where an app's answers go. Only what the send-time check needs. */
export interface CallbackTarget {
  source: MiniAppSource
  notificationCallbackUrl: string | null
  notificationCallbackSecret: string | null
}

/**
 * The deployment config a callback needs, mirroring `resolveCallbackTarget`:
 * PLATFORM apps need the relay URL and token, ADMIN apps need the secret key.
 */
export interface CallbackSendConfig {
  platformRelayUrl?: string
  platformRelayToken?: string
  secretKey?: string
}

/**
 * The send-time checks for `interaction`, shared by both bound send paths
 * (docs/interactive-notifications.md, "Send-time refusals"). Every refusal is a
 * 400 and nothing is sent.
 *
 * Order: flag, bypass, shape, callback target. The cheap checks come first so
 * the callback lookup only happens for an interaction that is otherwise valid.
 * `undefined` input is not an interactive send and passes straight through, even
 * with the flag off.
 */
export async function prepareInteractionSend(args: {
  input: unknown
  enabled: boolean
  /** `content.link.bypassNotificationCenter === true` on the raw path. */
  bypass: boolean
  /** The sending app, or null for an unbound key. */
  app: { id: string } | null
  /**
   * Answers are kept in today-v2 and read in the admin portal rather than
   * POSTed to an app (`NotificationOrigin.ADMIN_PORTAL`). There is no callback
   * target to check, so `app` and the callback config are not consulted.
   */
  collectedInPortal?: boolean
  getCallbackTarget: (miniAppId: string) => Promise<CallbackTarget | null>
  /** Callback config of this deployment. Absent counts as nothing configured. */
  callbackConfig?: CallbackSendConfig
  now: Date
}) {
  if (args.input === undefined) return ok<PreparedInteraction | undefined>(undefined)

  if (!args.enabled) {
    return err({
      code: InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED,
      message: 'Interactive notifications are not enabled.',
    })
  }

  if (args.bypass) {
    return err({
      code: InternalErrorCode.NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED,
      message:
        'bypassNotificationCenter cannot be used with an interaction: the form lives on the notification detail screen.',
    })
  }

  const validated = validateInteractionSpec(args.input, args.now)
  if (!validated.ok) {
    return err({
      code: InternalErrorCode.NOTIFICATION_INVALID_INTERACTION,
      message: `${validated.path}: ${validated.message}`,
    })
  }

  if (args.collectedInPortal) {
    return ok<PreparedInteraction | undefined>({
      spec: validated.spec,
      expiresAt: validated.expiresAt,
    })
  }

  const noCallback = () =>
    err({
      code: InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK,
      message:
        'The sending app has no usable callback target. An interaction needs an app with a callback URL and signing secret (or a platform app), and a server configured to deliver to it, because the answer is POSTed back.',
    })
  if (!args.app) return noCallback()

  const target = await args.getCallbackTarget(args.app.id)
  // Mirrors `resolveCallbackTarget`: refuse now whatever delivery could not do later.
  // PLATFORM apps deliver through the relay; ADMIN apps need a URL, a secret and the key.
  const config = args.callbackConfig ?? {}
  const hasTarget =
    target !== null &&
    (target.source === MiniAppSource.PLATFORM
      ? Boolean(config.platformRelayUrl && config.platformRelayToken)
      : Boolean(
          target.notificationCallbackUrl && target.notificationCallbackSecret && config.secretKey
        ))
  if (!hasTarget) return noCallback()

  return ok<PreparedInteraction | undefined>({
    spec: validated.spec,
    expiresAt: validated.expiresAt,
  })
}
