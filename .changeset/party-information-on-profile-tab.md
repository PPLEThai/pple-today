---
'@client/mobile': patch
---

Move "ข้อมูลพรรคประชาชน" from the กิจกรรม tab to the ฉัน tab, where it now sits directly above ตั้งค่า. The four cards — บุคลากรของพรรค, เกี่ยวกับพรรคประชาชน, ช่องทางการติดต่อ, เว็บไซต์ทางการ — are unchanged, along with the contact bottom sheet behind the third of them; only their home moved. กิจกรรม was the tab a reader reached for upcoming events and polls, so a block of static party links sat at the bottom of a feed nobody scrolls to the end of, while ฉัน was already the tab for the standing, non-feed things: what you follow, what you have taken part in, and the app's own settings. The section is extracted out of the route file into `components/party-information.tsx` as `PartyInformationSection` so it is no longer tied to the screen that happens to render it. Note that it now shows only to a signed-in reader, since the ฉัน tab renders the login screen otherwise; on กิจกรรม it had been visible to everyone.
