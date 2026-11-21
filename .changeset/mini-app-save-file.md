---
'@client/mobile': minor
---

On iPhone, a mini app's download link now saves the file instead of opening it. An image, such as a payment QR from the party's Checkout Page, goes to Photos after a one-time permission prompt (บันทึกรูปลงอัลบั้มแล้ว), and a PDF opens the share sheet. Before, the WebView showed the file and there was no way to save it. Adds the add-only Photos permission (`NSPhotoLibraryAddUsageDescription`), so it needs a new store build. Android keeps its WebView's own download.
