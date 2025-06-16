import { default as config } from '@pple-today/project-config/eslint/expo.js'

export default [
  ...config,
  {
    rules: {
      '@typescript-eslint/no-require-imports': ['error', { allow: ['./assets/*'] }],
    },
  },
]
