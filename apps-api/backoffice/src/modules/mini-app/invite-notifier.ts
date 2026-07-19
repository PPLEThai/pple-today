import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'

import type { NotificationRepository } from '../notification/repository'

export interface MiniAppForInviteNotification {
  name: string
}

/**
 * Delivers a Beta invitation through the ordinary PPLE Today notification
 * pipeline — the same path external senders use, addressed to a single phone
 * number.
 *
 * `notifyInvitee` returns a plain boolean rather than a `Result` on purpose:
 * delivery is best-effort and merely *reported*. A push that fails must never
 * roll back an invitation that was genuinely recorded, nor cost the Builder a
 * tester seat, so there is no error for a caller to propagate.
 *
 * The notification carries no deep link. An invitation is not yet access: until
 * the tester accepts there is nothing to open, so it lands in the notification
 * centre, and the invite card in the app (PPLEThai/pple-platform#7) is where the
 * accept/decline decision is actually made.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class InviteNotifier {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  async notifyInvitee(
    phoneNumber: string,
    miniApp: MiniAppForInviteNotification
  ): Promise<boolean> {
    const sendResult = await this.notificationRepository.sendNotificationToUser(
      { type: 'PHONE_NUMBER', details: [phoneNumber] },
      {
        header: 'คำเชิญทดลองใช้แอปพลิเคชัน',
        message: `คุณถูกเชิญให้ทดลองใช้ "${miniApp.name}" กดเพื่อตอบรับหรือปฏิเสธคำเชิญ`,
      },
      // Platform-internal send: there is no notification API key to meter it against.
      undefined
    )

    if (sendResult.isErr()) {
      this.loggerService.error({
        error: sendResult.error,
        message: `Failed to deliver a mini app invite notification for ${miniApp.name}`,
      })

      return false
    }

    // The pipeline succeeds even when the number matches nobody — it reports
    // such numbers under `failed`. Reporting that as delivered would tell the
    // Builder their tester had been contacted when no PPLE Today account
    // exists to receive it, so the number must actually appear in `success`.
    const delivered = sendResult.value?.success.includes(phoneNumber) ?? false

    if (!delivered) {
      this.loggerService.warn({
        message: `Mini app invite for ${miniApp.name} was not delivered: no PPLE Today account for that number`,
      })
    }

    return delivered
  }
}
