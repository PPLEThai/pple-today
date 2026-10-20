---
'@api/backoffice': patch
---

Add a mini-app session exchange keyed by client id and page URL for the session bridge

- New `POST /auth/mini-app/client/:clientId?pageUrl=…` resolves the mini app registered under that client id at the page's origin, applies the same access rules and App User registration as opening by slug, and returns its session. An app that does not require authentication resolves with `session: null`.
- `POST /auth/mini-app/:slug` also returns `slug`, `clientId`, `baseUrl` and `session` alongside `url`, which still carries the tokens for older SDKs.
