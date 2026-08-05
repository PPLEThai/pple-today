---
'@api/backoffice': minor
---

Add `GET /external/notifications/app-install`, which answers whether PPLE Today reaches the phone behind a number, so a caller can tell someone who is missing notifications what to do about it.

Two flags, because they are two different facts. `isAppInstalled` says a PPLE Today account holds the number — which a PPLE ID alone does not imply, since registration happens on the pple-sso web site. `hasPushToken` says the native app is installed and reachable, and is the one that answers "will this person see a notification?": only the mobile app registers a token, it is false when notification permission was refused, and it self-corrects on uninstall because tokens FCM rejects are already dropped on the next send.

Gated like the raw-targeting send path — naming a phone number stays a central-team capability, so keys bound to a Builder App are rejected. Unknown and malformed numbers both answer false rather than erroring, so the endpoint cannot double as a way to probe which numbers exist or are well-formed.
