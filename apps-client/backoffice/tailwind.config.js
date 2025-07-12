import tailwindConfig from '@pple-today/ui/tailwind.config.js'

/** @type {import('tailwindcss').Config} */
export default {
  ...tailwindConfig,
  theme: {
    ...tailwindConfig.theme,
    extend: {
      ...tailwindConfig.theme.extend,
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
      },
    },
  },
}
