---
'@client/mobile': patch
---

Make the บทบาท choice in the mini-app role prompt tappable on iOS

- The prompt shown when a mini-app link falls outside your role offered the roles in a `Select`. A `Select` opens through the same portal host the dialog itself renders into, so on iOS its dropdown landed under the dialog layer and no tap could reach it — the choice was unusable on device.
- The roles are now radio rows inside the dialog: no nested portal, no measure-and-position step, and the whole row is the tap target rather than the dot alone. A long list scrolls instead of pushing ยกเลิก and เข้าใช้งาน off screen.
- The multi-role copy now reads บทบาทปัจจุบัน, naming the role that does not fit rather than the person's roles in general.
