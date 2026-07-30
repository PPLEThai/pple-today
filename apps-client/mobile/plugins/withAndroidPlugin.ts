import { AndroidConfig, ConfigPlugin, withAndroidManifest } from 'expo/config-plugins'

const withAndroidPlugin: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    config.modResults.manifest.queries.push({
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.SENDTO' } }],
          data: [{ $: { 'android:scheme': 'mailto' } }],
        },
        {
          action: [{ $: { 'android:name': 'android.intent.action.DIAL' } }],
        },
      ],
    })
    config.modResults.manifest.application?.[0].activity?.[0]['intent-filter']?.push({
      action: [{ $: { 'android:name': '.MainActivity' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
    })

    // Send the notifications Play services displays itself to the same channel the
    // client-built ones use, so a user finds one switch in system settings rather
    // than two for what is, to them, one kind of notification. Without this, FCM
    // uses a channel of its own ("Miscellaneous") that the app cannot address.
    // See DEFAULT_NOTIFICATION_CHANNEL_ID in libs/notification-display.ts.
    const application = config.modResults.manifest.application?.[0]
    if (application) {
      const metaDataName = 'com.google.firebase.messaging.default_notification_channel_id'
      const metaData = (application['meta-data'] = application['meta-data'] ?? [])
      const existing = metaData.find((entry) => entry.$['android:name'] === metaDataName)
      // react-native-firebase/messaging declares this same meta-data with an empty
      // value, so the manifest merger refuses to pick one. tools:replace tells it to
      // take ours; without it the release build fails at :app:processReleaseMainManifest.
      // 'tools:replace' is a valid manifest-merger attribute but isn't in Expo's
      // ManifestMetaData attribute type, so widen it here.
      const attributes = {
        'android:name': metaDataName,
        'android:value': 'pple-today-default',
        'tools:replace': 'android:value',
      } as (typeof metaData)[number]['$']
      if (existing) {
        existing.$ = attributes
      } else {
        metaData.push({ $: attributes })
      }
      // tools:replace needs the tools namespace declared on <manifest>.
      AndroidConfig.Manifest.ensureToolsAvailable(config.modResults)
    }

    return config
  })
}

export default withAndroidPlugin
