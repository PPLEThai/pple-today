---
'@client/mobile': patch
---

On Android, a mini app's `<input type="file" capture>` now asks for camera access the first time instead of doing nothing: granting it opens the camera, denying it opens the file chooser. The page's other file inputs keep working after either answer. Upgrades `react-native-webview` from 13.15.0 to 16.0.2, which carries the fix (react-native-webview#4064).
