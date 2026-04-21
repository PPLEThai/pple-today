import { ConfigPlugin, withPodfile } from 'expo/config-plugins'
const withIosPlugin: ConfigPlugin = (config) => {
  return withPodfile(config, (config) => {
    // Add pod 'GoogleUtilities' to target 'PPLEToday' in Podfile
    config.modResults.contents = config.modResults.contents.replaceAll(
      'use_expo_modules!',
      `use_expo_modules!

  pod 'GoogleUtilities'`
    )

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
