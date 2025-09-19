import { ConfigPlugin } from 'expo/config-plugins'

const withIosPlugin: ConfigPlugin = (config) => {
  // Add any iOS-specific modifications here
  return config
}

export default withIosPlugin
