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
