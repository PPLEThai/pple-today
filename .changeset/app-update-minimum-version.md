---
'@client/mobile': patch
---

Separate mandatory and optional app updates: `CHECK_APP_UPDATE` now accepts an optional per-platform `minimumVersion` (below it the update is mandatory), while `version` is the latest version offered as an optional update. `isForceUpdate` is still honoured for older builds.
