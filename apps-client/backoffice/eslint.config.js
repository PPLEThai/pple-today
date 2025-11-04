import baseConfig from '@pple-today/project-config/eslint/react.js'
import pluginRouter from '@tanstack/eslint-plugin-router'

export default [
  ...baseConfig,
  ...pluginRouter.configs['flat/recommended'],
  {
    ignores: ['node_modules', 'build', 'routeTree.gen.ts', 'eslint.config.js'],
  },
]
