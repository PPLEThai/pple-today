---
'@api/backoffice': minor
'@client/backoffice': minor
'@client/mobile': minor
---

The แอปฯ tab is tidier. Apps that aren't published yet move out of the main grid into two collapsed sections, "แอปทดลองใช้" and "แอปฉบับร่าง". Apps without an icon show a coloured letter, so they no longer look the same. When a role has more than 8 apps, the tab adds search and a "ใช้ล่าสุด" row. The mini-app list API returns each app's `tagline` and, for Draft and Beta apps, the caller's `relation` (`BUILDER` or `TESTER`). The admin portal asks for a short description of each app, and an app's first promotion to Live is recorded for the upcoming "new apps" section. Run the database migration before deploying the API.
