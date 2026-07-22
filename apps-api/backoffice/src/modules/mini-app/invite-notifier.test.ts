import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, ok } from 'neverthrow'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { InviteNotifier } from './invite-notifier'

import type { NotificationRepository } from '../notification/repository'

const loggerService = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
} as unknown as ElysiaLoggerInstance

const INVITEE_PHONE = '+66812345678'
const miniApp = { name: 'Canvassing' }

const createNotifier = (sendNotificationToUser: ReturnType<typeof vi.fn>) =>
  new InviteNotifier({ sendNotificationToUser } as unknown as NotificationRepository, loggerService)

afterEach(() => {
  vi.clearAllMocks()
})

describe('InviteNotifier.notifyInvitee', () => {
  test('sends through the shared pipeline addressed to the one number, with no API key', async () => {
    const sendNotificationToUser = vi
      .fn()
      .mockResolvedValue(ok({ success: [INVITEE_PHONE], failed: [] }))

    await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp)

    const [audience, content, apiKeyId] = sendNotificationToUser.mock.calls[0]
    expect(audience).toEqual({ type: 'PHONE_NUMBER', details: [INVITEE_PHONE] })
    expect(content.message).toContain('Canvassing')
    // Platform-internal send: no key to meter it against.
    expect(apiKeyId).toBeUndefined()
  })

  test('names the inviter in the message when one is given', async () => {
    const sendNotificationToUser = vi
      .fn()
      .mockResolvedValue(ok({ success: [INVITEE_PHONE], failed: [] }))

    await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp, 'สมชาย')

    const [, content] = sendNotificationToUser.mock.calls[0]
    expect(content.message).toContain('สมชาย')
    expect(content.message).toContain('Canvassing')
  })

  test('falls back to passive phrasing when the inviter is unknown', async () => {
    const sendNotificationToUser = vi
      .fn()
      .mockResolvedValue(ok({ success: [INVITEE_PHONE], failed: [] }))

    await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp)

    const [, content] = sendNotificationToUser.mock.calls[0]
    // No inviter name, so it must not read "undefined เชิญคุณ".
    expect(content.message).not.toContain('undefined')
    expect(content.message).toContain('คุณถูกเชิญให้ทดลองใช้')
    // Not a deep link into the Beta app (there is nothing to open yet) but the
    // MINI_APP_INVITE marker the client turns into the inline accept/decline
    // inbox / a tap through to the แอป tab.
    expect(content.link).toEqual({
      type: 'IN_APP_NAVIGATION',
      destination: { inAppType: 'MINI_APP_INVITE', inAppId: '' },
    })
  })

  test('reports delivered when the number reached a PPLE Today account', async () => {
    const sendNotificationToUser = vi
      .fn()
      .mockResolvedValue(ok({ success: [INVITEE_PHONE], failed: [] }))

    expect(await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp)).toBe(
      true
    )
  })

  test('reports undelivered when no account exists for the number', async () => {
    // The pipeline resolves Ok even for a number it could not reach — it lists
    // it under `failed`. Trusting Ok alone would tell the Builder their tester
    // had been contacted when nobody was.
    const sendNotificationToUser = vi
      .fn()
      .mockResolvedValue(ok({ success: [], failed: [INVITEE_PHONE] }))

    expect(await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp)).toBe(
      false
    )
  })

  test('reports undelivered, and logs, when the pipeline itself fails', async () => {
    const sendNotificationToUser = vi.fn().mockResolvedValue(err({ code: 'UNKNOWN_ERROR' }))

    expect(await createNotifier(sendNotificationToUser).notifyInvitee(INVITEE_PHONE, miniApp)).toBe(
      false
    )
    expect(loggerService.error).toHaveBeenCalled()
  })
})
