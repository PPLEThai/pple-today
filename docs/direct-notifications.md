# Direct notifications — letting an app name its recipients

Follow-up to [app-bound notifications](./app-bound-notifications.md). That change
gave every mini app a bound `NotificationApiKey` and an audience-bound send:
content in, and the platform decides who receives it. This one lets the app
**name** who it notifies on `POST /external/notifications`, without letting it
**reach** anyone new.

It exists because a content-only send forces every per-person message to become
a broadcast to the whole audience. An approval that concerns one person had to
be announced to everybody who uses the app.

The full contract and rationale live in the platform repo:
`pple-platform:docs/integration/direct-notifications.md` and
`pple-platform:docs/adr/0017-apps-may-name-notification-recipients.md`.

## The model

**Naming narrows; it never widens.** A named list is filtered by the same
`App Users ∩ current tier audience` intersection that resolves a broadcast, so
the set of people an app can reach is exactly what it was before. What changes
is that the app can now address a subset of them individually.

**`audience` is required, from day one.** Missing, malformed, or an empty
recipient list is a refusal — never a broadcast, never a no-op. A dropped field
must not be able to turn a message meant for one person into a message to
everyone, and that is not a property a default value can have. Notification
traffic was zero when this shipped (confirmed 2026-08-14), so there is no
lenient window and no versioned route; compatibility machinery would be
permanent complexity for a transient problem.

> **Status codes: read this before writing a client.** Issue #461 asked for
> `400` on every malformed body. What ships is split, because two different
> layers do the refusing:
>
> | Body | Status | Code |
> | --- | --- | --- |
> | No `audience`; unknown `kind`; `direct` with no `recipients`; `recipients` not an array | **422** | `VALIDATION_ERROR` |
> | `recipients: []`; over the 200 cap; an entry naming neither or both | **400** | `NOTIFICATION_INVALID_RECIPIENTS` |
>
> The first row is Elysia schema validation, which is a uniform 422 across
> *every* route in this API — inverting it here would make one endpoint
> disagree with the rest of the surface. The second row is `canonicalizeRecipients`,
> which answers 400 as the issue asked.
>
> The strict-migration guarantee is intact either way: every one of these is a
> refusal, none is a broadcast, and none is a no-op. But a client that branches
> on `400` alone will mis-handle the first row, so **pple-platform should
> confirm this split before shipping its template helper** — or say the word and
> the schema can be loosened to route everything through the 400.

**`not_reachable` is one collapsed status, and that is the feature.** It covers
*no PPLE ID account*, *an account that has never opened this app*, *outside the
app's current tier audience*, and *opted out*, and it must not distinguish
between them — in the response body, in an error code, or through timing.
Otherwise naming a phone number becomes a directory lookup: an app that cannot
*reach* anyone new could still *learn* who exists.

That guarantee is structural here rather than a filter applied at the end.
`AppNotificationRepository.getAppUserSubsByPhone` resolves numbers **through the
app's own `MiniAppUser` rows**, and the result is narrowed to the tier audience
before settlement — so an entry naming somebody outside the app is never
resolved to a person at all, and no step downstream holds a fact it has to
remember not to disclose. Resolution is one batched query rather than one per
entry, which is also what keeps the status from being measurable by timing.

## Request

```jsonc
{
  "audience": { "kind": "all" },
  //  or:     { "kind": "direct",
  //            "recipients": [{ "sub": "…" }, { "phone": "+66812345678" }] },
  "content": { "header": "…", "message": "…" },   // uniform across recipients
  "linkPath": "/approvals/123",                    // optional, unchanged
  "idempotencyKey": "…"                            // optional
}
```

Auth is unchanged: the app-bound key as bearer, and the key remains the whole
address — no app id on the wire. Legacy unbound keys are unaffected and keep
using `POST /external/notifications/send`.

One recipient entry names one person by `sub` **or** `phone`, exactly one of the
two. Neither, both, an empty list, or more than **200** recipients is a `400`
(`NOTIFICATION_INVALID_RECIPIENTS`) — never a silent truncation. Which
identifier wins when both are given would be a rule nobody remembers, and
answering an entry that named two different people would let a caller probe
whether they are the same person — the same probe the response shape below is
careful not to answer.

Phone numbers are canonicalised to **E.164, default region TH**, so `0812345678`
and `+66812345678` resolve to the same person. A number that is not a whole Thai
mobile number is *not* an error: it resolves to nobody, which is
indistinguishable from a number no account holds — and staying
indistinguishable is the point.

## Response

```jsonc
{ "results": [ { "recipient": { "sub": "…" },   "status": "delivered" },
               { "recipient": { "phone": "…" }, "status": "not_reachable" } ] }
```

One result per entry, in the order named, echoing each entry **as named** so the
caller can match them up. `kind: "all"` answers as it always has, with
`recipientCount` and no `results`.

Two entries naming the same person are both answered `delivered`, but that
person is notified once and charged once — de-duplication happens after
resolution, before metering.

**A direct send deliberately reports no `recipientCount`.** Both entries of a
pair naming one person come back `delivered`, which discloses nothing about
whether they *are* one person; a count of distinct people reached would answer
exactly that, and turn naming a `sub` alongside a `phone` into a test for
whether they belong to the same account. The 429 message quotes the count
*addressed* rather than the units it would have charged, for the same reason.

> **Residual disclosure, worth knowing about.** The contract requires both
> de-duplicated metering and a `remaining` budget in the response, so a caller
> who diffs `remaining` across a send can still infer that two identifiers
> collapsed to one person. That follows from the two requirements together, not
> from anything added here, and closing it would mean giving up one of them.
> Flagged for ADR-0017 rather than decided unilaterally.

## Metering — this changes existing behaviour

**A send debits the reach it requests, not the reach it achieves.**

- Direct: one unit per named recipient, delivered or not, after de-duplication.
- Broadcast: the audience size at send time.

So the quota is now **denominated in deliveries rather than calls**. A broadcast
to 4,000 App Users costs 4,000 where it used to be one usage-log row, and the
number behind `GET /platform/mini-apps/:id/notification-usage` (the Console
tile) changes meaning to match. `NotificationApiKeyUsageLog.units` carries the
amount and the daily budget is a `SUM` over it; the column defaults to `1`,
which is exactly what a pre-existing row meant when a row was a call, so no
backfill was needed.

Charging named-rather-than-delivered is deliberate: it keeps the cost of a send
proportional to what the caller asked for, and it is the only lever available
given the send never traverses the platform. It also stops a list of strangers
from being a free way to probe.

**pple-platform will restate its Resource Limit defaults and approved
LimitRequests against the new denomination.** The existing default of 1000/day
means something materially different now and should not be carried over
unexamined.

**Atomicity.** The budget is checked up front against the whole call, inside the
same locked transaction that writes the usage row. Insufficient quota is a `429`
with **nothing delivered** — a partial send the caller retries would
double-notify everyone it already reached.

`idempotencyKey`, when supplied, makes that retry safe: it is unique per key, and
a repeat is answered from the row the first attempt wrote rather than delivered
and charged again. Reusing one with a different number of recipients is a `409`
(`NOTIFICATION_IDEMPOTENCY_KEY_CONFLICT`) — the stored row holds outcomes but no
identities, so it can only be zipped back onto a list of the same length, and
answering anyway would tell the caller who was reached under a list they did not
send.

## Audit

Every call on this path writes one usage-log row recording the app, the
timestamp, the named count, the delivered count and the match ratio — and **no
recipient identities**, deliberately, so no per-person messaging history
accumulates. The platform cannot log any of this itself: the send is
authenticated by the app's own key and never traverses it.

The row also carries a positional array of the per-entry outcomes
(`["delivered", "not_reachable", …]`). This is beyond the list #461 enumerated,
and it is there for one reason: without it an `idempotencyKey` retry of a
*direct* send cannot be answered truthfully — re-resolving would report today's
reachability for a send that went out yesterday. It holds no identities and is
meaningless without the caller's own request, so nothing per-person accumulates;
but it is an addition, and should be confirmed rather than assumed.

The row is written for unmetered (central-team) keys too, which is a change: the
audit trail is per *call*, not per *metered* call. Those rows still carry their
`units`, so the Console's `sent` stays coherent across both kinds of key — they
are simply never held to a budget, and `dailyQuota` stays absent from what is
reported about them.

## Where the pieces live

| Concern | File |
| --- | --- |
| Validation, canonicalisation, de-duplication, statuses (pure) | `direct-recipients.ts` |
| Orchestration: settle → claim → deliver → release | `app-notification-service.ts` |
| Phone resolution, unit-denominated claim, idempotent replay | `app-notification-repository.ts` |
| Request/response schemas | `models.ts` |

## Out of scope

- **Per-person opt-out.** There is still no way to stop receiving from an app you
  have opened. Direct notifications make that gap more visible but do not widen
  the set of people exposed to it.
- **Per-recipient content.** Content is uniform across a call: this is one
  notification addressed to several people, not several notifications batched.
