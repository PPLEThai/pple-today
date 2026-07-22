# Platform edge membership door — today-v2 dependencies

The PPLE Platform enforces Publication Tier membership at its own edge — the
dispatch Worker every Builder App request passes through — as a coarse **first
door**, before a request reaches the Builder App. See pple-platform **#133** and
**ADR-0013** for the door itself and its rejected alternatives.

today-v2 owns the PPLE Today listing and is the single writer of Zitadel state,
so the door depends on a handful of today-v2-side facts and endpoints. This
document records what today-v2 now provides, and confirms the one open
mechanism the platform ticket left to today-v2 to decide (the launch token).
Tracks pple-platform **#134**.

## (a) Door callback registered as a redirect URI

Every platform-provisioned Builder App's OIDC client now allows **two** redirect
URIs: the app's own origin (the mini-app SDK's default) and the reserved door
callback on that same origin:

```
https://<app-host>/.pple/auth/callback
```

The door runs a PKCE authorization-code flow on the app's _own_ host and
redirects here, so its session cookie is host-scoped by construction and it
reuses the app's existing client rather than minting a second one. Dispatch
intercepts this path; it never reaches the Builder's app.

- Constant: `DOOR_CALLBACK_PATH` in
  `apps-api/backoffice/src/modules/platform/mini-app-service.ts`.
- Applied on **create** and re-applied whenever the app URL changes on
  **update**, so the callback stays in sync with the app origin.
- **Existing apps** (provisioned before the door, URL unchanged) are backfilled
  once by `apps-api/backoffice/scripts/backfill-door-redirect-uris.ts`
  (`pnpm --filter @api/backoffice backfill:door-redirect-uris --execute`).
  Dry-run by default; idempotent. **Run it before the door is enabled** so the
  PKCE flow does not fail for the existing fleet.

## (b) Beta-invitee membership read

```
GET /platform/mini-apps/:id/beta-membership/:userSub   (platform service token)
→ 200 { "isAcceptedTester": boolean }
→ 404 MINI_APP_NOT_FOUND   (unknown app — a provisioning mismatch, not "no access")
```

The door composes its Beta predicate from the store that authoritatively owns
each fact: Owner and Collaborators from the platform database, and the
invited-tester half from **here**. Membership is matched on the account
(`userId`), never the phone number, so a tester who changed their number keeps
the access they accepted. Collaborators are exempt from the Beta cap and do not
need an invite — the door admits them as builders, without calling this read.

## (c) Launch-token delivery — **confirmed: server-visible query parameters**

**Decision: query parameters. Zero SDK change.**

Inside the PPLE Today WebView the launch token is already delivered on the URL's
**query string** (`access_token`, `id_token`, `token_type`, `expires_in`) — the
mini-app SDK reads them from `window.location.search`
(`packages/mini-app/src/index.ts`, `getAccessTokenFromUrl`). Because they are in
the query string and not the fragment, they are **visible to the dispatch server**
on the cold-load request, so the door can validate the launch token and set its
session cookie server-side with **no SDK change** and **no `/.pple/auth/session`
POST**.

This is the "server-visible query parameter" option in ADR-0013, and it is the
one adopted. The alternative (moving the token to a URL fragment, which would
force the SDK to POST it to a dispatch endpoint on cold load) is therefore **not**
pursued. The door must, as today, branch on a launch token before falling back
to a browser OIDC redirect — a redirect inside a WebView with no browser session
would break the mini-app.

> Note for the door implementation: the SDK only treats a request as an in-Today
> launch when the `PPLETodayApp/<x.y.z> MiniApp` User-Agent **and** the
> `access_token` query parameter are both present (`isMiniApp()`), so the door's
> WebView-launch branch should key off the same launch-token parameter.

## (d) `unlisted` Live visibility state

A Live app can now be **unlisted**: listed to no one, yet still reachable by its
link — distinct from empty visibility roles, which mean "listed to everyone".

- Storage: `MiniApp.unlisted` (boolean, default false).
- Set by the platform: `PUT /platform/mini-apps/:id/unlisted { unlisted }`.
  Orthogonal to the visibility roles, which it leaves untouched.
- Listing vs access are now separate predicates
  (`apps-api/backoffice/src/modules/mini-app/eligibility.ts`):
  - `isMiniAppListable` — an unlisted Live app is listed to **no one**.
  - `isMiniAppAccessible` — an unlisted Live app is reachable by **any
    authenticated member** who has the link (roles do not gate access for it).
- Non-unlisted Live apps are unchanged: role-gated for both listing and access,
  empty roles public.

## (e) Draft/Beta apps listed for Owner **and** Collaborators

today-v2 previously listed a Draft app for its Owner alone, so a Collaborator
could build and deploy but never saw the app in PPLE Today — the visibility side
of the gap the web door surfaces (the door rightly admits Collaborators).

- Storage: `MiniApp.collaboratorSubs` (string[] of PPLE ID `sub`s), synced from
  the platform database, which owns Collaborators authoritatively.
- Set by the platform: `PUT /platform/mini-apps/:id/collaborators
{ collaboratorSubs }` (a whole-list replace, so today-v2 mirrors the platform
  exactly and never drifts).
- Eligibility now admits **builders** — Owner _or_ a Collaborator — for both
  Draft and Beta listing and access. (Beta additionally admits accepted
  invitees, as before.)

## What stays where (source of truth)

| Fact                     | Owned by           | today-v2's role                                   |
| ------------------------ | ------------------ | ------------------------------------------------- |
| Owner, Collaborators     | platform database  | mirrors `ownerSub`/`collaboratorSubs` for listing |
| Accepted invited testers | today-v2           | authoritative — read via (b)                      |
| Effective tier           | platform database  | records it; re-lists accordingly                  |
| `unlisted` mode          | platform (Console) | authoritative store, applied to listing/access    |
