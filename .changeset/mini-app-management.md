---
'@api/backoffice': minor
'@client/backoffice': minor
'@client/mobile': minor
'@pple-today/api-common': minor
'@pple-today/database': minor
---

Manage mini apps in one place from Today Admin

- New Mini App management page in the backoffice (`/mini-app`): create/edit/delete mini apps with icon upload (client-side resize to 256px PNG, hosted as public URL instead of base64 in the database)
- Optionally auto-create the OIDC app in Zitadel via the Management API (with Login V2 base URI), or create a Zitadel app only for standalone webapps (`POST /admin/mini-app/zitadel-app`)
- New `requiresAuth` flag on mini apps: public (no-auth) mini apps fall back to `DEFAULT_MINI_APP_CLIENT_ID` and open directly in the mobile app without token exchange, so logged-out users can use them
- Migration script `migrate:mini-app-icons` (dry-run by default) converts existing base64 icons to hosted URLs
