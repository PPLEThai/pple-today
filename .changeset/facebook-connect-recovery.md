---
'@client/mobile': patch
'@api/backoffice': patch
'@client/backoffice': patch
---

Connecting a Facebook page now explains itself, recovers from failures, and catches missing permissions before admin approval:

- Tapping เพิ่มเพจที่ดูแล first opens a dialog that explains the feature and what to pick in Facebook's dialog.
- If Facebook rejects the token, the app drops it and offers เชื่อมต่อใหม่. Network errors offer ลองใหม่ and keep the token.
- The page list has a ยกเลิกการเชื่อมต่อ button that, after a confirmation, revokes the app's Facebook permissions, so the user can start over with another account, other pages or other permissions.
- Linking a page now checks that the page token holds every required permission for that page, and that the user's role on the page can subscribe to it. Missing permissions lead to reconnecting; a role that is too low disables that page. Before, these gaps only showed up as errors when an admin approved the page.
- If approval still fails on Facebook permissions or an expired token, the backoffice now shows the admin an alert saying the page manager must remove and reconnect the page. Before, failed status changes showed nothing.
- A rejected or pending page can always be removed and connected again. Removing it, or rejecting it in the backoffice, no longer calls Facebook unless the page is subscribed, so a dead page token can't block either one.
- A rejected page on the profile now shows "สามารถลบเพจแล้วเชื่อมต่อใหม่ได้" under it.
