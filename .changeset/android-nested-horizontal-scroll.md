---
'@client/mobile': patch
---

On Android, horizontal lists inside a feed (such as แนะนำให้ติดตาม and the topic and banner slides) scroll again instead of swiping to the next feed tab. Upgrades react-native-pager-view from 9.0.7 to 9.0.11, which adds nested horizontal ScrollView support to its Android pager.
