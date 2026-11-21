---
'@client/mobile': minor
---

On iPhone, a mini app's download link now opens the share sheet with the file instead of only showing it. For example, บันทึก QR ลงเครื่อง on the party's Checkout Page gives a payment QR the user can Save Image to Photos, save to Files, or send in LINE. Before, the WebView showed the file and there was no way to save it. Adds `expo-sharing` and the Photos add permission text the share sheet's Save Image needs (`NSPhotoLibraryAddUsageDescription`), so it needs a new store build. Android keeps its WebView's own download.
