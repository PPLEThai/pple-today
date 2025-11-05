import { ConfigPlugin, withPodfile } from 'expo/config-plugins'
const withIosPlugin: ConfigPlugin = (config) => {
  return withPodfile(config, (config) => {
    config.modResults.contents += `
target 'NotificationServiceExtension' do
  use_frameworks! :linkage => :static
  pod 'Firebase/Messaging'
end
`
    return config
  })
}

export default withIosPlugin
