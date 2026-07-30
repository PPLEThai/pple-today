import { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { buildFcmMessage, PushNotificationContent, PushToken } from './push-payload'

const CONTENT: PushNotificationContent = {
  title: 'Canvassing today',
  message: 'Three streets left in Bang Rak',
  notificationId: 'notification-id',
}

const APP = { name: 'Canvassing', icon: 'https://cdn.example/canvassing.png' }

const token = (overrides: Partial<PushToken> = {}): PushToken => ({
  token: 'device-token',
  platform: null,
  supportsAppBranding: false,
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

  test('an app with an unusable icon still brands by name', () => {
    const message = build(android({ supportsAppBranding: true }), {
      ...CONTENT,
      app: { name: APP.name, icon: null },
    })

    expect(message.data?.appName).toBe(APP.name)
    expect(message.data).not.toHaveProperty('appIconUrl')
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
