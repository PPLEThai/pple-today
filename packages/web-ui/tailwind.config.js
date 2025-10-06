import baseTailwindConfig from '@pple-today/tailwind-config/tailwind.config.js'
import tailwindcssAnimation from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  ...baseTailwindConfig,
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/web-ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      ...baseTailwindConfig.theme.extend,
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
    },
  },
  plugins: [tailwindcssAnimation],
}
