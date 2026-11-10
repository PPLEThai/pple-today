import { ConfigPlugin, withInfoPlist } from 'expo/config-plugins'

/**
 * The API base URL, written to Info.plist as `PPLEBackendBaseURL`.
 *
 * `modules/notification-actions` answers an interactive notification natively,
 * with no JS runtime, so it cannot read `EXPO_PUBLIC_BACKEND_BASE_URL` from the
 * bundle the way `libs/api-client.ts` does. It reads this instead.
 */
const withBackendBaseUrl: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL
    if (baseUrl) {
      config.modResults.PPLEBackendBaseURL = baseUrl
    } else {
      // Without it a tray answer on iOS reports "ส่งคำตอบไม่สำเร็จ" instead of
      // being sent; everything else still works.
      console.warn(
        '[withIosPlugin] EXPO_PUBLIC_BACKEND_BASE_URL is not set; iOS tray answers will not be sent.'
      )
    }
    return config
  })
}

/**
 * Live Activity: declares support in Info.plist. ActivityKit and AppIntents need
 * no weak-linking now that the deployment target (16.4) is above both.
 */
const withLiveActivitySupport: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true
    return config
  })
}

const withIosPlugin: ConfigPlugin = (config) => {
  config = withBackendBaseUrl(config)
  return withLiveActivitySupport(config)
}

export default withIosPlugin
