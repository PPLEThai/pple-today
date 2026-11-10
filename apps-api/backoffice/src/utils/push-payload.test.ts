import { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import {
  buildDismissMessage,
  buildFcmMessage,
  type BuildFcmMessageOptions,
  PushNotificationContent,
  PushToken,
} from './push-payload'

import type { StoredInteraction } from '../modules/notification/interaction'
import { verifyResponseToken } from '../modules/notification/response-token'

const CONTENT: PushNotificationContent = {
  title: 'Canvassing today',
  message: 'Three streets left in Bang Rak',
  notificationId: 'notification-id',
}

const APP = { name: 'Canvassing', icon: 'https://cdn.example/canvassing.png' }

const token = (overrides: Partial<PushToken> = {}): PushToken => ({
  token: 'device-token',
  userId: 'user-1',
  platform: null,
  supportsAppBranding: false,
  supportsTrayInteraction: false,
  ...overrides,
})

const ios = (overrides: Partial<PushToken> = {}) =>
  token({ platform: NotificationTokenPlatform.IOS, ...overrides })
const android = (overrides: Partial<PushToken> = {}) =>
  token({ platform: NotificationTokenPlatform.ANDROID, ...overrides })

const build = (
  target: PushToken,
  data: PushNotificationContent = CONTENT,
  androidBrandedPushDisabled = false
) => buildFcmMessage(target, data, { androidBrandedPushDisabled })

describe('the unattributed payload is exactly what it has always been', () => {
  test('a platform notification keeps the notification block on every platform', () => {
    for (const target of [token(), ios(), android({ supportsAppBranding: true })]) {
      const message = build(target)

      expect(message.notification).toEqual({ title: CONTENT.title, body: CONTENT.message })
      expect(message.android?.notification?.click_action).toBe('.MainActivity')
      expect(message.apns?.payload.aps.alert).toBeUndefined()
    }
  })

  test('the content image still fills the thumbnail when no app is claiming it', () => {
    const message = build(ios(), { ...CONTENT, image: 'https://cdn.example/photo.jpg' })

    expect(message.apns?.fcm_options?.image).toBe('https://cdn.example/photo.jpg')
  })

  test('a capable Android token is only sent data-only for an *attributed* send', () => {
    // The whole point of confining data-only to attributed sends: general and
    // central-team broadcast traffic stays on the payload Play services can
    // display without starting the app.
    const message = build(android({ supportsAppBranding: true }))

    expect(message.notification).toBeDefined()
  })
})

describe('iOS carries the app in the payload, with no app release', () => {
  test('the app name lands in the banner subtitle and its icon in the thumbnail', () => {
    const message = build(ios(), { ...CONTENT, app: APP })

    expect(message.apns?.payload.aps.alert).toEqual({
      title: CONTENT.title,
      body: CONTENT.message,
      subtitle: APP.name,
    })
    expect(message.apns?.fcm_options?.image).toBe(APP.icon)
  })

  test('a token registered before this change is branded too', () => {
    // An install that has not upgraded has platform = null, and the apns block
    // is the whole of the iOS change — so iOS branding does not wait on a
    // release. An Android install behind a null platform is unaffected: it
    // still receives today's notification payload and ignores the apns block.
    const message = build(token(), { ...CONTENT, app: APP })

    expect(message.apns?.payload.aps.alert?.subtitle).toBe(APP.name)
    expect(message.notification).toEqual({ title: CONTENT.title, body: CONTENT.message })
  })

  test('the app icon takes the thumbnail from the content image', () => {
    const message = build(ios(), {
      ...CONTENT,
      image: 'https://cdn.example/photo.jpg',
      app: APP,
    })

    expect(message.apns?.fcm_options?.image).toBe(APP.icon)
  })

  test('an icon FCM cannot fetch costs the icon, never the name', () => {
    for (const icon of [null, 'data:image/png;base64,iVBORw0KGgo=']) {
      const message = build(ios(), {
        ...CONTENT,
        image: 'https://cdn.example/photo.jpg',
        app: { name: APP.name, icon },
      })

      // Falls back to the default app icon rather than letting the content
      // image take the slot the app icon was claiming.
      expect(message.apns?.fcm_options?.image).toBeUndefined()
      expect(message.apns?.payload.aps.alert?.subtitle).toBe(APP.name)
    }
  })
})

describe('every attributed send names its app in the data payload', () => {
  // The foreground toast is built by the client from the message it receives, on
  // both platforms, and a notification the OS brands but the toast does not would
  // look like two different senders depending on whether the app happened to be
  // open. `aps.alert.subtitle` is not readable as data, so the identity is
  // repeated where the client can reach it.
  test('an iOS attributed send carries the app name and icon as data', () => {
    const message = build(ios(), { ...CONTENT, app: APP })

    expect(message.data).toMatchObject({ appName: APP.name, appIconUrl: APP.icon })
  })

  test('so does an Android send that stayed on today’s notification payload', () => {
    const message = build(android(), { ...CONTENT, app: APP })

    expect(message.data).toMatchObject({ appName: APP.name, appIconUrl: APP.icon })
  })

  test('the kill switch withdraws the data-only payload, not the app’s identity', () => {
    const message = build(android({ supportsAppBranding: true }), { ...CONTENT, app: APP }, true)

    expect(message.data).toMatchObject({ appName: APP.name, appIconUrl: APP.icon })
  })

  test('an unattributed send names no app, so the client keeps the platform bell', () => {
    const message = build(ios())

    expect(message.data).not.toHaveProperty('appName')
    expect(message.data).not.toHaveProperty('appIconUrl')
  })

  test('an icon the client cannot fetch either is left out, and the name kept', () => {
    // The same rule as the push itself: the two halves of an identity fail
    // independently. A base64 data URI would also blow the 4KB data budget.
    for (const icon of [null, 'data:image/png;base64,iVBORw0KGgo=']) {
      const message = build(ios(), { ...CONTENT, app: { name: APP.name, icon } })

      expect(message.data?.appName).toBe(APP.name)
      expect(message.data).not.toHaveProperty('appIconUrl')
    }
  })
})

describe('Android branding is data-only, and only where it is safe', () => {
  test('a capable token gets no notification block, so the client can brand it', () => {
    const message = build(android({ supportsAppBranding: true }), { ...CONTENT, app: APP })

    expect(message).not.toHaveProperty('notification')
    expect(message.android?.notification).toBeUndefined()
    // A data-only message has to wake the app to be displayed at all.
    expect(message.android?.priority).toBe('HIGH')
    expect(message.data).toMatchObject({
      title: CONTENT.title,
      body: CONTENT.message,
      appName: APP.name,
      appIconUrl: APP.icon,
      notificationId: 'notification-id',
    })
  })

  test('the content image stays out of the push entirely', () => {
    // One icon slot, one rule — the app icon wins, and the content image is
    // left to the notification centre and the detail screen.
    const message = build(android({ supportsAppBranding: true }), {
      ...CONTENT,
      image: 'https://cdn.example/photo.jpg',
      app: APP,
    })

    expect(JSON.stringify(message)).not.toContain('photo.jpg')
  })

  test('a token that never asserted the capability keeps today’s payload', () => {
    // An install on an older build cannot render a data-only message, so it
    // would simply never see the notification.
    const message = build(android(), { ...CONTENT, app: APP })

    expect(message.notification).toEqual({ title: CONTENT.title, body: CONTENT.message })
    expect(message.android?.notification?.click_action).toBe('.MainActivity')
  })

  test('that fallback keeps the content image, because it is not the icon slot', () => {
    // `android.notification.image` is the expanded big picture; the collapsed
    // icon is the large icon, which FCM cannot set per notification at all.
    // Nothing is competing with the app icon here, so dropping the big picture
    // would cost an image notification its image for no gain — unlike iOS,
    // where the app icon really does displace the thumbnail.
    const message = build(android(), {
      ...CONTENT,
      image: 'https://cdn.example/photo.jpg',
      app: APP,
    })

    expect(message.android?.notification?.image).toBe('https://cdn.example/photo.jpg')
  })

  test('an app with an unusable icon still brands by name', () => {
    const message = build(android({ supportsAppBranding: true }), {
      ...CONTENT,
      app: { name: APP.name, icon: null },
    })

    expect(message.data?.appName).toBe(APP.name)
    expect(message.data).not.toHaveProperty('appIconUrl')
  })
})

describe('the app icon badge carries the recipient’s unread total', () => {
  const withBadge = { ...CONTENT, unreadCount: 7 }

  test('iOS gets it as aps.badge, which APNs applies without waking the app', () => {
    for (const message of [build(ios(), withBadge), build(ios(), { ...withBadge, app: APP })]) {
      expect(message.apns?.payload.aps.badge).toBe(7)
    }
  })

  test('Android gets it as notification_count, for launchers that badge', () => {
    const message = build(android(), withBadge)

    expect(message.android?.notification?.notification_count).toBe(7)
  })

  test('the data-only payload carries it as data, its only route to the badge', () => {
    // No `notification` block means no `notification_count`, so the client sets
    // the badge by hand when it presents — see `presentBrandedPush`.
    const message = build(android({ supportsAppBranding: true }), { ...withBadge, app: APP })

    expect(message.data.badge).toBe('7')
  })

  test('every payload repeats it as data, for a client that is already open', () => {
    // `aps.badge` and `notification_count` are write-only as far as the app is
    // concerned, so a foregrounded client can only learn the authoritative
    // count from `data` — otherwise it increments a guess of its own.
    for (const target of [token(), ios(), android()]) {
      expect(build(target, withBadge).data.badge).toBe('7')
    }
  })

  test('zero is a real count and travels like any other', () => {
    // Not merely falsy-safe: a send that leaves the recipient on zero unread —
    // every earlier notification already read — has to clear the badge, and
    // dropping it here would strand the last number the OS was shown.
    const message = build(ios(), { ...CONTENT, unreadCount: 0 })

    expect(message.apns?.payload.aps.badge).toBe(0)
    expect(message.data.badge).toBe('0')
  })

  test('a send with no count sets no badge, rather than clearing it', () => {
    // The count is read on a best-effort basis; when it fails, leaving the OS
    // showing a stale number beats showing a wrong zero.
    const message = build(ios())

    expect(message.apns?.payload.aps.badge).toBeUndefined()
    expect(message.data).not.toHaveProperty('badge')
  })
})

describe('the kill switch', () => {
  test('puts every Android token back on today’s payload, capability or not', () => {
    // The only mitigation for a data-only push being dropped by an OEM: no app
    // release, no unbinding keys, branding simply degrades to unbranded.
    const message = build(android({ supportsAppBranding: true }), { ...CONTENT, app: APP }, true)

    expect(message.notification).toEqual({ title: CONTENT.title, body: CONTENT.message })
    expect(message.android?.notification?.click_action).toBe('.MainActivity')
  })

  test('leaves iOS branding alone — it is not the risk being mitigated', () => {
    const message = build(ios(), { ...CONTENT, app: APP }, true)

    expect(message.apns?.payload.aps.alert?.subtitle).toBe(APP.name)
  })
})

describe('interactive sends carry the tray data', () => {
  const NOW = new Date('2026-11-10T04:00:00.000Z')
  const SECRET = 'tray-secret'
  const EXPIRES = new Date('2026-11-17T00:00:00.000Z')

  const SPEC: StoredInteraction = {
    v: 1,
    ref: 'leave:123',
    fields: [],
    actions: [
      { id: 'approve', label: 'อนุมัติ', icon: 'check', style: 'primary' },
      { id: 'reject', label: 'ไม่อนุมัติ', style: 'destructive' },
    ],
    tray: true,
  }
  const interactive = (
    overrides: Partial<PushNotificationContent> = {}
  ): PushNotificationContent => ({
    ...CONTENT,
    app: APP,
    interaction: { spec: SPEC, expiresAt: EXPIRES },
    ...overrides,
  })
  const capable = (overrides: Partial<PushToken> = {}) =>
    android({ supportsAppBranding: true, supportsTrayInteraction: true, ...overrides })
  const buildTray = (
    target: PushToken,
    data: PushNotificationContent = interactive(),
    options: Partial<BuildFcmMessageOptions> = {}
  ) =>
    buildFcmMessage(target, data, {
      androidBrandedPushDisabled: false,
      responseTokenSecret: SECRET,
      now: NOW,
      ...options,
    })

  test('a capable token gets the shape and a token minted for that user and notification', () => {
    const message = buildTray(capable({ userId: 'user-9' }))

    expect(JSON.parse(message.data.pple_interaction)).toEqual({
      id: CONTENT.notificationId,
      kind: 'buttons',
      actions: [
        { id: 'approve', label: 'อนุมัติ', icon: 'check', bg: true },
        { id: 'reject', label: 'ไม่อนุมัติ', destructive: true, bg: true },
      ],
    })
    const verified = verifyResponseToken(message.data.pple_response_token, SECRET, NOW)
    expect(verified).toEqual({
      ok: true,
      notificationId: CONTENT.notificationId,
      userId: 'user-9',
      exp: Math.floor(EXPIRES.getTime() / 1000),
    })
  })

  test('the notification id is in the data, because the client keys on it', () => {
    expect(buildTray(capable()).data.notificationId).toBe(CONTENT.notificationId)
  })

  test('without an expiry the token lives 30 days', () => {
    const message = buildTray(
      capable(),
      interactive({ interaction: { spec: SPEC, expiresAt: null } })
    )

    const verified = verifyResponseToken(message.data.pple_response_token, SECRET, NOW)
    expect(verified.ok && verified.exp).toBe(Math.floor(NOW.getTime() / 1000) + 30 * 24 * 60 * 60)
  })

  test('iOS gets it too, when the build supports it', () => {
    const message = buildTray(ios({ supportsTrayInteraction: true }))

    expect(message.data.pple_interaction).toBeDefined()
    expect(message.data.pple_response_token).toBeDefined()
    // ...on the `notification` payload the Notification Service Extension reads.
    expect(message.notification).toBeDefined()
  })

  test('a token that did not assert the capability gets neither key', () => {
    const message = buildTray(android({ supportsAppBranding: true }))

    expect(message.data.pple_interaction).toBeUndefined()
    expect(message.data.pple_response_token).toBeUndefined()
  })

  test.each([
    ['the tray kill switch is on', { trayInteractionDisabled: true }],
    ['no secret is configured', { responseTokenSecret: undefined }],
  ])('nothing is sent when %s', (_name, options) => {
    const message = buildTray(capable(), interactive(), options)

    expect(message.data.pple_interaction).toBeUndefined()
    expect(message.data.pple_response_token).toBeUndefined()
  })

  test('nothing is sent for a shape the tray cannot show', () => {
    const form = {
      ...SPEC,
      fields: [
        {
          id: 'pick',
          type: 'radio' as const,
          label: 'เลือก',
          required: false,
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        },
      ],
    }

    const message = buildTray(
      capable(),
      interactive({ interaction: { spec: form, expiresAt: null } })
    )
    const optedOut = buildTray(
      capable(),
      interactive({ interaction: { spec: { ...SPEC, tray: false }, expiresAt: null } })
    )

    for (const m of [message, optedOut]) {
      expect(m.data.pple_interaction).toBeUndefined()
      expect(m.data.pple_response_token).toBeUndefined()
    }
  })

  test('nothing is sent once the interaction has expired', () => {
    const message = buildTray(
      capable(),
      interactive({ interaction: { spec: SPEC, expiresAt: new Date('2026-11-10T03:00:00.000Z') } })
    )

    expect(message.data.pple_interaction).toBeUndefined()
  })

  test('a plain send carries neither key, whatever the token supports', () => {
    const message = buildTray(capable(), { ...CONTENT, app: APP })

    expect(message.data.pple_interaction).toBeUndefined()
    expect(message.data.pple_response_token).toBeUndefined()
  })

  test('the three-action payload stays well inside the 4KB data limit', () => {
    const long = {
      ...SPEC,
      actions: ['a', 'b', 'c'].map((id) => ({
        id,
        label: 'ก'.repeat(24),
        style: 'primary' as const,
      })),
    }
    const message = buildTray(
      capable(),
      interactive({ interaction: { spec: long, expiresAt: EXPIRES } })
    )

    const bytes = Object.values(message.data).reduce((n, v) => n + Buffer.byteLength(v), 0)
    expect(bytes).toBeLessThan(4096)
  })
})

describe('the dismiss message', () => {
  test('is data-only, high priority, and names just the notification', () => {
    expect(buildDismissMessage('device-token', 'notification-id')).toEqual({
      token: 'device-token',
      data: { pple_dismiss: 'notification-id' },
      android: { priority: 'HIGH' },
    })
  })
})
