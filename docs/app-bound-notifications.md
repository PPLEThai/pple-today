# App-bound notifications — implementation plan

Today every PPLE Today notification looks the same: a bell icon, the label
"แจ้งเตือนทั่วไป" in the notification centre, and "PPLE Today" in the OS tray —
whether it came from the central team or from a mini app. This plan binds each
notification to the application that sent it, so the app's **icon and name** are
visible both in the notification centre and in the OS notification.

It applies to **all** mini apps, not only platform-provisioned Builder Apps.

## The model

Three ideas carry the whole design.

**Binding is not audience restriction.** Today `NotificationApiKey.miniAppId`
means two things at once: which app a key speaks for, and that the key may not
name its own recipients. Those are separated. Every app — central-team and
Builder alike — gets a bound key; whether the key is *confined* to the
audience-bound path is decided by `MiniApp.source`:

| `source`   | Raw targeting (phone/role/address/broadcast) | Audience-bound path | Metered |
| ---------- | -------------------------------------------- | ------------------- | ------- |
| `PLATFORM` | refused                                      | yes                 | yes     |
| `ADMIN`    | allowed                                      | allowed             | no      |
| unbound    | allowed                                      | refused             | no      |

A derived rule rather than a new column: "may this key name recipients" is a
property of *what kind of app it is*, and a flag could drift out of sync with
the app it describes. The privacy guarantee for Builder Apps is unchanged — a
`PLATFORM` key still cannot express who receives its notification.

**Attribution follows the key, not the audience.** A bound `ADMIN` key
broadcasting to everyone produces a branded notification, even though most
recipients have never opened that app. This is deliberate: branding communicates
*provenance*, and provenance is only dangerous when the sender is unvetted.
Central-team apps are vetted by definition; Builder Apps are not, which is
exactly why theirs stay confined to their own App Users. The alternative — the
same key rendering differently depending on an audience field — is the kind of
rule nobody remembers while debugging.

**Identity is current, not historical.** `Notification` stores a foreign key,
not a snapshot, so a rename or new icon re-labels the app's whole notification
history. A user scanning their list asks "which app is this?", not "what was it
called in March". `MiniApp` rows are never hard-deleted (retire is a
soft-delete), so a retired app's old notifications keep resolving.

## Schema

```prisma
model Notification {
  // …
  // The app this notification came from. Null = PPLE Today itself: every
  // pre-existing row, and every send from a legacy unbound key.
  miniAppId String?
  miniApp   MiniApp? @relation(fields: [miniAppId], references: [id])
}

enum NotificationTokenPlatform {
  IOS
  ANDROID
}

model UserNotificationToken {
  // …
  // The send path builds a different FCM payload per platform, so it must know
  // which one a token belongs to. Null for tokens registered before this change.
  platform NotificationTokenPlatform?

  // The client asserts it can render a branded notification from a data-only
  // message. False for every token registered by an older build, which is what
  // keeps those installs on the payload shape they already understand.
  supportsAppBranding Boolean @default(false)
}
```

No backfill. `null`/`false` are the safe, pre-existing behaviour in both cases.

## Server

### Key resolution and guards

`NotificationRepository.checkApiKey` ([repository.ts:167][ck]) already returns
`miniAppId` alongside the id. Extend the select to pull the bound app's
`source`, `name` and `icon` in the same query — the send path needs all three
the moment it learns the key is valid, and the guard needs `source` to decide
which endpoint the key may use at all.

- `requireUnboundKey` ([key-binding.ts:23][kb]) refuses only keys bound to a
  `PLATFORM` app. `ADMIN`-bound and unbound keys pass through. The
  `NOTIFICATION_KEY_APP_BOUND` message must be rewritten — it currently tells
  the caller to use the audience-bound endpoint, which is wrong advice for a
  central-team key.
- `requireAppBoundKey` keeps its shape: an unbound key has no audience to
  resolve.
- Quota: `AppNotificationService.send` ([app-notification-service.ts:73][ans])
  currently claims a quota slot unconditionally. Skip the claim (and the usage
  log) for `ADMIN`-bound keys — the daily quota is a *Builder App Resource
  Limit*, and a central-team app is not an outside Builder. Without this, a
  bound central-team key would silently acquire a 1000/day cap the first time it
  used that endpoint.

### Attribution on the send path

`sendNotificationToUser` ([repository.ts:310][snu]) takes the bound app (or
`undefined`) and writes `miniAppId` on the `Notification` row. Both send paths
feed it: the audience-bound path from the key it already resolved, the raw path
from the same `checkApiKey` result.

The invite path ([invite-notifier.ts:49][inv]) passes **no** app and stays
platform-branded. An invitation is the only send that reaches someone who has
never opened the app, addressed by a phone number the Builder chose, for an app
that may still be DRAFT — attributing it would let an unreviewed Builder put a
name and icon of their choosing in a stranger's notification tray. The app's
name already appears inside the message text, quoted and framed by platform
copy.

### Push payload

`CloudMessagingService.sendNotifications` ([cloud-messaging.ts:64][cms])
currently builds one payload for every token. It now builds **two**, selected
per token:

**iOS — server-only, no app release.** Keep today's `notification` payload and
add:

- `apns.payload.aps.alert.subtitle` = app name
- `fcm_options.image` = app icon URL

The Notification Service Extension already calls `FIRMessaging
extensionHelper`, which downloads `fcm_options.image` and attaches it — so the
icon lands in the thumbnail slot with no native change at all.

**Android — data-only, for attributed sends to capable tokens.** Send no
`notification` block; the client builds the notification (see below). Every
other Android case keeps today's payload: unattributed sends, tokens without
`supportsAppBranding`, and the kill switch.

Confining data-only to *attributed* sends is the central risk decision. A
`notification` payload is displayed by Play services without the app process
running; a data-only payload requires FCM to **start the app**, which Android
refuses for a package in the stopped state. Xiaomi/MIUI ships Autostart off by
default and treats swipe-from-Recents as a force-stop, and Oppo/Vivo/Realme
behave similarly — so on a meaningful share of Thai handsets a data-only push is
silently dropped. Keeping general and central-team broadcast traffic on the
proven path confines that failure mode to the notifications that are asking for
the new capability.

**One icon slot, one rule.** Both platforms show a single thumbnail in the
collapsed notification, so the **app icon always wins** and the content `image`
never appears in the OS push. It still renders in the notification centre and
detail screen. A rule with a carve-out for image notifications would fail to
attribute exactly the notifications most worth attributing.

**Degrade gracefully.** `MiniApp.icon` is nullable and legacy rows may still
hold a base64 data URI, which FCM cannot fetch. In that case fall back to the
default icon but **keep the app name** — the two halves of the identity fail
independently, and there is no reason to discard the half that works.

**The identity is repeated in `data` on every attributed send**, not only the
data-only one. The client builds the foreground toast itself, on both platforms,
from the message it receives — and `aps.alert.subtitle` is not readable as data.
Without this, a notification the OS branded would arrive as an unbranded toast
whenever the app happened to be open, which is the same "two different senders"
problem the toast is being branded to avoid. The icon is filtered the same way as
the push's own: a base64 data URI would blow the 4KB data budget, so those apps
are name-only here too.

### Kill switch

One config key, e.g. `ANDROID_BRANDED_PUSH_DISABLED`, read in the payload
builder: when set, ignore `supportsAppBranding` and emit today's `notification`
payload to every Android token. Branding degrades to unbranded; delivery is
restored instantly, without an app release or unbinding keys across several
integrations. This is the only mitigation for the OEM risk, because no delivery
telemetry is being built (see *Out of scope*).

### Token registration

`RegisterNotificationBody` ([models.ts:4][rnb]) gains `platform` and
`supportsAppBranding`. The repository upsert ([repository.ts:243][ups]) must set
both in the **`create` and `update` branches** — the update branch is the one
that matters, since an upgraded install keeps its FCM token and only ever takes
that path. Registration already runs on every cold start after auth
([_layout.tsx:349][reg]), so an upgraded client re-asserts its capability
without any new trigger.

## Mobile client

### `expo-notifications` patch

Android's per-notification icon is the one thing the current stack cannot do.
Verified in the installed source:

- `subtitle` → `getSubText()` → `setSubText()` — the **app name already works**
  through the documented JS API ([NotificationContent.java:79][subtext]).
- `getImage()` for locally-presented notifications returns the **static** large
  icon from manifest meta-data ([NotificationContent.java:105][getimg]) — one
  icon for the whole app, never per notification. The remote-URL path reads only
  `remoteMessage.notification.imageUrl`, which data-only messages don't have.

So: a pnpm patch (`patchedDependencies`, already used here for
`react-native-pager-view`) adding a per-notification large-icon URL through the
content record to `setLargeIcon`. Roughly thirty lines across the Kotlin/Java
content model and the JS type surface.

`react-native-notify-kit` was considered and rejected: it is a three-month-old,
single-maintainer fork of an abandoned library, and Invertase itself now points
users at `expo-notifications`. A small patch rides the ecosystem's direction
instead of against it. The cost is that Expo SDK upgrades acquire a manual step
— though a stale patch fails loudly at install or compile, not silently.

### Android display path

`expo-notifications` declares its messaging service with
`android:priority="-1"`, deliberately yielding to `@react-native-firebase/messaging`.
So RNFB owns the message: register `setBackgroundMessageHandler`, and display
via `expo-notifications` with `subtitle` = app name and the patched large-icon
URL = app icon. Use **one shared channel** — per-app channels would give true
per-app muting but Android offers no way to clean up channels, so a retired app
would leave a permanent orphan in system settings.

There was no app-defined channel to reuse: FCM had been displaying notifications
on a channel of its own ("Miscellaneous") that the app cannot address, and
presenting with a null trigger would land on `expo-notifications`' *own* fallback
channel — a second entry in system settings, which is the cost this decision was
avoiding. So the app now defines one channel and names it as FCM's
`default_notification_channel_id` in the manifest, putting both display paths on
the same single switch.

The handler is registered from a custom `index.js` entry point ahead of
`expo-router/entry`, not from a component. A data-only message is delivered by
starting the app as a **headless task**: no root view is mounted, so expo-router
never evaluates any route module — `app/_layout.tsx` included — and a handler
registered from a component would not exist when the message arrived. `require`
rather than `import`, since ES import declarations hoist above every statement.

Tapping a client-built notification does not reach `onNotificationOpenedApp`
either — Play services never displayed it — so the response comes back through
`expo-notifications` and is routed into the same link handler, guarded to Android.
On iOS `expo-notifications` is the `UNUserNotificationCenter` delegate and would
report FCM-displayed notifications as well, double-handling every tap.

Note that moving app notifications onto a client-built path resets their
per-channel settings, so a user who had muted the old channel may start seeing
them again. One-time, and arguably correct, but it should not be a surprise.

### In-app surfaces

All three places a notification is rendered:

- **Notification centre list** ([index.tsx:174][list]) — the app icon replaces
  the bell. The bell circle currently encodes read state through its background
  colour, so unread moves to a **dot beside the timestamp**; dimming the icon
  instead would undercut the branding being added.
- **Detail page** ([[notificationId].tsx:71][detail]) — app icon and app name
  replace the bell and the literal "แจ้งเตือนทั่วไป".
- **Foreground toast** ([_layout.tsx:374][toast]) — app icon. Branding the push
  but not the toast would make one notification look like two different senders
  depending on whether the app happened to be open. An app with no fetchable
  icon keeps the platform glyph here: the toast has no room for a sender name,
  so a name-only identity has nothing to show.

A `null` sender keeps today's bell and "แจ้งเตือนทั่วไป" on all three. An app
that has a name but *no* icon gets a neutral app glyph rather than the bell —
borrowing the bell would read as PPLE Today having sent the notification.

`ListHistoryNotificationResponse` and the notification detail response gain an
optional app `{ name, iconUrl }`.

## Backoffice admin

Key management lives in the **mini-app section**, as a row action opening a
dialog — matching the existing `MiniAppCreate`/`MiniAppEdit` pattern rather than
introducing a per-app detail route. There is no notification admin UI today at
all; the endpoints exist but nothing calls them.

The dialog lists that app's keys and offers create (bound to this app), rotate
and deactivate. The plaintext key is shown **exactly once**, so create/rotate
needs a copy affordance and an explicit "you won't see this again" state.

It should also surface apps whose icon cannot be used in a push (null, or a
base64 data URI), so ops can see who is affected rather than discovering it from
a screenshot.

## Rollout

1. Schema, guards, attribution, admin UI and per-app key provisioning.
2. iOS branding — server-only, no app release.
3. Mobile release: the patch, the Android display path, the capability flag on
   registration, and the in-app surfaces.
4. Ops mints a fresh bound key per central-team app and migrates each
   integration to it, one at a time.

Step 4 is the real launch, and it is the safety valve: nothing changes for an
integration until it swaps credentials, and pointing back at the old unbound key
reverts it. Existing keys keep working throughout; retire them once their
integration has moved.

## Out of scope

- **iOS Communication Notifications.** The only way to change the iOS banner
  *header* to the app's name, via `INSendMessageIntent` and the
  `com.apple.developer.usernotifications.communication` entitlement. It carries
  App Store review risk — the entitlement is intended for person-to-person
  messaging — and is better treated as a later spike.
- **Per-app Android channels / per-app mute.**
- **Delivery-ack telemetry and automatic downgrade** for tokens that never
  render a branded notification.
- **Filtering the notification centre by app.**
- **Content image in the OS push.**
- **SMS attribution.** `smsFallbackText` is billed per 70-character UCS-2
  segment for Thai; a server-side app-name prefix would push existing messages
  across a segment boundary and raise cost on traffic nobody re-tested. The
  sender controls that copy and can name the app themselves.

## Risks accepted

- **Android data-only can be silently dropped** on Chinese-OEM handsets, with no
  telemetry to detect it. The kill switch is the only mitigation; the first
  signal will be a human complaint. If this needs measuring later, the FCM
  BigQuery export records per-message delivery outcomes without any client
  change.
- **The Expo patch needs revalidating on every SDK bump**, by someone
  comfortable in Kotlin.
- **The anti-impersonation story leans on the platform's LIVE review** actually
  inspecting app name and icon. This change raises the stakes on that review and
  is worth confirming with whoever owns it. Note that notification *content* is
  already free-form, so a Builder can already write an official-looking title
  today — attribution makes the true sender visible for the first time, and is a
  net improvement rather than a new hole.
- **Base64 icons** mean name-only push branding for the affected apps until the
  pending icon migration runs.

[ck]: ../apps-api/backoffice/src/modules/notification/repository.ts
[kb]: ../apps-api/backoffice/src/modules/notification/key-binding.ts
[ans]: ../apps-api/backoffice/src/modules/notification/app-notification-service.ts
[snu]: ../apps-api/backoffice/src/modules/notification/repository.ts
[inv]: ../apps-api/backoffice/src/modules/mini-app/invite-notifier.ts
[cms]: ../apps-api/backoffice/src/plugins/cloud-messaging.ts
[rnb]: ../apps-api/backoffice/src/modules/notification/models.ts
[ups]: ../apps-api/backoffice/src/modules/notification/repository.ts
[reg]: ../apps-client/mobile/app/_layout.tsx
[subtext]: ../apps-client/mobile/node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/model/NotificationContent.java
[getimg]: ../apps-client/mobile/node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/model/NotificationContent.java
[list]: ../apps-client/mobile/app/(tabs)/(feed)/notification/index.tsx
[detail]: ../apps-client/mobile/app/(tabs)/(feed)/notification/[notificationId].tsx
[toast]: ../apps-client/mobile/app/_layout.tsx
