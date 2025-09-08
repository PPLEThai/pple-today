import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: 2001,
    allowedHosts: ['testminiapp.miello.dev'],
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
})
