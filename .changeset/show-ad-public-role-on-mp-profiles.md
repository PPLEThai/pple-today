---
'@pple-today/api-common': patch
'@api/backoffice': patch
'@client/mobile': patch
---

Show an MP's AD public role (e.g. สส. นนทบุรี เขต 1) on profiles and recommendation cards, synced from SSO introspect into `User.responsibleArea`. `/profile/recommend` omits onboarding address so shipped clients stop showing `สส. {province}` without an app release.
