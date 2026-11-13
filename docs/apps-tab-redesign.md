# แอปฯ tab redesign — plan

The แอปฯ tab (`apps-client/mobile/app/(tabs)/(official)/official.tsx`) is a flat
3-column grid of every mini app the active บทบาท can see. Three problems come
out of that:

1. **Apps are hard to find.** Nothing orders, groups or searches them.
2. **Builder apps are noisy.** Draft and Beta apps are listed by _being a
   builder or an invited tester_ (`isMiniAppListable` in
   `apps-api/backoffice/src/modules/mini-app/eligibility.ts`), not by role, so a
   Builder sees every one of their drafts mixed into the party's apps under
   every role. Most share the same placeholder icon.
3. **Users don't remember app names.** They know what they want to do
   ("โหวต", "แจ้งเรื่อง"), not what the app is called. The grid offers names
   only.

This plan fixes them in three phases. It came out of a design review and a
grilling session; each decision below records its reason so it can be revisited
deliberately rather than drift.

## Principles

- **Every API change is backwards compatible.** New response fields are
  optional and new columns nullable. The server deploys before the client
  release, and the client tolerates every new field being absent. Old app
  versions keep working unchanged; no forced update.
- **Members first, officials second.** Builders never shape the default view.
- **A Live app is a party app.** Every Builder app passes admin review on the
  Builder platform before it goes Live, so the main list does not distinguish
  member-built Live apps from central-team ones. If that review gate ever goes
  away, this decision must be revisited (add a "สร้างโดยสมาชิก" label backed by an
  optional `source` field).
- **Show machinery only when it earns its place.** Search and recents appear
  only when the role has more than 8 Live apps; a member with five apps sees
  five apps.

## The target screen

แอปฯ tab, top to bottom:

| #   | Section                        | Shown when                 | Phase                |
| --- | ------------------------------ | -------------------------- | -------------------- |
| 1   | Header + role picker           | always                     | —                    |
| 2   | Search                         | role has > 8 Live apps     | 1                    |
| 3   | Invite inbox                   | pending invites            | —                    |
| 4   | **แอปใหม่** card strip         | an app is new to the user  | 2                    |
| 5   | **ใช้ล่าสุด** recents          | role has > 8 Live apps     | 1                    |
| 6   | เลือกตั้ง carousel             | open `OFFICIAL` elections  | — (moved lower)      |
| 7   | Main list of Live apps         | always                     | grid in 1, rows in 2 |
| 8   | **แอปทดลองใช้ (n)**, collapsed | user can open ≥ 1 Beta app | 1                    |
| 9   | **แอปฉบับร่าง (n)**, collapsed | user builds ≥ 1 Draft app  | 1                    |

Non-Live apps stay on the แอปฯ tab, grouped by Publication Tier and collapsed
by default. (An earlier iteration moved Builders' apps to a ฉัน-tab screen;
dropped after trying it on a device — grouping by tier keeps every app on one
tab and needs no per-user relation to file it.)

"Role has > 8 Live apps" always means the count of the main list (section 7)
for the active person — never Beta or Draft apps — so search and recents
don't flicker on and off as the user switches บทบาท.

## Phase 1 — tidy up

### API (additive)

- `relation?: 'BUILDER' | 'TESTER'` on each `/mini-app` list item. Absent for
  ordinary Live apps. `BUILDER` (owner or collaborator) wins over `TESTER`. The
  server already computes both in `eligibility.ts`; this only exposes it. The
  client groups by tier and does not read it yet.
- `tagline?: string | null` on each list item, backed by a nullable
  `MiniApp.tagline` column. Verb-first, ≤ 60 characters (e.g.
  "ค้นคลังความรู้และเอกสารพรรค"). Required in the admin portal form and in the
  Builder platform before promotion to Beta — **not** in the database, so no
  backfill migration is needed. The ~10 central-team apps are filled in by hand
  before the client release.

### Grouping the list

| App            | Where it goes           |
| -------------- | ----------------------- |
| `tier = LIVE`  | main list               |
| `tier = BETA`  | แอปทดลองใช้ (collapsed) |
| `tier = DRAFT` | แอปฉบับร่าง (collapsed) |

Grouping is by Publication Tier, matching the platform's lifecycle
(Draft → Beta → Live; Thai ฉบับร่าง / ทดลองใช้ / เผยแพร่จริง). Beta is a stage,
not an invitation: แอปทดลองใช้ holds the user's own Beta apps, ones they help
build, and ones they were invited to test, together. Because it needs nothing
but `tier`, it works the same against an older server.

Old app versions keep showing Draft and Beta apps in the grid until they update.
The server must keep returning them — hiding them would lock Builders on old
versions out of their own apps.

### แอปทดลองใช้ and แอปฉบับร่าง

- Collapsed by default; each section's open state is remembered per device.
  The collapsed header reads "แอปทดลองใช้ (n)" / "แอปฉบับร่าง (n)" over
  "แตะเพื่อดู".
- Rows inside carry no tier badge — the heading already names the tier. Search
  results, which mix tiers, keep the badge on its own line under the name.
- แอปทดลองใช้ auto-expands once, highlighting the app, right after the user
  accepts an invite, so the accepted app does not seem to vanish.
- A section with no apps renders nothing. A role with no Live apps but some
  Beta or Draft apps still shows them.
- Open-only. Managing an app (testers, publishing) stays in PPLE Platform
  Console.

### Grid and icons

- The 3-column grid stays in Phase 1. Rows without taglines would only be a
  longer list; the switch waits for Phase 2.
- **Letter icons** replace the shared PPLE placeholder for apps without an
  icon: the first Thai consonant (skip leading vowels เ แ โ ใ ไ and treat
  combining marks as part of a grapheme), or the first Latin letter uppercased,
  on a background picked by hashing `slug` into a fixed, contrast-checked
  palette of brand-safe hues — free hashing could land on a rival party's
  colour. Names that start with "ระบบ" or "แอป" will share a letter; the colour
  does the distinguishing work there.

### Search

- Shown above 8 Live apps. Placeholder: "อยากทำอะไร? ค้นหาแอป…" once any app
  in the list has a tagline; until then plain "ค้นหาแอป…", since search can
  only match names.
- Covers the main list **and** Beta and Draft apps (which are role-independent), over
  name and tagline.
- Current บทบาท only. Searching other roles needs a new endpoint (Phase 3).
- Matching: substring, not prefix — Thai has no word breaks. Normalise to NFC,
  strip zero-width characters, ignore Latin case, trim whitespace.
- Empty result: "ไม่พบแอปที่ตรงกับ ‘…’". When the user has more than one
  eligible person, add "ลองเปลี่ยนบทบาท" with a button that opens the picker.
  The same hint applies to an empty main list.

### ใช้ล่าสุด

- Shown above 8 Live apps. One row, up to 4 apps.
- Stored on the device, keyed per active person (the list is role-scoped). Fall
  back to a user-level key when `activePersonId` is null.
- Intersected with the current list at render time, so retired, unlisted,
  role-removed or promoted apps drop out by themselves.
- Excludes Builder apps. Cleared on logout.
- Recorded when an app is opened from the แอปฯ tab (grid, recents, search,
  แอปทดลองใช้, แอปฉบับร่าง). Opens from a deep link or notification don't count.
- Not added to หน้าแรก — the feed is for content, and most members have too few
  apps for a strip to add anything. Revisit with Phase 3 data.

### Instrumentation

Phase 3 is gated on data, so collection starts now:

- open source: grid / list, recents, search, แอปทดลองใช้ (`beta`),
  แอปฉบับร่าง (`draft`), new-app strip (Firebase `mini_app_open`)
- searches with zero results (the query text, **not** tied to user identity —
  queries in a party app are sensitive)
- Live-app count per role

## Phase 2 — describe the apps

### API and data (additive)

- `keywords?: string[]` on list items, backed by `MiniApp.keywords String[]`
  defaulting to empty. Synonyms and intents ("ลงมติ", "โหวต", "whip", "KM").
  Admin-curated for central-team apps; Builders may add them on the platform.
- Tagline and keywords for Builder apps flow through the platform → PPLE Today
  sync, the same way `collaboratorSubs` does.
- `publishedAt` on `MiniApp`, nullable, stamped when an app is promoted to Live.
  Existing rows stay null. The column and the stamping ship in Phase 1 (first
  promotion to Live through the platform API; creation for central-team apps,
  which start Live) so the new-app strip has real data when it ships.
- `isNew?: boolean` on list items, computed server-side: `publishedAt` within the
  last 30 days **and** the user has no `MiniAppUser` row for the app (has never
  opened it). Opening an app anywhere clears it on every device.

### Rows

- The main list switches from the grid to rows: icon, name, tagline, chevron.
- A row with no tagline shows the name alone, vertically centred.
- Recheck the election carousel's position once rows push apps further down.

### Search

Covers name, tagline and keywords. A keyword hit shows which keyword matched, so
"โหวต" finding MP Whip doesn't look like a mistake.

### แอปใหม่

- A card strip above ใช้ล่าสุด: icon, name, tagline, ✕. The app also stays in
  the main list with a small "ใหม่" dot.
- "New" means `publishedAt` within 30 days, for apps the current role can see.
  An old app that becomes visible through a role change is **not** new.
- An app leaves the strip when the user **opens** it (server), **dismisses** it
  (✕, stored on the device per person) or 30 days pass. Merely being on screen
  does not count.
- No push notification. Admins can already send one through the mini-app
  notification system when a launch deserves it.

## Builder platform (outside this repo)

Tracked in PPLEThai/pple-platform#393. Terms and Thai wording follow the
platform's `CONTEXT.md` (Publication Tier, App Name / App Icon, Thai renderings).

- **Tagline follows the App Name's rules.** Freely editable while the app is
  Draft or Beta; required to go Draft → Beta; part of what the Platform Admin
  reviews in the PublishRequest (Beta → Live); after Live, changed only through
  a ChangeRequest. The main list's "no label on member-built apps" decision
  rests on that review.
- **Icons are already enforced.** The platform requires an icon in the
  PublishRequest for any app listed in PPLE Today, and a Live app's icon changes
  only through a ChangeRequest. Only an unlisted Live app may have none, and it
  appears in no list. So letter icons show only on Draft and Beta apps and on
  central-team apps without one — audit the latter in the admin portal.
- `publishedAt` is stamped by today-v2 itself when `PUT /platform/mini-apps/:id/tier`
  first sets LIVE; the platform needs no change for it.

## Phase 3 — data-gated

Built only when Phase 1–2 data justifies it:

- **Server-side recents** — `lastOpenedAt` / `openCount` on `MiniAppUser`, so
  recents follow the user across devices.
- **AI search fallback** — when keyword search finds nothing, offer
  "ลองค้นหาด้วย AI" calling a new embedding-search endpoint. Only if zero-result
  logs show keyword curation can't keep up. There is no embedding
  infrastructure in the repo today.
- **Cross-role search** — "มีในบทบาท สส. — สลับบทบาท".
- **Recents on หน้าแรก.**

## Decided against

- **Category chips.** Dropped. Task discovery rests on taglines and keywords;
  chips would need a taxonomy someone has to own, and most roles have too few
  apps to filter.
- **Pinning.** Recents cover the need without management UI.
- **A label on member-built Live apps.** See principles — the admin review gate
  makes it unnecessary.
- **Hiding Builder apps server-side.** Would break old app versions.
- **A management screen in the app.** Managing stays on the platform web.

## Accepted trade-offs

- A tester whose role doesn't match a Beta app loses it from their list when it
  goes Live. Live visibility is role-based by design.
- Dismissing a new app only hides it on that device; opening it hides it
  everywhere.
- Builders on old app versions keep the mixed grid until they update.
