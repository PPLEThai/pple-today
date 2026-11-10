# Interactive notifications — spec

> **Status: accepted 2026-11-10.** Nothing here is built yet.
> [Decisions](#decisions) records what was settled and why. pple-platform has
> agreed to the relay (D1). What remains before the tray build is the spikes
> (see [Spikes](#spikes)).

Follow-up to [app-bound notifications](./app-bound-notifications.md) and
[direct notifications](./direct-notifications.md). Those let an app *tell* its
users something. This lets an app *ask* them something: approve or reject, pick
one, tick several, or write a short answer. The answer goes back to the app.
The user can answer inside PPLE Today or straight from the OS notification.

The Beta invitation (`MINI_APP_INVITE`) already works like this, but it is
hard-wired: one marker type, one inbox component, and one service that knows
what "accept" means. This spec generalises it so **any app-bound notification**
can carry an interaction, the app chooses the inputs, and the answer is POSTed
to the app.

## The model

**The interaction is part of the notification.** It is stored on the
`Notification` row and is the same for every recipient, like `content`. It is
one question sent to many people, and each person answers separately.

**Each recipient answers once.** The first answer that is accepted is final:
there is no edit and no withdraw. A unique `(notificationId, userId)` row
enforces this on the server, so a double tap, two devices, or a tray tap plus an
in-app tap cannot produce two answers.

**Recording an answer and delivering it are separate steps.** The answer is
saved in today-v2 first, and the user sees "ส่งคำตอบแล้ว" straight away. Delivery
to the app happens in the background, with retries. If the app's server is down,
the user's answer is still kept. The app cannot reject an answer (D3). It finds
out about it afterwards, the same way it finds out about any webhook.

**The callback goes to the sending app, and the request can't change where.**
The target comes from the sending app's settings, so a sender can never point a
user's answer at a third party. This also means an interaction needs a sender.
Notifications sent as PPLE Today itself (unbound keys) cannot have one.

**Buttons are the submit.** Every interaction ends in 1–3 **actions**. With no
fields, tapping an action submits it (approve or reject). With fields, the
actions are the submit buttons: "ส่ง", or "อนุมัติ" and "ไม่อนุมัติ" under a comment
box. Both cases use the same model, so there is no separate "buttons" type and
"form" type.

**The tray is a shortcut to the same answer.** Answering from the OS
notification writes the same row through the same validation. Shapes the tray
cannot show fall back to opening the form, so the sender writes one interaction
and never designs for the tray separately.

## Wire format — sending

`interaction` is a new optional field on both bound send paths:

- `POST /external/notifications` (app-bound key, audience-selecting)
- `POST /external/notifications/send` (admin bearer + `x-notification-app-key`).
  The platform's Granted Notifications (ADR-0033) also use this path.

```jsonc
{
  "audience": { "kind": "direct", "recipients": [{ "sub": "…" }] },
  "content": { "header": "คำขอลางาน", "message": "สมชายขอลา 12–14 พ.ย." },
  "linkPath": "/leave/123",                 // optional; secondary link + old-client fallback
  "interaction": {
    "ref": "leave:123",                     // opaque, echoed in the callback
    "expiresAt": "2026-11-17T00:00:00Z",    // optional
    "fields": [
      { "id": "note", "type": "text", "label": "เหตุผล", "multiline": true, "maxLength": 300 }
    ],
    "actions": [
      { "id": "approve", "label": "อนุมัติ",   "icon": "check", "style": "primary" },
      { "id": "reject",  "label": "ไม่อนุมัติ", "icon": "x",     "style": "destructive",
        "requires": ["note"],
        "confirm": { "title": "ยืนยันการไม่อนุมัติ?" } }
    ]
  }
}
```

### `interaction`

| Field | Type | Rules |
| --- | --- | --- |
| `ref` | string | Optional, ≤ 200 chars. Opaque to us. It comes back in the callback so the app can match an answer to its own record without keeping a map of notification ids. Never sent to the client. |
| `expiresAt` | ISO date-time | Optional. Must be in the future and ≤ 30 days ahead. After that, answers are refused and the UI shows "หมดเวลาตอบกลับ". |
| `fields` | Field[] | 0–5, rendered in order above the actions. |
| `actions` | Action[] | 1–3. Required. |
| `tray` | boolean | Optional, default `true`. `false` keeps the OS notification free of action buttons, so tapping it always opens the form. |

Ids (`field.id`, `action.id`, `option.id`) must match `^[a-z0-9_-]{1,32}$` and be
unique within their list. The callback reports these ids, so the app should pick
names it can switch on.

### Action

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Reported as `action` in the callback. |
| `label` | string | 1–24 chars. |
| `icon` | IconName | Optional. One name from the [icon allowlist](#icons). |
| `style` | `primary` \| `outline` \| `destructive` | Defaults to `primary` for the first action and `outline` for the rest. |
| `requires` | string[] | Optional field ids that this action needs, on top of fields marked `required`. Each id must name a field in `fields`. Example: a note required only when rejecting. |
| `confirm` | `{ title, message? }` | Optional. Shows a confirm dialog before submitting. Recommended for `destructive`, because an answer cannot be undone. |

### Field

All fields share `id`, `label` (1–80 chars), `description?` (≤ 200 chars), and
`required` (default `false`). `required: true` applies to every action, while
`action.requires` applies only to the action that lists it.

| `type` | Extra properties | Reported value |
| --- | --- | --- |
| `text` | `placeholder?` (≤ 80), `multiline?` (default `false`), `maxLength?` (1–1000, default 500), `minLength?` | `string`, trimmed. Omitted when empty. |
| `radio` | `options: {id,label}[]` (2–10, label ≤ 60), `default?` (an option id) | `string` (the option id) |
| `checkbox` | `options: {id,label}[]` (1–10), `min?`, `max?`, `default?` (option ids) | `string[]` (option ids, in option order) |

For a single consent tick ("ข้าพเจ้ายอมรับเงื่อนไข"), use a `checkbox` with one
option and `required: true`.

### Send-time refusals

All of these are `400`, and nothing is sent:

| Code | When |
| --- | --- |
| `NOTIFICATION_INVALID_INTERACTION` | A rule above is broken. The message names the first failing path, e.g. `interaction.actions[1].requires[0]`. |
| `NOTIFICATION_INTERACTION_NO_CALLBACK` | The sending app has no callback target: an `ADMIN` app with no callback URL set, or an unbound legacy key with no app at all. |
| `NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED` | `content.link.bypassNotificationCenter: true` on the raw path, together with `interaction` (D9). |

Every interactive notification also follows these rules:

- **`bypassNotificationCenter` is refused, not overridden.** Tapping the
  notification body has to land on the notification detail, because that is
  where the form is. A sender that asks for bypass gets a `400`. Silently
  turning it off would send the notification somewhere other than where the
  sender asked, and every other conflict on this API is a refusal. The app-key
  path can't set bypass (`linkPath` never does), so in practice this applies to
  the raw path, including Granted Notifications (D9).
- **The content is still required and has to make sense on its own.** Older
  clients show the message and the `linkPath` button and ignore the interaction
  (see [Older clients](#older-clients)).

### Send response

Both send responses gain `notificationId`. The app needs it for `/close`, and it
ties a send to the callbacks it causes even when the app set no `ref`. An
`idempotencyKey` replay returns the original id.

### Closing an interaction early

```
POST /external/notifications/:notificationId/interaction/close
Authorization: Bearer <app notification key>
```

This covers the "first approver wins" race. The call is idempotent and only the
attributed app may make it. Any other caller gets `404`, so the endpoint can't
be used to find out other apps' notification ids. Recipients who haven't
answered see "ปิดรับคำตอบแล้ว", and a tray tap is refused the same way. Answers
already recorded are still delivered.

## Storage

```prisma
model Notification {
  // …existing fields…

  // The interaction spec as sent, after validation. Versioned ({ v: 1, … }) so
  // a client can refuse a shape it doesn't know rather than render it wrongly.
  interaction          Json?
  interactionExpiresAt DateTime?  // lifted out so "is it open?" is a column check
  interactionClosedAt  DateTime?  // set by /close; never unset

  responses NotificationResponse[]
}

enum NotificationCallbackStatus {
  PENDING    // waiting for its next attempt
  DELIVERED  // the app answered 2xx
  FAILED     // gave up: retries exhausted, permanent 4xx/410, or the app retired
}

enum NotificationResponseChannel {
  APP   // the in-app form (detail screen)
  TRAY  // an OS notification action
}

// One recipient's answer to one interactive notification. The unique key is
// what makes "answer once" a database fact rather than a client courtesy.
// The row is also the delivery outbox — there is no separate queue table.
model NotificationResponse {
  id             String   @id @default(cuid())   // also the callback's idempotency id
  notificationId String
  userId         String
  miniAppId      String   // denormalised: per-app delivery queries and Console views

  actionId    String
  values      Json?       // { [fieldId]: string | string[] }; null once purged
  channel     NotificationResponseChannel
  respondedAt DateTime @default(now())

  deliveryStatus NotificationCallbackStatus @default(PENDING)
  attempts       Int       @default(0)
  nextAttemptAt  DateTime? @default(now())
  lastAttemptAt  DateTime?
  lastStatusCode Int?
  lastError      String?   // truncated; never the response body
  deliveredAt    DateTime?
  valuesPurgedAt DateTime?

  notification Notification @relation(fields: [notificationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  miniApp      MiniApp      @relation(fields: [miniAppId], references: [id])

  @@unique([notificationId, userId])
  @@index([deliveryStatus, nextAttemptAt])  // the delivery sweep
  @@index([miniAppId, deliveryStatus])      // per-app failure views
  @@index([valuesPurgedAt, deliveredAt])    // the retention sweep
}

model MiniApp {
  // …existing fields…

  // Where answers to this app's interactive notifications are POSTed.
  // ADMIN apps only, set in the admin portal. PLATFORM apps ignore it and
  // always deliver through the platform at the predefined path (D1).
  notificationCallbackUrl    String?
  // HMAC key for the callback signature. Generated when a URL is first set,
  // revealed once, rotatable. Stored encrypted: it must be usable to sign, so it
  // cannot be hashed like the notification key.
  notificationCallbackSecret String?
}

model UserNotificationToken {
  // …existing fields…

  // This build can show interaction actions on the OS notification and submit
  // them with a response token. Re-asserted on every registration, like
  // supportsAppBranding.
  supportsTrayInteraction Boolean @default(false)
}
```

**The callback target is looked up when the callback is sent, not when the user
answers.** If an app with stuck deliveries fixes its URL, the pending answers go
to the new URL.

**Retention (D4).** 90 days after a row reaches `DELIVERED` or `FAILED`, the
sweep sets `values` to null and stamps `valuesPurgedAt`. The `actionId` is kept,
so the user's summary still reads "✓ อนุมัติ", just without the text they typed.
The app received its copy when the callback was delivered.

## Wire format — answering in the app

### Reading

`GET /notifications/:id` (the `Notification` DTO) gains:

```jsonc
"interaction": {
  "v": 1,
  "fields": [ … ], "actions": [ … ],       // as sent, minus `ref`
  "state": "OPEN" | "RESPONDED" | "EXPIRED" | "CLOSED",
  "expiresAt": "…",                        // optional
  "response": {                            // present iff RESPONDED
    "actionId": "approve",
    "values": { … },                       // absent once purged
    "respondedAt": "…"
  }
}
```

If more than one state applies, the earlier one in this list wins: `RESPONDED`,
then `CLOSED`, then `EXPIRED`, then `OPEN`. So someone who answered always sees
their answer, even after the interaction is closed. If the sending app has been
retired, the state is `CLOSED`.

Items from `GET /notifications/history` gain `interactionState?` (same enum).
The list uses it to show a "รอตอบกลับ" chip without loading every detail.

### Submitting

```
POST /notifications/:id/response
Authorization: <user session>               ← in-app
X-Notification-Response-Token: <token>      ← tray (see below)
{ "actionId": "approve", "values": { "note": "โอเค" } }
→ 200 { "interaction": { …same shape as above, state RESPONDED… } }
```

The request must carry exactly one of the two credentials. It is checked against
the stored spec on the server, whichever credential it uses. Checks on the
client are only there for a better experience.

- `actionId` must be one of the actions.
- Every field marked `required`, and every field in the action's `requires`,
  must have a value. Unknown field ids are refused.
- `radio`: the value must be an option id. `checkbox`: the value must be a
  subset of the option ids, with no duplicates, and within `min`/`max`. `text`:
  trimmed, then checked against `minLength`/`maxLength`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `NOTIFICATION_RESPONSE_INVALID` | Validation failed. The body names the field. |
| 401 | `NOTIFICATION_RESPONSE_TOKEN_INVALID` | Bad signature, expired token, or a token for a different notification. |
| 404 | `NOTIFICATION_NOT_FOUND` | The notification doesn't exist, the caller isn't a recipient (no `UserNotification` row), or it has no interaction. All three return the same response. |
| 409 | `NOTIFICATION_ALREADY_RESPONDED` | The unique key already exists. The body includes the existing answer. |
| 410 | `NOTIFICATION_INTERACTION_CLOSED` | Expired, closed, or the sending app has been retired. |

A successful submit does three things:

1. In one transaction, it inserts the `NotificationResponse` and marks the
   notification read.
2. After that commits, it starts one delivery attempt to the app and doesn't
   wait for it, so the user's request never depends on the app's server.
3. It sends a dismiss push to the user's *other* Android devices (see
   [Stale cards](#stale-cards-on-other-devices)).

## Answering from the notification tray

### Which interactions get tray actions

The sender doesn't design for the tray. The interaction's shape decides what the
tray shows:

| Interaction shape | What the OS notification shows |
| --- | --- |
| No fields | One button per action. Tapping one submits it in the background. |
| Exactly one `text` field and one action | An inline reply box. The action's label is the send button. |
| Only `text` fields, none `required` | One button per action. Submits with empty values. An action with `requires` opens the form instead. |
| Any `radio` or `checkbox`, or a `required` field (other than the reply shape) | No action buttons. Tapping opens the form. |

The following rules apply on top of the table:

- **An action with `confirm` opens the app** to the detail screen with the
  dialog already open. A dialog can't be shown in the tray, and leaving it out
  would turn a deliberate two-step action into a one-tap one.
- **`interaction.tray: false`, an expired or closed interaction, or a token
  that doesn't support tray interaction:** no buttons. The body tap opens the
  form, as for any notification.
- **iOS asks the user to unlock first** (`authenticationRequired`) for every
  tray action. Approving something from a locked phone that someone else is
  holding shouldn't be possible. Android has no per-action equivalent through
  `expo-notifications`, so there it follows the user's lock-screen settings
  (S3).
- **The tray shows labels, plus icons where the platform allows.** iOS 15+
  maps each allowlisted icon to an SF Symbol (`UNNotificationActionIcon`).
  Android hasn't drawn action icons since 7.0, so it shows labels only.
  `destructive` becomes iOS's red `destructive` option. Android has no
  equivalent.

### Credential: a response token, not the session

A tray tap may be handled with no UI: by a headless task on Android, or in the
background on iOS. The user's session refreshes by rotating its refresh token.
If a background refresh raced the foreground app, the user could be logged out.
So the tray never touches the session. Each push instead carries a **response
token** that authorises exactly one thing: answering *this* notification as
*this* user.

```
v1.<base64url({ "n": notificationId, "u": userId, "e": expUnix })>.<base64url(HMAC-SHA256)>
```

- It is signed with `NOTIFICATION_RESPONSE_TOKEN_SECRET` and stateless, so
  there is nothing to store. Single use is already enforced by the unique
  response row. Closing and expiry are checked at submit time like any other
  answer.
- `e` = `interactionExpiresAt`, or 30 days if the interaction has none.
- It is minted per recipient. The send path already builds one FCM message per
  token (`buildFcmMessage`), so a value per user costs nothing extra. `PushToken`
  gains `userId`.
- It is only included for tokens with `supportsTrayInteraction`, and only when
  the shape gets tray actions.
- If the token leaks through Google or Apple, the damage is limited to one answer
  to one question, by one person, before it expires.

### Push payload

Interactive sends add two data keys to the message of every capable token. Both
are strings, because FCM `data` values must be strings:

```jsonc
"pple_interaction": "{\"id\":\"clw…\",\"kind\":\"buttons\",\"actions\":[{\"id\":\"approve\",\"label\":\"อนุมัติ\",\"icon\":\"check\",\"bg\":true},{\"id\":\"reject\",\"label\":\"ไม่อนุมัติ\",\"icon\":\"x\",\"destructive\":true,\"bg\":false}]}",
//  or kind "reply": {"id":…,"kind":"reply","fieldId":"note","placeholder":"…","submitLabel":"ส่ง","actionId":"send","bg":true}
"pple_response_token": "v1.…"
```

`bg: false` marks an action that opens the app (it has `confirm` or `requires`).
The server works out the tray shape. Clients don't re-derive it from the full
spec, which never travels in the push. Three actions with 24-character labels
plus the token come to under 600 bytes, well within the 4 KB limit.

### Android

Interactive notifications are always attributed. They therefore already take the
**data-only path** for tokens with `supportsAppBranding`, where the client builds
the notification itself. The handler registered in `index.js`
(`libs/notification-display.ts`) is extended to:

1. When `pple_interaction` is present, register a category `pple.ix.<id>` with
   `setNotificationCategoryAsync`. Buttons use `opensAppToForeground: bg ===
   false`. The reply shape uses `textInput`.
2. Present the notification with `categoryIdentifier: "pple.ix.<id>"` and keep
   `pple_response_token` in its `data`.
3. Handle the action press:
   - In the background or when the app was killed: a task registered with
     `Notifications.registerTaskAsync`. On Android this task runs for action
     presses (see the expo-notifications docs).
   - In the foreground: `addNotificationResponseReceivedListener`.
   - Either way, it POSTs `/notifications/:id/response` with the token.
4. Act on the result:
   - `200`: dismiss the notification.
   - `409`: replace it with "คุณตอบกลับแล้ว".
   - `410`: replace it with "ปิดรับคำตอบแล้ว".
   - Network error or `400`: replace it with "ส่งคำตอบไม่สำเร็จ แตะเพื่อตอบในแอป".

   Every replacement drops the actions and keeps the tap-to-open-detail link.
   Nothing is queued for a retry.
5. Prune categories: delete `pple.ix.*` categories more than 50 entries old. A
   category is kept until then, because the notification may still be in the
   tray.

With the kill switch (`ANDROID_BRANDED_PUSH_DISABLED`), a token falls back to the
`notification` payload that Play services shows. That payload cannot carry
actions, so the user gets tap-to-open only. A separate
`TRAY_INTERACTION_DISABLED` switch turns off tray actions on both platforms
without affecting branding.

### iOS

iOS shows the notification from the APNs payload, so the category has to exist
**before** it is shown. Our actions change per notification, so they can't be
registered ahead of time. The Notification Service Extension
(`assets/NotificationService.m`, which already runs because of `mutable-content`)
handles it. **Before** handing the content to `FIRMessaging extensionHelper`, it:

1. Reads `pple_interaction` from `userInfo`.
2. Builds a `UNNotificationCategory` with id `pple.ix.<id>`:
   - `UNNotificationAction` / `UNTextInputNotificationAction`
   - an SF Symbol icon
   - `.authenticationRequired` on every action
   - `.destructive` where flagged
   - `.foreground` when `bg` is false
3. Merges the category into `getNotificationCategories`, prunes it to the newest
   50 `pple.ix.*`, and calls `setNotificationCategories`.
4. Sets `bestAttemptContent.categoryIdentifier`.

If anything fails, or the extension times out, the notification is shown without
actions and the tap opens the form. That fallback is the same as on a client
without tray support. This is a known pattern (OneSignal builds its action
buttons this way), but it has to be proven on our build (S1).

`setNotificationCategories` replaces the whole set. Any future app-side
`expo-notifications` category registration must merge with the existing set
rather than overwrite it, or it will wipe these categories.

**Handling the tap: native, in the background, from the first release.** A tap
on an action without `.foreground` makes iOS launch the app in the background
(if it isn't running) and hand it the response. The JS layer can't be relied on
here. `expo-notifications` passes the response to JS through an emitter that
registers only once the bundle has loaded. On a cold background launch, the
response is parked in `NotificationCenterManager.pendingResponses` until then,
which is too late. So the submit is native:

1. **Registration.** A local Expo module (`modules/notification-actions`, Swift)
   includes an `ExpoAppDelegateSubscriber`. In `didFinishLaunching` it calls
   `NotificationCenterManager.shared.addDelegate(_:)`, which is the public
   `NotificationDelegate` protocol `expo-notifications` uses to fan out to
   several handlers. iOS delivers the response only after launch finishes, so
   the handler is in place before it arrives, even on a cold launch.
2. **`didReceive(response)`.** Handles only `pple.ix.*` categories and only
   actions without `.foreground`, and returns `false` for everything else. It
   reads `notificationId` and `pple_response_token` from `userInfo`, plus
   `userText` from a `UNTextInputNotificationResponse` for the reply shape, and
   POSTs `/notifications/:id/response` with `URLSession`. The API base URL is
   written into Info.plist by the config plugin. It needs no keychain, session
   or JS.
3. **Keeping the process alive.** `NotificationCenterManager` calls the
   system's completion handler as soon as its delegates return, and after that
   iOS may suspend the app. So the POST runs inside
   `UIApplication.beginBackgroundTask` (about 30 s of budget), with a 15 s
   request timeout, and the task ends in the completion block.
4. **Feedback.** iOS has already removed the notification when the user tapped.
   On `200` nothing else happens. On `409`, `410`, `400` or a network error, the
   handler posts a local notification with the same wording as Android: "คุณตอบ
   กลับแล้ว", "ปิดรับคำตอบแล้ว" or "ส่งคำตอบไม่สำเร็จ แตะเพื่อตอบในแอป". It has no
   actions, and tapping it opens the detail screen.
5. **No double submit.** `expo-notifications` hands every response to every
   delegate. When the app is running, the JS response listener also sees the
   tap, and on iOS it ignores non-foreground `pple.ix.*` actions. If both ever
   submitted, the second would get `409`, so this is a nicety, not the
   guarantee.

Only `confirm` and `requires` actions use `.foreground`. They open the detail
screen with that action pending, as on Android.

Known cost: after a background answer, the app-icon badge stays as it was until
the next push or app open. The server marks the notification read, but nothing
in the background updates the badge.

If S2 fails on some condition (see [Spikes](#spikes)), the fallback for that
condition is to mark the action `.foreground`. The app then opens the detail
screen and submits from JS with the same token. This is a fallback decided at
build time, not a separate phase.

### Stale cards on other devices

After an answer is recorded, the server sends a data-only
`{ "pple_dismiss": "<notificationId>" }` message to the user's *other* Android
tokens that have `supportsTrayInteraction`. The handler removes that
notification. iOS gets no dismiss: removing a notification from the background
would need silent pushes, which iOS throttles. If the user taps a stale iOS
card, they get the `409` "คุณตอบกลับแล้ว" result.

`/close` doesn't send dismisses to every recipient, because it could mean tens
of thousands of pushes for a cosmetic effect. A stale card that is tapped
returns `410`.

### Foreground

If the app is open when an interactive push arrives, the existing in-app toast
shows it, as it does today. Tapping the toast opens the detail screen. The toast
has no action buttons.

## Callback — today-v2 → app

### Target

| `MiniApp.source` | Target |
| --- | --- |
| `ADMIN` | `MiniApp.notificationCallbackUrl`. Must be https, and must not resolve to a private, loopback or link-local address (SSRF guard). Checked when saved and again when sent. |
| `PLATFORM` | The predefined path **`/.pple/notification-response`**, reached **through the platform**. today-v2 POSTs to a pple-platform relay, which calls the tenant through the dispatch-namespace binding (D1). |

```
POST {PLATFORM_CALLBACK_RELAY_URL}/apps/{slug}/notification-response
Authorization: Bearer {PLATFORM_CALLBACK_RELAY_TOKEN}
<same X-PPLE-* headers and body as below, passed through unchanged>
```

The relay returns the tenant's status code. The platform template exposes the
event to app code as an exported `notificationResponse(event, env, ctx)`
handler, the same way it exposes `scheduled()`. That handler is specified in
pple-platform's ADR, not here.

### Request

```
POST <target>
Content-Type: application/json
User-Agent: PPLE-Today-Callbacks/1
X-PPLE-Event: notification.response
X-PPLE-Delivery: <response id>          // same value on every retry
X-PPLE-Timestamp: <unix seconds>
X-PPLE-Signature: v1=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>   // ADMIN apps
```

```jsonc
{
  "type": "notification.response",
  "id": "clx…",                       // NotificationResponse.id — dedupe on this
  "notificationId": "clw…",
  "ref": "leave:123",                 // as sent; absent if none
  "app": { "slug": "leave-request" },
  "responder": { "sub": "…" },        // PPLE ID sub; nothing else about the person
  "action": "reject",
  "values": { "note": "ช่วงนั้นคนไม่พอ" },
  "respondedAt": "2026-11-10T07:03:00.000Z",
  "attempt": 1
}
```

- **Signature (D2).** ADMIN apps get a signature on every request. Their URL is
  public, so they must verify it and reject any request whose timestamp is more
  than 5 minutes off. PLATFORM apps are protected by the relay token and the
  wrapper's per-app secret, the same as cron. For PLATFORM apps the
  `X-PPLE-Signature` header is reserved but not sent yet. Turning it on later
  only means provisioning a per-app secret. The contract doesn't change.
- **Identity.** We send only `sub`, the identity the app already gets through
  OIDC. Phone number and name are left out on purpose. An app that needs more
  uses the services it has already been granted.
- `channel` (app or tray) is stored but not sent. It's operational data, not
  something the app should act on.

### Delivery semantics

**At-least-once, deduplicated by `id`.** Each answer is delivered on its own.
There is no ordering across responders.

| Outcome | Result |
| --- | --- |
| `2xx` within 10 s | `DELIVERED`. The response body is ignored. |
| `408`, `429`, `5xx`, timeout, network error | Retry |
| `410 Gone` | `FAILED`, no retry. This is how an app says "stop sending me these" (D6). |
| other `4xx` | `FAILED`, no retry. A broken receiver won't fix itself on retry. |

Retries back off: immediately, then +1 min, +5 min, +30 min, +2 h, +6 h, +24 h.
After that the row is `FAILED` (7 attempts over about 32 h).

**Scheduling** follows the existing gitops CronJob pattern. A CronJob runs every
minute and calls the internal-only route
`POST /internal/notification-callbacks/sweep`. The route:

- claims due rows with `FOR UPDATE SKIP LOCKED`;
- delivers them, with at most 10 in flight per app, so one slow app can't hold
  up the others;
- runs the 90-day `values` purge.

There are no in-process timers, so it stays correct with several API replicas.

**Retiring an app** marks its `PENDING` rows `FAILED` (`lastError: "app
retired"`), in the same step that deactivates its key.

## Mobile client — in-app form

### Where it renders

- **Notification detail** (`notification/[notificationId].tsx`): a
  `NotificationInteraction` block between the message and the bottom action. It
  is built from `@pple-today/ui` `textarea`/`input`, `radio-group`, `checkbox`,
  `button` and `alert-dialog`, which all exist already.
- **Notification list**: a "รอตอบกลับ" chip when `interactionState === 'OPEN'`.
- **Push tap**: opens the detail screen (bypass is refused on send). When a tray
  action opens the app (a `confirm` or `requires` action, or an S2 fallback),
  it opens the detail screen with that action pending.

### Behaviour

- **No fields**: a row of buttons. If there are three buttons, or the labels
  don't fit, they stack. A tap shows the `confirm` dialog if there is one, then
  submits. There is no separate submit button.
- **With fields**: the fields come first and the actions below. Each action
  stays disabled until its own required fields (`required` plus `requires`) are
  valid. Inline errors appear after the first attempt.
- **In flight**: only the tapped action shows a spinner, and all the actions are
  disabled. A re-entry ref guards against double taps, the same way the invite
  inbox does.
- **Success**: the form is replaced by a read-only summary, e.g. "คุณตอบกลับแล้ว: ✓
  อนุมัติ · 10 พ.ย. 14:03", with the values the user gave. A toast confirms it.
- **409**: shows the summary from the error body. The question was answered on
  another device or from the tray, which isn't an error to the user.
- **410**: shows "หมดเวลาตอบกลับ" or "ปิดรับคำตอบแล้ว" instead of the form.
- **Unknown `v`**: shows "อัปเดตแอปเพื่อตอบกลับ" instead of guessing.
- **`linkPath`**, if present, stays as the secondary bottom button.

### Icons

The sender doesn't send URLs or arbitrary names. It picks from a fixed
allowlist. The icons are bundled in the app, so they work offline, follow the
theme, and can't be used to put arbitrary images into PPLE Today's own UI.

| Name | In-app (lucide) | iOS tray (SF Symbol) |
| --- | --- | --- |
| `check` | `Check` | `checkmark` |
| `x` | `X` | `xmark` |
| `thumbs-up` | `ThumbsUp` | `hand.thumbsup` |
| `thumbs-down` | `ThumbsDown` | `hand.thumbsdown` |
| `calendar-check` | `CalendarCheck` | `calendar.badge.checkmark` |
| `calendar-x` | `CalendarX` | `calendar.badge.minus` |
| `clock` | `Clock` | `clock` |
| `send` | `Send` | `paperplane` |
| `heart` | `Heart` | `heart` |
| `star` | `Star` | `star` |
| `flag` | `Flag` | `flag` |
| `user-check` | `UserCheck` | `person.badge.checkmark` |
| `user-x` | `UserX` | `person.badge.minus` |
| `help` | `CircleHelp` | `questionmark.circle` |

The schema enum lives in `@pple-today/api-common`. It is mirrored in the mobile
icon map and in the extension's SF Symbol map. Adding an icon means updating all
three. An older client shows an unknown icon as no icon.

### Registration

`RegisterNotificationBody` gains `supportsTrayInteraction`, written in both the
`create` and `update` branches of the upsert, like `supportsAppBranding`. A build
sets it to `true` only when its tray handling is in place on that platform: the
handlers on Android, and the extension change plus the native action handler on
iOS.

### Older clients

A build from before this feature ignores `interaction`. It shows the message,
plus the `linkPath` button if one was sent. Its tokens don't have
`supportsTrayInteraction`, so their pushes carry no tray data. So **senders
should include a `linkPath`** to a page in their app where the same decision can
be made, as a fallback. The send docs say so, but it isn't enforced.

## Admin portal and Console

- **Admin portal → mini app settings (ADMIN apps):** a callback URL field, the
  signing secret (shown once, rotatable), and a "send test event" button. The
  button POSTs a `notification.test` event and shows the status code.
- **Platform Console (PLATFORM apps):** nothing to configure, because the path is
  fixed. A follow-up adds a delivery-failures view
  (`GET /platform/mini-apps/:id/notification-callbacks?status=FAILED`) and a
  redeliver action.

## Where the pieces will live

| Concern | File |
| --- | --- |
| Interaction schema, icon enum, client DTO | `packages/api-common/src/dtos/notification.ts` |
| Spec validation, answer validation, tray shape (pure) | `notification/interaction.ts` |
| Response token mint/verify (pure) | `notification/response-token.ts` |
| Answer, read state, close | `notification/interaction-service.ts` |
| Outbox claim, signing, delivery, backoff, purge | `notification/callback-delivery.ts` |
| Target resolution (ADMIN URL / platform relay) | `notification/callback-target.ts` |
| Tray data keys and per-token token | `utils/push-payload.ts` |
| In-app renderer | `components/notification/interaction.tsx` |
| Android category, background task, dismiss | `libs/notification-display.ts`, `index.js` |
| iOS dynamic category | `assets/NotificationService.m` |
| iOS background submit | `modules/notification-actions` (Swift `ExpoAppDelegateSubscriber` + `NotificationDelegate`) |

## Rollout

1. **Spikes S1, S2 and S3** (below). They are cheap and settle the tray design
   on both platforms before any of it is built, so the tray ships in a single
   release.
2. Schema and migration. Everything is additive and nullable, with no backfill.
3. Server: `interaction` on send, and the read, answer (session and token) and
   close endpoints, behind `INTERACTIVE_NOTIFICATIONS_ENABLED`. While the flag
   is off, a send that includes `interaction` is refused with `400`, so it is
   never silently dropped.
4. Callback delivery and the sweep CronJob. The ADMIN target ships first, so a
   central-team app can be the first end-to-end consumer.
5. Mobile release:
   - the in-app renderer;
   - Android tray actions;
   - iOS tray actions: dynamic categories and the native background submit;
   - `supportsTrayInteraction`.
6. pple-platform: the relay endpoint, the wrapper path, and the template handler
   (in its own ADR). Then turn on the PLATFORM target.

## Decisions

| # | Question | Decision | Why |
| --- | --- | --- | --- |
| D1 | How do platform apps receive answers? | Through a pple-platform relay to `/.pple/notification-response`, via the dispatch binding. **Agreed by pple-platform 2026-11-10.** The wrapper and template handler are specified in an ADR there. | The dispatch Worker refuses `/.pple/*` from the public (ADR-0021). Every other path goes through the membership door (ADR-0013), which would turn away our POST for Draft and Beta apps. Cron delivery already gets past both this way, tested in production. |
| D2 | Per-app signing for platform apps? | Not yet. The relay token and wrapper secret are enough, and the header is reserved. ADMIN apps are always signed. | The path can't be reached publicly. Adding signing later only means provisioning a secret. |
| D3 | Can the app reject an answer? | No. The answer is recorded, then delivered in the background. `/close` handles races. | The user's tap never depends on the app's uptime, and "answer once" stays a database fact. A synchronous refusal could be added later as an optional fast path. |
| D4 | How long are free-text answers kept? | `values` is purged 90 days after delivery (or failure). `actionId` is kept. | Senders write the prompts, so we can't control what personal data users type. The app already has its copy. |
| D5 | Can a field be required for one action only? | Yes, in v1: `action.requires`. | It's the commonest approval pattern, and adding it later would mean a second mobile release. |
| D6 | Interactions on `kind: "all"`? | Allowed. Per-app concurrency, and `410` stops delivery. | Broadcast polls and RSVPs are real uses. The load falls on the app's own server, so the app decides. |
| D7 | Tray credential | A per-recipient, stateless response token in the push. Never the session. | Tray handling may run headless. A background refresh-token rotation that races the foreground app could log the user out. |
| D8 | Tray on iOS | Single phase. The extension registers categories dynamically, and a native `NotificationDelegate` submits in the background with the response token, so a tap doesn't open the app. Only `confirm`/`requires` actions open it. | Categories have to exist before display. expo-notifications reaches JS too late on a cold background launch, but its `addDelegate` hook lets native code handle the response first. |
| D9 | `bypassNotificationCenter` on an interactive send? | Refused with `400` (`NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED`). **pple-platform's Granted Notifications must not set bypass when they carry an `interaction`.** ADR-0033 says they always set it, so that ADR needs an amendment. | Bypass skips the detail screen, which is the only place the form exists. Forcing it off without telling the sender would be a silent override, and this API refuses conflicts rather than resolving them. |

## Spikes

- **S1 — dynamic iOS categories from the extension.** On a real device with a
  release build, check that categories registered in `NotificationService.m`
  before `populateNotificationContent` show their actions on:
  - the first notification after install;
  - a cold device (the extension process hasn't run yet);
  - a burst of 5 notifications that all have different categories.

  Also check that SF Symbol icons and `authenticationRequired` render. If it
  fails, iOS falls back to tap-to-open only, and Android is unaffected.
- **S2 — native background submit on iOS.** On a real device with a release
  build, test the delegate added in `didFinishLaunching`:

  | Check | Expected | Fallback if it fails |
  | --- | --- | --- |
  | Tap while the app is backgrounded, and while it is killed | Handler runs, POST lands | — |
  | Tap after the user swiped the app away | iOS still launches the app in the background, because the tap is the user's own action (only silent pushes are blocked) | Mark actions `.foreground`, so the tap opens the app and submits from JS |
  | Handler is registered before the response on a cold launch | Yes, because launch finishes first | Drain `pendingResponses` on registration |
  | POST finishes after expo calls the completion handler | Yes, inside `beginBackgroundTask` | Background `URLSession` upload task |
  | Inline reply text arrives | `UNTextInputNotificationResponse.userText` | — |
  | Failure local notification shows | Yes | — |

  Every fallback is a build-time choice inside the same release, not a later
  phase.
- **S3 — Android checks.**
  - `registerTaskAsync` action delivery works alongside
    `@react-native-firebase/messaging` owning the messaging service, both
    killed and backgrounded.
  - Whether `setAuthenticationRequired` (API 31+) needs a small
    `expo-notifications` patch, alongside the large-icon patch we already carry.
    If it does, decide whether to require unlock on Android too.

## Out of scope (v1)

- **Moving `MINI_APP_INVITE` onto this.** The invite is deliberately not
  attributed to an app (see `invite-notifier.ts`), and today-v2 handles its
  answer itself rather than calling an app back. It could later become the first
  consumer of an "internal handler" target, and gain tray buttons that way.
- Dates, numbers, dropdowns, file upload, conditional fields, and editing or
  withdrawing an answer.
- Different interaction content per recipient. The interaction is the same for
  everyone, like `content`.
- Action buttons on the in-app foreground toast.
- Dismissing tray cards on iOS, or for every recipient on `/close`.
