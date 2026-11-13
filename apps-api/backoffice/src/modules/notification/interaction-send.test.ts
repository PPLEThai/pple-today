import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import {
  type CallbackSendConfig,
  type CallbackTarget,
  prepareInteractionSend,
} from './interaction-send'

const NOW = new Date('2026-07-01T00:00:00.000Z')
const INTERACTION = {
  ref: 'r',
  expiresAt: '2026-07-25T00:00:00.000Z',
  actions: [{ id: 'approve', label: 'OK' }],
}
const FULL: CallbackSendConfig = {
  platformRelayUrl: 'https://r',
  platformRelayToken: 't',
  secretKey: 'k',
}

const run = (target: CallbackTarget | null, callbackConfig?: CallbackSendConfig) =>
  prepareInteractionSend({
    input: INTERACTION,
    enabled: true,
    bypass: false,
    app: { id: 'app' },
    getCallbackTarget: async () => target,
    callbackConfig,
    now: NOW,
  })

const platform: CallbackTarget = {
  source: MiniAppSource.PLATFORM,
  notificationCallbackUrl: null,
  notificationCallbackSecret: null,
}
const admin: CallbackTarget = {
  source: MiniAppSource.ADMIN,
  notificationCallbackUrl: 'https://a.example/hook',
  notificationCallbackSecret: 'enc',
}

describe('prepareInteractionSend callback check mirrors resolveCallbackTarget', () => {
  test('PLATFORM needs the relay URL and token', async () => {
    expect((await run(platform, FULL)).isOk()).toBe(true)
    for (const cfg of [
      undefined,
      { ...FULL, platformRelayUrl: undefined },
      { ...FULL, platformRelayToken: undefined },
    ]) {
      const r = await run(platform, cfg)
      expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK)
    }
  })

  test('ADMIN needs a URL, a secret and the encryption key', async () => {
    expect((await run(admin, FULL)).isOk()).toBe(true)
    for (const [target, cfg] of [
      [{ ...admin, notificationCallbackUrl: null }, FULL],
      [{ ...admin, notificationCallbackSecret: null }, FULL],
      [admin, { ...FULL, secretKey: undefined }],
      [admin, undefined],
    ] as const) {
      const r = await run(target, cfg)
      expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK)
    }
  })

  test('no target at all is refused', async () => {
    expect((await run(null, FULL))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK
    )
  })
})

describe('prepareInteractionSend for an admin-portal send', () => {
  const portal = (overrides: Partial<Parameters<typeof prepareInteractionSend>[0]> = {}) =>
    prepareInteractionSend({
      input: INTERACTION,
      enabled: true,
      bypass: false,
      app: null,
      collectedInPortal: true,
      getCallbackTarget: async () => {
        throw new Error('a portal send has no callback target to look up')
      },
      now: NOW,
      ...overrides,
    })

  test('needs no app and no callback: the answers stay here', async () => {
    const r = await portal()
    expect(r._unsafeUnwrap()?.expiresAt).toEqual(new Date(INTERACTION.expiresAt))
  })

  test('still refuses a malformed interaction, bypass, and the flag being off', async () => {
    expect((await portal({ input: { actions: [] } }))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INVALID_INTERACTION
    )
    expect((await portal({ bypass: true }))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED
    )
    expect((await portal({ enabled: false }))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED
    )
  })

  test('without the flag, an unbound send is still refused for having no callback', async () => {
    expect((await portal({ collectedInPortal: false }))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_INTERACTION_NO_CALLBACK
    )
  })
})
