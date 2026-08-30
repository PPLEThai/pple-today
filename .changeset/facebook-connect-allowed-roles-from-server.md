---
'@api/backoffice': patch
'@client/mobile': patch
---

Move Facebook page access and CMS admin access onto SSO AD roles.

`GET /facebook/config` now answers `canConnectPage` by running the same precondition the `/facebook` routes enforce, so the section a user sees and the routes they may call can no longer disagree — and changing who may connect a page (including the `pple-ad:ppleToday:allowFB` override) is a backend deploy rather than an app release. The app caches the answer for an hour and re-asks when the user switches บทบาท.

The CMS guard now requires the AD role `pple-ad:ppleToday:admin` instead of the Zitadel role `today-cms:admin`, so admin access follows the active role like every other authorisation decision. **Grant `ppleToday:admin` in SSO AD to everyone who needs the CMS before deploying** — the Zitadel role no longer admits.
