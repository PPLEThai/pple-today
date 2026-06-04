---
'@api/backoffice': patch
'@client/mobile': patch
---

Resolve mini app visibility from the SSO AD active role (main + extra roles) instead of Zitadel roles. The official page now shows a `บทบาท:` active-role dropdown that polls every 10s, switches role via SSO, and refreshes the app list on change. Facebook endpoints are gated by the SSO AD active role as well.
