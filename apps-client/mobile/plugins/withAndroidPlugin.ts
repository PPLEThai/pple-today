import { ConfigPlugin, withAndroidManifest } from 'expo/config-plugins'

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
      application['meta-data'] = application['meta-data'] ?? []
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_channel_id',
          'android:value': 'pple-today-default',
        },
      })
    }

    return config
  })
}

export default withAndroidPlugin
