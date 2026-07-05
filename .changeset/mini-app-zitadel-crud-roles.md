---
'@api/backoffice': patch
'@client/backoffice': patch
'@pple-today/api-common': patch
---

Zitadel app management and API-driven role options in Today Admin

- Manage Zitadel OIDC apps from the Mini App page: list, edit (name, redirect URIs, dev mode), and delete via the Zitadel Management API (`GET`/`PATCH`/`DELETE /admin/mini-app/zitadel-app`)
- Mini app role options now come from `GET /admin/mini-app/roles`: the main AD role labels merged with extra roles fetched from `AD_ROLE_OPTIONS_URL` (defaults to the PPLE SSO extra-roles endpoint) using the admin's bearer token
