---
'@client/mobile': patch
---

Fix the Android release build failing at `:app:processReleaseMainManifest`. `@react-native-firebase/messaging` declares the `com.google.firebase.messaging.default_notification_channel_id` meta-data with an empty value, which conflicted with the app's own `pple-today-default` value and made the manifest merger abort. The Android config plugin now sets `tools:replace="android:value"` (and ensures the `tools` namespace is present) so the app's value wins, and injects the meta-data idempotently so re-prebuilds can't duplicate it.
