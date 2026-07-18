---
'@api/backoffice': minor
'@client/backoffice': minor
'@pple-today/api-common': minor
---

Read-only admin view of platform-managed mini apps

- The `MiniApp` DTO gains `source` (ADMIN/PLATFORM), `ownerSub`, and `createdAt`, exposed to the admin backoffice API alongside the existing fields.
- The admin mini-app table shows tier, source, owner, and created date for every app, with a "จัดการโดย PPLE Platform" marker on platform-provisioned apps.
- Platform-sourced apps have no edit/delete controls in the table and are rejected by the admin update/delete endpoints (`MINI_APP_PLATFORM_MANAGED`) — they're owned by the Provisioner, not this admin. Manual admin app management is unchanged for ADMIN-source apps.
