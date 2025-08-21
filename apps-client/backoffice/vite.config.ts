import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from 'tailwindcss'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import packageJson from './package.json'

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  define: {
    __APP_NAME__: JSON.stringify(packageJson.name),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  server: process.env.VITE_WEB_DOMAIN
    ? {
        allowedHosts: [process.env.VITE_WEB_DOMAIN],
      }
    : undefined,
  plugins: [reactRouter(), tsconfigPaths()],
})
