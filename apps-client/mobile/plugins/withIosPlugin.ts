import { ConfigPlugin, withInfoPlist, withPodfile } from 'expo/config-plugins'

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

const withIosPlugin: ConfigPlugin = (config) => {
  config = withBackendBaseUrl(config)
  return withPodfile(config, (config) => {
    config.modResults.contents += `
target 'NotificationServiceExtension' do
  use_frameworks! :linkage => :static
  pod 'Firebase/Messaging'
  pod 'GoogleUtilities'
end
`
    return config
  })
}

export default withIosPlugin
