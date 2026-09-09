---
'@pple-today/database': minor
'@pple-today/api-common': minor
'@api/backoffice': minor
'@client/backoffice': minor
---

Let an admin add a notification key to a Builder App without an audience limit.

Capability used to be derived from `MiniApp.source`: any key bound to a
`PLATFORM` app was refused on the raw-targeting path with
`NOTIFICATION_KEY_APP_BOUND`. That was right while every such key belonged to the
Builder, but it left the central team unable to notify a Builder App's users with
an audience the app itself may not express — a phone number, a role, a broadcast
— while the notification still carried that app's name and icon. Attribution and
reach could not be had together.

Capability now lives on the key: `NotificationApiKey.source`
(`ADMIN` | `PLATFORM`). `miniAppId` answers *attribution* — whose name and icon
the notification wears — and `source` answers *capability* — what the key may ask
for, and whether it is metered. The column defaults to `ADMIN`, which is what an
admin-portal create is; the provisioner stamps `PLATFORM` explicitly, and the
migration backfills it for every key already bound to a Builder App, so no
existing key changes what it can do.

The Builder's privacy guarantee is unchanged — a provisioned key still cannot
name its own recipients — and every quota read and write is now scoped to
`source = PLATFORM`, so an admin's key on a Builder App is never mistaken for the
Builder's own spend.

In the admin portal, a Builder App's row now offers its notification keys: the
app itself stays read-only, the Builder's provisioned key is listed but not
manageable (`NOTIFICATION_API_KEY_PLATFORM_MANAGED` refuses it server-side too),
and the admin can add and manage keys of their own.
