import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

import { isPlatformManaged } from './policy'
import type { AdminMiniAppRepository } from './repository'

import type { NotificationCallbackSender } from '../../notification/callback-delivery'
import { encryptCallbackSecret, generateCallbackSecret } from '../../notification/callback-secret'
import {
  defaultHostLookup,
  HostLookup,
  resolvePublicAddress,
  validateCallbackUrl,
} from '../../notification/callback-target'

/** After a rotation the replaced secret keeps signing (alongside the new one) this long. */
export const SECRET_ROTATION_GRACE_MS = 24 * 3_600_000

const NOT_FOUND = {
  RECORD_NOT_FOUND: {
    code: InternalErrorCode.MINI_APP_NOT_FOUND,
    message: 'Mini app with the given ID does not exist',
  },
} as const

/**
 * Admin portal settings for where an ADMIN app's interactive-notification answers
 * are POSTed: the callback URL, its signing secret (revealed once, rotatable) and
 * a "send test event" check. PLATFORM apps are refused: their path is fixed.
 */
export class AdminMiniAppCallbackService {
  constructor(
    private readonly repository: AdminMiniAppRepository,
    private readonly sender: NotificationCallbackSender,
    private readonly secretKey: string | undefined,
    private readonly lookup: HostLookup = defaultHostLookup,
    private readonly now: () => Date = () => new Date()
  ) {}

  private async loadAdminApp(id: string) {
    const result = await this.repository.findCallbackSettings(id)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)
    if (isPlatformManaged(result.value.source)) {
      return err({
        code: InternalErrorCode.MINI_APP_PLATFORM_MANAGED,
        message: 'Platform apps deliver through the platform; there is no callback URL to set',
      })
    }
    return ok(result.value)
  }

  private requireKey() {
    if (!this.secretKey) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'NOTIFICATION_CALLBACK_SECRET_KEY is not configured',
      })
    }
    return ok(this.secretKey)
  }

  async get(id: string) {
    const app = await this.loadAdminApp(id)
    if (app.isErr()) return err(app.error)
    return ok({
      url: app.value.notificationCallbackUrl,
      hasSecret: app.value.notificationCallbackSecret !== null,
    })
  }

  /** Validate (https, no private target, by literal and by DNS) and save. */
  async setUrl(id: string, rawUrl: string) {
    const app = await this.loadAdminApp(id)
    if (app.isErr()) return err(app.error)
    const key = this.requireKey()
    if (key.isErr()) return err(key.error)

    const checked = validateCallbackUrl(rawUrl)
    const invalid = (message: string) =>
      err({ code: InternalErrorCode.MINI_APP_CALLBACK_URL_INVALID, message })
    if (!checked.ok) return invalid(checked.reason)
    const resolved = await resolvePublicAddress(checked.url, this.lookup)
    if (!resolved.ok) return invalid(resolved.reason)

    // The secret is generated when a URL is first set and shown that once.
    const isFirstSet = app.value.notificationCallbackSecret === null
    const secret = isFirstSet ? generateCallbackSecret() : null

    const saved = await this.repository.setCallbackSettings(id, {
      notificationCallbackUrl: checked.url.toString(),
      ...(secret ? { notificationCallbackSecret: encryptCallbackSecret(secret, key.value) } : {}),
    })
    if (saved.isErr()) return mapRepositoryError(saved.error, NOT_FOUND)

    return ok({ url: checked.url.toString(), secret })
  }

  /**
   * Remove the URL and both secrets (current and the rotation-grace one).
   * Answers still PENDING are not failed: each delivery attempt finds no URL, which
   * is a configuration failure, so it is rescheduled every 30 minutes without
   * using up attempts. They deliver once a URL is set again, and are marked FAILED
   * if they are still undelivered 7 days after the user answered.
   */
  async clear(id: string) {
    const app = await this.loadAdminApp(id)
    if (app.isErr()) return err(app.error)
    const saved = await this.repository.setCallbackSettings(id, {
      notificationCallbackUrl: null,
      notificationCallbackSecret: null,
      notificationCallbackPreviousSecret: null,
      notificationCallbackPreviousSecretExpiresAt: null,
    })
    if (saved.isErr()) return mapRepositoryError(saved.error, NOT_FOUND)
    return ok({ url: null, hasSecret: false })
  }

  /**
   * New secret, shown once. The replaced one moves to the "previous" slot and
   * keeps signing for 24 hours (`X-PPLE-Signature` carries both), so the app can
   * switch over without dropping answers. A second rotation inside the window
   * replaces the previous slot: only one old secret is ever honoured.
   */
  async rotateSecret(id: string) {
    const app = await this.loadAdminApp(id)
    if (app.isErr()) return err(app.error)
    if (!app.value.notificationCallbackUrl) return this.notConfigured()
    const key = this.requireKey()
    if (key.isErr()) return err(key.error)

    const secret = generateCallbackSecret()
    const saved = await this.repository.setCallbackSettings(id, {
      notificationCallbackUrl: app.value.notificationCallbackUrl,
      notificationCallbackSecret: encryptCallbackSecret(secret, key.value),
      notificationCallbackPreviousSecret: app.value.notificationCallbackSecret,
      notificationCallbackPreviousSecretExpiresAt: app.value.notificationCallbackSecret
        ? new Date(this.now().getTime() + SECRET_ROTATION_GRACE_MS)
        : null,
    })
    if (saved.isErr()) return mapRepositoryError(saved.error, NOT_FOUND)
    return ok({ secret })
  }

  async sendTestEvent(id: string) {
    const app = await this.loadAdminApp(id)
    if (app.isErr()) return err(app.error)
    if (!app.value.notificationCallbackUrl) return this.notConfigured()

    const sent = await this.sender.sendTestEvent(app.value)
    if (!sent.ok) return ok({ statusCode: null, error: sent.reason })
    if ('error' in sent.result) return ok({ statusCode: null, error: sent.result.error })
    return ok({ statusCode: sent.result.statusCode, error: null })
  }

  private notConfigured() {
    return err({
      code: InternalErrorCode.MINI_APP_CALLBACK_NOT_CONFIGURED,
      message: 'Set a callback URL first',
    })
  }
}
