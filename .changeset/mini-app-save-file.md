---
'@client/mobile': minor
'@pplethai/pple-today-miniapp-sdk': minor
---

Mini apps can now save files to the phone from inside PPLE Today.

- **Download links (iPhone).** A mini app's download link now opens the share sheet with the file instead of only showing it. For example, บันทึก QR ลงเครื่อง on the party's Checkout Page gives a payment QR the user can Save Image to Photos, save to Files, or send in LINE. Before, the WebView showed the file and there was no way to save it. Android keeps its WebView's own download.
- **`saveFile()` in the SDK (both platforms).** `saveFile(blobOrUrl, { fileName })` hands a file the app made or fetched to PPLE Today's share sheet and resolves once it closes. It covers what a download link cannot: files built in code, files on another origin, and downloads started after an async step. In a browser it uses the phone's share sheet, or downloads on a computer; on an older PPLE Today it falls back the same way.

Adds `expo-sharing`, `expo-file-system` and the Photos add permission text the share sheet's Save Image needs (`NSPhotoLibraryAddUsageDescription`), so it needs a new store build.
