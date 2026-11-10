import { ConfigPlugin, withInfoPlist, withPodfile, withXcodeProject } from 'expo/config-plugins'

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
 * Live Activity. The `_shared` Swift in `targets/live-activity` is also
 * compiled into the app, whose deployment target is 15.1. ActivityKit (16.1)
 * and AppIntents (16.0) must be weak-linked or the app fails to launch on 15.
 * Also declares Live Activity support.
 */
const withLiveActivitySupport: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true
    return config
  })
  return withXcodeProject(config, (config) => {
    const project = config.modResults
    const configurations = project.pbxXCBuildConfigurationSection()
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings
      // The main app target only: its configurations carry the app's Info.plist.
      if (
        !buildSettings ||
        !String(buildSettings.INFOPLIST_FILE ?? '').includes('PPLEToday/Info.plist')
      ) {
        continue
      }
      const existing = buildSettings.OTHER_LDFLAGS
      const flags: string[] = Array.isArray(existing)
        ? existing
        : existing
          ? [existing]
          : ['"$(inherited)"']
      for (const flag of ['"-weak_framework"', 'ActivityKit', '"-weak_framework"', 'AppIntents']) {
        flags.push(flag)
      }
      buildSettings.OTHER_LDFLAGS = flags
    }
    return config
  })
}

const withIosPlugin: ConfigPlugin = (config) => {
  config = withBackendBaseUrl(config)
  config = withLiveActivitySupport(config)
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
