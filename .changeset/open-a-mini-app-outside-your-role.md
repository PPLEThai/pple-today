---
'@pple-today/api-common': patch
'@api/backoffice': patch
'@client/mobile': patch
---

Ask, rather than refuse, when a mini-app link falls outside your บทบาท

- Opening a published mini app whose role list does not cover your active role used to dead-end on "เกิดข้อผิดพลาดในการยืนยันตัวตน" and a not-found screen. The role list is a *listing* filter — it decides whose app grid shows the app — and every mini app authorises its own routes anyway, so this is now a question: `กำลังเข้าสู่แอปฯ "{ชื่อแอป}"`, with ยกเลิก and เข้าใช้งาน.
- A user with more than one eligible role is offered the บทบาท dropdown in the same prompt, preselected on a role the app is actually listed for, and switching happens before the app opens.
- The token exchange gained `MINI_APP_ROLE_NOT_ELIGIBLE` (403, carrying the app's name and roles) for exactly this case, and an `acknowledgeRoleMismatch` flag the client sets only after the user confirms. It waives the Live role check and nothing else — Draft and Beta apps still admit only their builders and invited testers, an anonymous caller is still turned away, and the mini app's own auth guard is untouched.
