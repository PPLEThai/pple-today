import { ConfigPlugin } from 'expo/config-plugins'

import withAndroidPlugin from './withAndroidPlugin'
import withIosPlugin from './withIosPlugin'

const withPlugin: ConfigPlugin = (config) => {
  // Apply Android modifications first
  config = withAndroidPlugin(config)
  // Then apply iOS modifications and return
  return withIosPlugin(config)
}

export default withPlugin
