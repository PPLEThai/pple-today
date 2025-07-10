import baseConfig from '@pple-today/project-config/eslint/react.js'

export default [
  ...baseConfig,
  {
    ignores: ['node_modules', 'build', '.react-router', 'eslint.config.js'],
  },
]
