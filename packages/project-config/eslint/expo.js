// @ts-check

// plugins
import eslintExpoConfig from 'eslint-config-expo/flat/default.js'
import tseslint from 'typescript-eslint'

import react from './react.js'

const expoConfig = eslintExpoConfig.filter(
  (config) => !(config?.plugins && 'react' in config.plugins)
)

const config = tseslint.config(...react, ...expoConfig)

export default config
