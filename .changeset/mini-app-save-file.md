---
'@client/mobile': minor
'@pplethai/pple-today-miniapp-sdk': minor
---

Mini apps can now save files to the phone from inside PPLE Today.

- **Download links.** A mini app's download link now opens the share sheet with the file instead of only showing it. For example, บันทึก QR ลงเครื่อง on the party's Checkout Page gives a payment QR the user can Save Image to Photos, save to Files, or send in LINE. Before, the WebView showed the file and there was no way to save it. On iPhone it takes same-origin, `blob:` and `data:` links; on Android only `blob:` and `data:` links, and the WebView's own download handles the rest.
- **`saveFile()` in the SDK (both platforms).** `saveFile(blobOrUrl, { fileName, mimeType? })` hands a file the app made or fetched to PPLE Today's share sheet and resolves `presented` once it closes. It covers what a download link cannot: files built in code, files on another origin, and downloads started after an async step. PPLE Today lists `saveFile` in `window.__ppleHost.capabilities`, and the SDK uses it only then; with no flag (a browser, an older PPLE Today) it uses the phone's share sheet, or downloads on a computer. Inside PPLE Today there is no fallback after a failure; `failed` carries a `reason`.
- **Where it works.** Only pages on `peoplesparty.or.th`, `pplethai.org` and `ppleth.ai` (and subdomains, over `https`) can save in PPLE Today, and only the main page, not an iframe.
- **Capabilities.** PPLE Today sets `window.__ppleHost = { version, capabilities }` before a page's scripts, listing what that page may use. On Android it can appear a little late, so the SDK reads it with `getHostCapabilities()` and `hasCapability(name, minVersion?)`.
- **Haptics.** `haptic('success')` (and the other styles) plays a haptic tap, for pages on the trusted domains. It does nothing in a browser.
- **Ready signal.** A page can keep PPLE Today's loading screen up until its first screen has rendered: add `<meta name="pple-today:ready" content="manual">` and call `ready()`. The host waits at most 8 s after load, so a page that never calls it is not stuck. The loading screen is now an overlay over the WebView, for the first load only (later routes never bring it back), and it also goes on a load error or crash. Holding it is best effort on Android.
- **Web features.** The WebView now enables camera and microphone for `getUserMedia` (asking each time on iPhone), inline video, and `navigator.geolocation` on Android. On Android the camera still needs the app's `CAMERA` permission, which this build does not declare.

Adds `expo-sharing`, `expo-file-system` and the Photos add permission text the share sheet's Save Image needs (`NSPhotoLibraryAddUsageDescription`), so it needs a new store build.
