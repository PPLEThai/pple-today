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
| `expiresAt` | ISO date-time | Optional. Must include `Z` or a UTC offset (a bare local time is refused), be in the future, and be ≤ 30 days ahead. After that, answers are refused and the UI shows "หมดเวลาตอบกลับ". |
| `fields` | Field[] | 0–5, rendered in order above the actions. |
| `actions` | Action[] | 1–3. Required. |
| `tray` | boolean | Optional, default `true`. `false` keeps the OS notification free of action buttons, so tapping it always opens the form. |
| `liveActivity` | boolean | Optional, default `false`. On capable iPhones, deliver this question as a Live Activity with its buttons always visible instead of as a notification. Requires `expiresAt` ≤ 8 h ahead, a shape with tray buttons, and `tray` not `false`. See [Live Activity (iOS)](#live-activity-ios). |

Ids (`field.id`, `action.id`, `option.id`) must match `^[a-z0-9_-]{1,32}$` and be
unique within their list. The ids `__proto__`, `constructor` and `prototype` are
reserved and refused, because answers are keyed by field id. The callback reports
these ids, so the app should pick names it can switch on.

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
| `NOTIFICATION_INTERACTION_NO_CALLBACK` | The sending app has no usable callback target: an `ADMIN` app with no callback URL, no callback secret, or no encryption key configured (`NOTIFICATION_CALLBACK_SECRET_KEY`); a `PLATFORM` app while the relay isn't configured; or an unbound legacy key with no app at all. |
| `NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED` | `content.link.bypassNotificationCenter: true` on the raw path, together with `interaction` (D9). |
| `NOTIFICATION_INVALID_INTERACTION` (Live Activity) | `liveActivity: true` with no `expiresAt` or one more than 8 h ahead, with `tray: false`, or with an interaction whose tray shape is not `kind: "buttons"` (the reply shape and the form-only shapes) (D18). |

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

This narrows the "first approver wins" race, but doesn't settle it alone. The
call is idempotent and only the attributed app may make it. Any other caller gets
`404`, so the endpoint can't be used to find out other apps' notification ids.
Recipients who haven't answered see "ปิดรับคำตอบแล้ว", and a tray tap is refused
the same way. Answers already recorded are still delivered.

`/close` doesn't stop answers already in flight, and delivery is unordered, so an
app may receive answers after it has called `/close`. Answers are refused only
once the close has committed. An app that needs "first wins" must arbitrate on
its own side by `respondedAt` (then `id`), and ignore or reverse later answers.

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
  FAILED     // gave up: retries exhausted, permanent 4xx/410/3xx, answer 7 days old
             // with the app still misconfigured, or the app retired or deleted
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
  miniAppId      String?  // denormalised: per-app delivery queries and Console views.
                          // Null once an ADMIN app is deleted (the answer is kept).

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
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  miniApp      MiniApp?     @relation(fields: [miniAppId], references: [id], onDelete: SetNull)

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
  // Encrypted values carry a key id, so the key can be rotated (see below).
  notificationCallbackSecret String?
  // The secret this one replaced, kept for 24 h so a receiver that hasn't
  // switched yet keeps verifying. Cleared when the grace window ends.
  notificationCallbackPreviousSecret          String?
  notificationCallbackPreviousSecretExpiresAt DateTime?
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

**Stored secret keys.** Encrypted callback secrets carry a key id, so the
encryption key (`NOTIFICATION_CALLBACK_SECRET_KEY`) can be rotated.
`NOTIFICATION_CALLBACK_SECRET_KEY_PREVIOUS` decrypts secrets written under the old
key. A job that re-encrypts old rows under the new key is a follow-up.

**Deletion (D14).**

- **Deleting an `ADMIN` app keeps its users' answers.** `miniAppId` becomes null.
  Its `PENDING` deliveries are marked `FAILED` ("app deleted"). Recipients who
  haven't answered see `CLOSED`.
- **Deleting a user deletes their answers**, and any pending delivery for them is
  dropped with them.
- **`ref` is kept for the life of the notification.** It is the sender's own id,
  not user data.

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
retired or deleted, the state is `CLOSED`. While `INTERACTIVE_NOTIFICATIONS_ENABLED`
is off, a read reports `CLOSED` for anything not already answered, so the app never
shows a form that can't be submitted (D15).

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

`/response` is the canonical path, and the one native tray code calls. The typed
Eden client cannot express it (a path segment named `response` collides with
Elysia's route-type key and drops `GET /notifications/:id` from the typed path
list), so the same handler is also mounted at `POST /notifications/:id/answer`,
which is the one the in-app form calls through the typed client.

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
| 401 | `NOTIFICATION_RESPONSE_TOKEN_INVALID` | Bad signature, expired token, a token for a different notification, or a token whose device is no longer registered to the user (for example after logout). |
| 404 | `NOTIFICATION_NOT_FOUND` | The notification doesn't exist, the caller isn't a recipient (no `UserNotification` row), or it has no interaction. All three return the same response. |
| 409 | `NOTIFICATION_ALREADY_RESPONDED` | The unique key already exists. The body includes the existing answer. |
| 410 | `NOTIFICATION_INTERACTION_CLOSED` | Expired, closed, the sending app has been retired or deleted, or the feature is switched off. |

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
| Exactly one `text` field and one action | An inline reply box. The action's label is the send button. If that action has `confirm`, it is one button that opens the app (`bg: false`) instead, with the dialog open. |
| Only `text` fields, none `required` | One button per action. Submits with empty values. An action with `requires` opens the form instead. |
| Any `radio` or `checkbox`, or a `required` field (other than the reply shape) | No action buttons. Tapping opens the form. |

The following rules apply on top of the table:

- **An action with `confirm` opens the app** to the detail screen with the
  dialog already open. A dialog can't be shown in the tray, and leaving it out
  would turn a deliberate two-step action into a one-tap one. This is why a single
  text field with a single `confirm` action becomes one `kind: "buttons"` card
  with a single `bg: false` button, not a reply box.
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
v1.<base64url({ "n": notificationId, "u": userId, "e": expUnix, "d": deviceHash, "k": keyId })>.<base64url(HMAC-SHA256)>
```

- It is signed with `NOTIFICATION_RESPONSE_TOKEN_SECRET`. Nothing is stored for
  it. Single use is already enforced by the unique response row. Closing and
  expiry are checked at submit time like any other answer.
- `e` = `interactionExpiresAt`, or 30 days if the interaction has none.
- `d` binds the token to a device: the base64url of the first 16 bytes of the
  SHA-256 of the FCM token the push was sent to. On submit, the user must still
  have that device registered. Logging out unregisters the device, which kills
  its tokens, and the app also clears interactive cards from the tray on logout
  (D12).
- `k` is the key id: the first 8 hex characters of the SHA-256 of the secret.
  `NOTIFICATION_RESPONSE_TOKEN_SECRET_PREVIOUS` is also accepted for
  verification, so the secret can be rotated without breaking cards already in
  the tray.
- It is minted per recipient. The send path already builds one FCM message per
  token (`buildFcmMessage`), so a value per user costs nothing extra. `PushToken`
  gains `userId`.
- It is only included for tokens with `supportsTrayInteraction`, and only when
  the shape gets tray actions. Tray data goes only to iOS tokens with tray
  support, and to Android tokens with tray support that are on the branded
  data-only path. Other Android tokens get a plain `notification` payload.
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
4. Reads the categories back with `getNotificationCategories`, bounded by the
   same timeout, so iOS has committed the set before the notification is shown.
   If the new category isn't in the read-back, it is set anyway: the worst case
   is a notification without actions.
5. Sets `bestAttemptContent.categoryIdentifier`.

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

### Logout

Before revoking the session, the app calls `POST /notifications/unregister
{ deviceToken }`. It removes the caller's own registration of that token (a
token since re-registered by someone else is left alone), so the device stops
getting the user's pushes and every response token bound to it stops working.
The call is best effort with a 5 s timeout, so logout never hangs on it. If it
fails, the tokens still die when another user registers the device, when FCM
drops the token, or when they expire.

The app also removes every interactive card from the tray: on Android,
presented notifications whose identifier starts with `pple.notification.` and
whose data carries `pple_interaction`; on iOS, those whose category starts with
`pple.ix.`. It also deletes the `pple.ix.*` categories and leaves other categories
alone. The server refuses their tokens as well (the device is unregistered), so
this is the UX half.

### Foreground

If the app is open when an interactive push arrives, the existing in-app toast
shows it, as it does today. Tapping the toast opens the detail screen. The toast
has no action buttons.

## Live Activity (iOS)

> **Status: proposed 2026-11-10.** Not built. Spikes S4–S6 come first.

iOS only shows a notification's actions after a long press, and no API changes
that. A **Live Activity** is the one iOS surface where buttons are visible
without one: on the Lock Screen and in the Dynamic Island. A sender opts in with
`interaction.liveActivity: true` for urgent, time-boxed questions. Every other
interactive send stays an ordinary notification.

```text
send (liveActivity: true)
  ├─ capable iPhone  → FCM push-to-start  → Live Activity (+ alert sound/banner)
  │                                          ├─ button → LiveActivityIntent → POST /notifications/:id/response
  │                                          └─ app woken → update token → POST /notifications/:id/live-activity
  └─ everything else → the normal push, unchanged (tray buttons as above)

answered (any channel) · closed · expired
  └─ server → FCM "end" to every recorded activity of that notification
```

### Who gets one

A recipient token gets a Live Activity **instead of** the normal push only when
all of these hold. Otherwise it gets the normal push, exactly as without the
flag:

- the send has `liveActivity: true`, and the interaction is open;
- the token is `IOS`, with `supportsTrayInteraction`;
- the token has a `liveActivityStartToken`, and `liveActivitiesEnabled` is true
  (see [Live Activity registration](#live-activity-registration));
- `LIVE_ACTIVITY_DISABLED` is not set on the server (the kill switch).

The notification is still created and listed in the app as usual. Only the
OS-level delivery differs. Older builds and Android are unaffected.

### What it shows

The view is the same on the Lock Screen and in the expanded Dynamic Island:

- **Header:** PPLE Today's icon and the sending app's name. A Live Activity
  can't load remote images, so the app's own icon isn't shown.
- **Body:** `content.header` (1 line) and `content.message` (2 lines).
- **Buttons:** one per action, at most 3. They use the action label and the
  SF Symbol for its `icon`, and `destructive` actions are red.
- **After the activity ends:** the buttons are replaced by a status line:
  "ตอบแล้ว: <action label>", "ปิดรับคำตอบแล้ว" or "หมดเวลาตอบกลับ".

The compact Dynamic Island shows the app icon on the leading side and "ตอบ" on
the trailing side, and the minimal one shows the icon only. Tapping anywhere
except a button opens the notification detail screen (`widgetURL`), as a body
tap does today.

Buttons follow the tray rules for `bg`:
- `bg: true` runs the answer in the background (`Button(intent:)`).
- `bg: false` (`confirm` or `requires`) is a `Link` that opens the detail screen
  with that action pending, as the tray does.

### Starting it: push-to-start through FCM

FCM's HTTP v1 API sends ActivityKit pushes through `apns.live_activity_token`.
The API already calls HTTP v1 directly (`plugins/cloud-messaging.ts`), so this
is a different message from `buildFcmMessage`, not a new transport:

```jsonc
{
  "message": {
    "token": "<FCM registration token>",
    "apns": {
      "live_activity_token": "<push-to-start token>",
      "headers": { "apns-priority": "10" },
      "payload": {
        "aps": {
          "timestamp": 1794300000,
          "event": "start",
          "attributes-type": "PPLEInteractionAttributes",
          "attributes": {
            "notificationId": "clw…",
            "appName": "Test App",
            "header": "คำขอลางาน",
            "message": "สมชายขอลา 12–14 พ.ย.",
            "actions": [{ "id": "approve", "label": "อนุมัติ", "icon": "check", "bg": true }],
            "responseToken": "v1.…"
          },
          "content-state": { "status": "open" },
          "stale-date": 1794328800,
          "input-push-token": 1,
          "alert": { "title": "คำขอลางาน", "body": "สมชายขอลา 12–14 พ.ย." }
        }
      }
    }
  }
}
```

- **`attributes-type` must match the Swift struct name.** Attributes can't
  change after the start, so everything fixed goes there, including the
  response token: it's the same per-recipient, device-bound token the tray uses.
  `content-state` holds only what changes.
- **`stale-date` = `expiresAt`.** iOS greys the activity out at that moment even
  if the end push is lost. The 8 h cap (D18) keeps the whole question inside
  iOS's active-activity limit.
- **`alert`** lights the screen and plays the sound, so the user gets one item,
  not a notification plus an activity.
- **`input-push-token: 1`** asks iOS 18+ to issue an update token for the new
  activity. On 17.2–17.x the token comes without it.

There is no delivery receipt for a Live Activity: if iOS drops the start (for
example because Live Activities were turned off a moment ago), the user isn't
told on the device. The question is still in the app's notification list, which
is the backstop. S5 measures how often this happens and decides whether a
fallback push is needed.

### Answering

A button is a `LiveActivityIntent` (`AnswerInteractionIntent(notificationId,
actionId)`). It runs in the app's process, which iOS starts in the background if
needed, and does the following:

1. Finds the activity by `notificationId` and reads `responseToken` from its
   attributes.
2. POSTs `/notifications/:id/response` with `X-Notification-Response-Token`.
   It's the same submit the tray's `TrayActionDelegate` does, and it moves into
   a shared Swift function.
3. Ends the activity locally with the result. On `200` it shows "ตอบแล้ว:
   <label>" and is dismissed after 15 min. On `409`/`410` it shows the matching
   status. On a network error it stays open and shows "ส่งคำตอบไม่สำเร็จ ลองอีกครั้ง".

**Unlock first.** The tray asks for an unlock on every action, and a Live
Activity on the Lock Screen must not be weaker. The intent sets
`authenticationPolicy = .requiresAuthentication`. Whether iOS honours that for
Live Activity buttons on the Lock Screen is S4. If it doesn't, every Live
Activity button becomes a `Link` that opens the detail screen. Unlocking
then happens naturally, and the buttons are still visible without a long
press.

The server records the answer as `channel: "TRAY"`. No new channel is needed:
the app treats both the same.

### Ending it on every device

Each activity has its own **update token**. iOS issues it after the start and
wakes the app in the background to receive it. The app watches
`Activity<PPLEInteractionAttributes>.activityUpdates` and each activity's
`pushTokenUpdates` from launch. When a token arrives it calls:

```
POST /notifications/:id/live-activity
X-Notification-Response-Token: v1.…   // from the activity's attributes
{ "pushToken": "<hex>" }
```

The response token is the credential, for the same reason as the tray (D7):
this runs headless and must not touch the session. A token rotation upserts.

New table `NotificationLiveActivity`:

| Column | Notes |
| --- | --- |
| `notificationId`, `userId` | FK, cascade with the notification and the user |
| `deviceToken` | The FCM token it was started on. FK to `UserNotificationToken`, cascade, so logout and unregister drop it |
| `pushToken` | The latest update token |
| `endedAt` | Set when we send the end push |

The server sends `event: "end"` to every un-ended row of the notification when
any of these happens. Each end push uses the row's `pushToken` and the device's
FCM token, and carries a final `content-state`:

| Trigger | Final state | `dismissal-date` |
| --- | --- | --- |
| The user answered (any device, any channel) | `answered`, with the action label | now + 15 min on the answering device, now on others |
| `/close` | `closed` | now + 15 min |
| `expiresAt` passed (the callback sweep also picks these up) | `expired` | now + 15 min |
| Logout / unregister | none: the app ends its activities locally, as it clears tray cards | — |

This is one push per started activity, not one per recipient, so `/close` on a
broadcast only costs pushes for the people who actually have an activity open.

**When the update token never arrives.** Reportedly this happens after a
force-quit (S5). Without the token, the activity can't be ended remotely. Two
things bound the damage:
- `stale-date` greys it out at expiry, and iOS removes it by its own limits;
- every app launch reconciles: for each running activity it reads the
  notification, and ends any that are answered, closed or expired.

A stale button that is tapped gets `409`/`410` and shows the matching status,
as a stale tray card does.

### Live Activity registration

`RegisterNotificationBody` gains two fields, stored on `UserNotificationToken`:

- `liveActivityStartToken` (hex). The app reads it from
  `Activity<PPLEInteractionAttributes>.pushToStartTokenUpdates` on iOS 17.2+,
  and re-registers when it changes.
- `liveActivitiesEnabled`, from `ActivityAuthorizationInfo`. The app
  re-registers when `activityEnablementUpdates` reports a change.

A build sends these only once its widget extension and intent are in place.
`supportsTrayInteraction` keeps its meaning.

### Native pieces

| Piece | Where |
| --- | --- |
| Widget extension target (SwiftUI `ActivityConfiguration`: Lock Screen and Dynamic Island) | `targets/live-activity/`, generated by `@bacons/apple-targets` from a config plugin |
| `PPLEInteractionAttributes` (shared by the app and the extension; the name is the wire `attributes-type`) | `targets/live-activity/` + app target |
| `AnswerInteractionIntent: LiveActivityIntent` and the shared submit | `modules/notification-actions/ios` |
| Start-token, enablement and update-token observers, and launch reconcile | `modules/notification-actions/ios` (`ExpoAppDelegateSubscriber`), with JS events for the registration fields |
| `NSSupportsLiveActivities = YES` | Info.plist via the config plugin |
| Server: start/end message builders | `utils/push-payload.ts` (`buildLiveActivityStart`, `buildLiveActivityEnd`) |
| Server: token endpoint, end fan-out | `notification/live-activity.ts` |

The app's deployment target stays 15.1. All of this is gated with
`@available(iOS 17.2, *)`.

## Callback — today-v2 → app

### Target

| `MiniApp.source` | Target |
| --- | --- |
| `ADMIN` | `MiniApp.notificationCallbackUrl`. https only, with no credentials in the URL. Every address the host resolves to must be public (not private, loopback or link-local), the connection is pinned to the address that was checked, and redirects are never followed: a `3xx` is a permanent failure (SSRF guard, D13). Checked when saved and again on every send. |
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

During a secret rotation (below) the header carries two values, same HMAC input:
`v1=<new>,v1=<old>`. A receiver accepts the request if **any** `v1=` value matches.

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
- **Rotation.** Rotating an ADMIN app's callback secret keeps the old one for
  24 h. During that window requests carry both signatures, so receivers can
  switch at their own pace. Clearing the URL clears both secrets (D11).
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
| `401`, `403`, `404`, `408`, `429`, `5xx`, timeout, network error | Retry |
| `410 Gone` | `FAILED`, no retry. This is how an app says "stop sending me these" (D6). |
| `3xx`, other `4xx` | `FAILED`, no retry. A broken receiver won't fix itself on retry. |

`401`, `403` and `404` are retried because a rotated secret, a bad deploy, or a
relay tenant that doesn't have the handler yet must not lose answers (D10).

Retries back off: immediately, then +1 min, +5 min, +30 min, +2 h, +6 h, +24 h.
After that the row is `FAILED` (7 attempts over about 32 h).

**Our own misconfiguration doesn't use up attempts.** If the relay isn't
configured, the URL or secret is missing, or an encryption key is unset or can't
decrypt, the row is rescheduled every 30 min without counting an attempt. It
becomes `FAILED` once the answer is 7 days old. A deleted app fails at once with
"app deleted".

**Scheduling** follows the existing gitops CronJob pattern. A CronJob runs every
minute and calls the internal-only route
`POST /internal/notification-callbacks/sweep`. The route:

- claims due rows with `FOR UPDATE SKIP LOCKED`, at most 20 per app and 100 in
  total per batch, so one app's backlog can't starve the others;
- delivers them, with at most 10 in flight per app per API replica, so one slow
  app can't hold up the others;
- runs the 90-day `values` purge.

The same cap of 10 applies to the immediate attempt after an answer: if the app
is already at its cap, that attempt is skipped and the sweep picks the row up.

There are no in-process timers, so it stays correct with several API replicas.

**Retiring an app** marks its `PENDING` rows `FAILED` (`lastError: "app
retired"`), in the same step that deactivates its key. Deleting one does the same
with "app deleted" (see [Storage](#storage)).

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
| Live Activity (iOS): widget extension, intent, token observers | `targets/live-activity/`, `modules/notification-actions` (see [Native pieces](#native-pieces)) |
| Live Activity start/end messages, token endpoint, end fan-out | `utils/push-payload.ts`, `notification/live-activity.ts` |

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
7. **Live Activity (iOS):**
   1. Spikes S4–S6, on a TestFlight build with a throwaway activity.
   2. Server work, behind `LIVE_ACTIVITY_DISABLED` (a kill switch; the feature
      only does anything for tokens that report a start token):
      - `liveActivity` validation;
      - the registration fields;
      - `NotificationLiveActivity` and its migration;
      - the start/end builders, the token endpoint, and the end fan-out from
        answer, `/close` and the sweep.
   3. Mobile release: the widget extension, the intent, the observers and the
      reconcile. This is a native build, not OTA.
   4. pple-platform: pass `liveActivity` through the template's `notify()` and
      `pple notify test`, and document it in the Skill's `mini-app.md`.

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
| D10 | Which callback statuses are retried? | `401`, `403`, `404`, `408`, `429`, `5xx`, timeouts and network errors retry on the normal backoff. `410`, `3xx` and other `4xx` are permanent. Our own misconfiguration reschedules every 30 min without using an attempt, and fails once the answer is 7 days old. | A rotated secret (`401`/`403`), a bad deploy or a relay tenant without the handler (`404`) is fixable by the app, and must not lose answers. Misconfiguration is ours, so it shouldn't burn the app's attempts. |
| D11 | How is a callback secret rotated? | The old secret is kept for 24 h. Requests carry `v1=<new>,v1=<old>`, and a receiver accepts any match. Clearing the URL clears both. | A receiver can't switch the instant we rotate. Two signatures over the same input let it switch at its own pace, with no lost answers. |
| D12 | What stops a response token being used after logout? | The token carries a hash of the FCM token (`d`) and a key id (`k`). The user must still have that device registered, and logout unregisters it. The app also clears interactive cards from the tray. `NOTIFICATION_RESPONSE_TOKEN_SECRET_PREVIOUS` is accepted for verification. | A token left in a tray after logout, or on a shared device, would otherwise answer as the previous user. The previous-secret slot lets the secret rotate without breaking cards still in the tray. |
| D13 | SSRF rules for ADMIN callback URLs | https only, no credentials in the URL, every resolved address public, the connection pinned to the checked address, redirects never followed (`3xx` is permanent). Checked on save and on every send. | A user-set URL is fetched from inside our network. Checking once and then connecting by name leaves a rebinding gap, and a followed redirect skips the check altogether. |
| D14 | What happens to answers on app or user deletion? | Deleting an ADMIN app keeps the answers (`miniAppId` becomes null), fails its pending deliveries ("app deleted"), and unanswered recipients see `CLOSED`. Deleting a user deletes their answers and pending deliveries. `ref` stays. | The answer is the user's record, and doesn't depend on the app existing. A deleted user's data should go with them. `ref` is the sender's own id, not user data. |
| D15 | What does a read show while the kill switch is off? | `CLOSED` for anything not already answered. | The form would be shown but couldn't be submitted. |
| D16 | Does `/close` guarantee "first approver wins"? | No. Answers already in flight still land, and delivery is unordered. Apps arbitrate by `respondedAt`, then `id`. Answers are refused only once the close has committed. | Strict ordering across replicas would need a per-notification lock for a rare case. The app has the authoritative record, so it decides. |
| D17 | How many deliveries run at once? | At most 10 in flight per app per API replica, covering both the immediate attempt and the sweep. The sweep claims at most 20 rows per app and 100 per batch. | One slow app, or one big backlog, mustn't starve the others. An immediate attempt that finds its app at the cap leaves the row to the sweep. |
| D18 | Which sends can be a Live Activity? | Opt-in per send (`liveActivity: true`), only with `expiresAt` ≤ 8 h, `tray` not `false`, and a `kind: "buttons"` tray shape. Anything else is refused with `400`. | Apple meant Live Activities for ongoing, time-bound events, so they shouldn't be the default for every question. iOS ends an active activity after 8 h, so a longer question would outlive its own buttons. A Live Activity can't take text input, so the reply and form shapes have nothing to put on it. |
| D19 | A Live Activity instead of, or as well as, the notification? | Instead of, on tokens that qualify. The start push carries the `alert`. The question still appears in the in-app list. | Two items for one question is noise. The alert gives the same sound and screen wake as a notification. |
| D20 | How does an activity end on other devices? | Each activity's update token is stored (`NotificationLiveActivity`), and the server sends `end` on answer, `/close` and expiry. `stale-date`, plus a reconcile on every app launch, covers lost tokens. | Without it, a question answered on another device would keep live buttons on this one until it expired. |
| D21 | Credential for the Live Activity token upload and the intent | The tray's response token, carried in the activity's attributes. | Both run headless, so the session must not be touched (D7). The token is already bound to the notification, the user and the device. |

## Spikes

- **S1 — dynamic iOS categories from the extension.** On a real device with a
  release build, check that categories registered in `NotificationService.m`
  before `populateNotificationContent` show their actions on:
  - the first notification after install;
  - a cold device (the extension process hasn't run yet);
  - a burst of 5 notifications that all have different categories;
  - reading the categories back after `setNotificationCategories` before
    displaying (as OneSignal does) makes the actions appear reliably, including
    on the first and cold-device cases.

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

- **S4 — unlock before a Live Activity answer.** On iOS 17.2, 18 and 26, with
  the phone locked, does a Lock Screen button whose intent has
  `authenticationPolicy = .requiresAuthentication` ask for Face ID / passcode
  before `perform()`? Check the Dynamic Island too. If it doesn't on any
  supported version, buttons become `Link`s that open the detail screen on that
  version.
- **S5 — push-to-start reliability.** Through FCM, with our APNs key:
  - the start arrives when the app is backgrounded, killed, and force-quit;
  - an update token reaches the server in each of those cases (with and without
    `input-push-token`);
  - what happens when Live Activities are off for the app, and how fast
    `activityEnablementUpdates` reports it;
  - whether several starts within minutes are throttled.

  If update tokens are commonly missing after a force-quit, the launch
  reconcile stays the backstop. If starts are dropped silently while the app
  reports Live Activities as enabled, add a fallback normal push when no update
  token arrives within 2 min.
- **S6 — FCM ActivityKit sends.** Check that our HTTP v1 call with
  `apns.live_activity_token` works with the project's APNs credentials. FCM
  needs a token-based (.p8) APNs key for this, not a certificate. Also check
  that an end push with `dismissal-date` and a final `content-state` renders the
  status line.

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
- A Live Activity equivalent on Android. Android 16's Live Updates are meant for
  progress-style notifications. Android's expanded heads-up notification
  already shows the buttons without a long press.
- Live Activities for the reply and form shapes, and broadcast-channel Live
  Activities (iOS 18).
