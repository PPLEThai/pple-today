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

    return config
  })
}

export default withAndroidPlugin
