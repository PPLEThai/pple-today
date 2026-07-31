import { describe, expect, test } from 'vitest'

import type { ListHistoryNotificationResponse } from '@api/backoffice/app'

import { parseBrandedPush, pushBadgeCount, PushSenderApp, pushSenderApp } from './branded-push'

// A type-level assertion, checked by `pnpm typecheck` rather than at run time: the
// sending app as the API returns it must stay assignable to the sending app as a
// push carries it, because one component brands both. Diverge the two and this
// stops compiling.
type ApiSenderApp = NonNullable<ListHistoryNotificationResponse['items'][number]['app']>
const _apiSenderAppIsAPushSenderApp: PushSenderApp = {} as ApiSenderApp
void _apiSenderAppIsAPushSenderApp

// The keys the server puts on an attributed, data-only Android message.
// See apps-api/backoffice/src/utils/push-payload.ts.
const attributed = {
  title: 'ผลโหวตออกแล้ว',
  body: 'มาดูผลโหวตกัน',
  appName: 'PPLE Vote',
  appIconUrl: 'https://cdn.example/vote.png',
  link: '{"type":"MINI_APP","destination":"https://vote.example/results"}',
  notificationId: 'notif-1',
}

describe('pushSenderApp', () => {
  test('names the sending app', () => {
    expect(pushSenderApp(attributed)).toEqual({
      name: 'PPLE Vote',
      iconUrl: 'https://cdn.example/vote.png',
    })
  })

  // Every attributed send carries these keys, on both platforms — an iOS push
  // keeps its `notification` block, so this is the only place its foreground
  // toast can learn who sent it.
  test('reads an iOS attributed push, which carries no title in data', () => {
    expect(pushSenderApp({ link: '', appName: 'PPLE Vote', notificationId: 'n1' })).toEqual({
      name: 'PPLE Vote',
      iconUrl: undefined,
    })
  })

  test('an unattributed push has no sender, so surfaces keep the platform bell', () => {
    expect(pushSenderApp({ link: '', notificationId: 'n1' })).toBeUndefined()
    expect(pushSenderApp(undefined)).toBeUndefined()
  })
})

describe('parseBrandedPush', () => {
  test('maps an attributed message onto the notification the client presents', () => {
    expect(parseBrandedPush(attributed)).toEqual({
      title: 'ผลโหวตออกแล้ว',
      body: 'มาดูผลโหวตกัน',
      subtitle: 'PPLE Vote',
      largeIconUrl: 'https://cdn.example/vote.png',
      data: {
        link: '{"type":"MINI_APP","destination":"https://vote.example/results"}',
        notificationId: 'notif-1',
      },
    })
  })

  // The server drops an icon it cannot fetch (null, or a legacy base64 data URI)
  // but keeps the name — the two halves of an app's identity fail independently.
  test('keeps the app name when the app has no fetchable icon', () => {
    const { appIconUrl: _, ...noIcon } = attributed
    expect(parseBrandedPush(noIcon)).toMatchObject({
      subtitle: 'PPLE Vote',
      largeIconUrl: undefined,
    })
  })

  test('carries the link and notification id so a tap resolves the same destination', () => {
    expect(parseBrandedPush(attributed)?.data).toEqual({
      link: attributed.link,
      notificationId: 'notif-1',
    })
  })

  // The server writes `link: ''` when a notification has no destination, and the
  // tap handler treats an empty link as "nothing to open". Passing the empty
  // string through would be harmless but it is not data, so it is dropped.
  test('drops an empty link rather than passing it on', () => {
    expect(parseBrandedPush({ ...attributed, link: '' })?.data).toEqual({
      notificationId: 'notif-1',
    })
  })

  test('a notification with no id still presents', () => {
    const { notificationId: _, ...anonymous } = attributed
    expect(parseBrandedPush(anonymous)).toMatchObject({ title: 'ผลโหวตออกแล้ว', data: {} })
  })

  // Only an attributed send goes data-only, so a data message without a title or
  // an app name is not one of ours to display. Presenting it would put an empty
  // notification in the tray; ignoring it leaves the message to whatever else
  // wants it.
  test('refuses a message that names no app', () => {
    const { appName: _, ...unattributed } = attributed
    expect(parseBrandedPush(unattributed)).toBeNull()
  })

  test('refuses a message with no title', () => {
    const { title: _, ...untitled } = attributed
    expect(parseBrandedPush(untitled)).toBeNull()
    expect(parseBrandedPush({ ...attributed, title: '' })).toBeNull()
  })

  test('refuses a payload that is not a map of strings', () => {
    expect(parseBrandedPush(undefined)).toBeNull()
    expect(parseBrandedPush(null)).toBeNull()
    expect(parseBrandedPush('title')).toBeNull()
    // RNFB types `data` as Record<string, string | object>, so a nested object is
    // expressible even though the server never sends one.
    expect(parseBrandedPush({ ...attributed, title: { th: 'ผลโหวต' } })).toBeNull()
  })

  test('a message with a title and app name but no body still presents', () => {
    const { body: _, ...bodyless } = attributed
    expect(parseBrandedPush(bodyless)).toMatchObject({ title: 'ผลโหวตออกแล้ว', body: '' })
  })

  // The data-only payload is the one nothing else badges: no `notification`
  // block means Play services never sees a `notification_count`, so the count
  // travels here and `presentBrandedPush` applies it.
  test('carries the badge count onto the notification it presents', () => {
    expect(parseBrandedPush({ ...attributed, badge: '12' })?.badgeCount).toBe(12)
  })
})

describe('pushBadgeCount', () => {
  test('reads the recipient’s unread total off any push', () => {
    // Not only the data-only one: an iOS push carries the same key so a
    // foregrounded client can take the server's number instead of its own +1.
    expect(pushBadgeCount({ link: '', notificationId: 'n1', badge: '3' })).toBe(3)
  })

  test('zero is a count, not an absence', () => {
    // A send that leaves the recipient with nothing unread has to clear the
    // badge; reading zero as "no badge" would leave the old number on screen.
    expect(pushBadgeCount({ ...attributed, badge: '0' })).toBe(0)
  })

  test('a push with no badge leaves the badge alone', () => {
    expect(pushBadgeCount(attributed)).toBeUndefined()
    expect(pushBadgeCount(undefined)).toBeUndefined()
  })

  test('refuses anything that is not a whole count', () => {
    // Dropped rather than clamped or rounded: whatever produced these did not
    // mean a badge, and the last good number beats a made-up one.
    for (const badge of ['-1', '1.5', 'many', '', '1e3o']) {
      expect(pushBadgeCount({ ...attributed, badge })).toBeUndefined()
    }
    expect(pushBadgeCount({ ...attributed, badge: { count: 3 } })).toBeUndefined()
  })
})
