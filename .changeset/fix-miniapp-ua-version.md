---
'@pplethai/pple-today-miniapp-sdk': patch
---

Fix `isMiniApp()` failing to detect PPLE Today 2.10.0 and later: the User-Agent check only matched single-digit version parts, so the SDK ignored the launch token and fell back to a stale browser session.
