---
'@client/mobile': patch
---

Tapping เพิ่มเพจที่ดูแล no longer opens the Facebook login every time: if the app already holds a valid Facebook token with the page permissions, it goes straight to the page list.
