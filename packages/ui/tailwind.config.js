import baseTailwindConfig from '@pple-today/tailwind-config/tailwind.config.js'
import nativewindPreset from 'nativewind/preset'
import { hairlineWidth, platformSelect } from 'nativewind/theme'
import tailwindcssAnimation from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  ...baseTailwindConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [nativewindPreset],
  theme: {
    extend: {
      ...baseTailwindConfig.theme.extend,
      borderWidth: {
        hairline: hairlineWidth(),
      },
      fontFamily: {
        'inter-light': platformSelect({
          android: 'Inter_300Light',
          ios: 'Inter-Light',
          default: ['Inter-Light', 'sans-serif'],
        }),
        'inter-medium': platformSelect({
          android: 'Inter_500Medium',
          ios: 'Inter-Medium',
          default: ['Inter-Medium', 'sans-serif'],
        }),
        'inter-bold': platformSelect({
          android: 'Inter_700Bold',
          ios: 'Inter-Bold',
          default: ['Inter-Bold', 'sans-serif'],
        }),
        'anakotmai-light': platformSelect({
          android: 'Anakotmai_300Light',
          ios: 'Anakotmai-Light',
          default: ['Anakotmai-Light', 'sans-serif'],
        }),
        'anakotmai-medium': platformSelect({
          android: 'Anakotmai_500Medium',
          ios: 'Anakotmai-Medium',
          default: ['Anakotmai-Medium', 'sans-serif'],
        }),
        'anakotmai-bold': platformSelect({
          android: 'Anakotmai_700Bold',
          ios: 'Anakotmai-Bold',
          default: ['Anakotmai-Bold', 'sans-serif'],
        }),
        'noto-light': platformSelect({
          android: 'NotoSansThaiLooped_300Light',
          ios: 'NotoSansThaiLooped-Light',
          default: ['NotoSansThaiLooped-Light', 'sans-serif'],
        }),
        'noto-medium': platformSelect({
          android: 'NotoSansThaiLooped_500Medium',
          ios: 'NotoSansThaiLooped-Medium',
          default: ['NotoSansThaiLooped-Medium', 'sans-serif'],
        }),
        'noto-bold': platformSelect({
          android: 'NotoSansThaiLooped_700Bold',
          ios: 'NotoSansThaiLooped-Bold',
          default: ['NotoSansThaiLooped-Bold', 'sans-serif'],
        }),
      },
    },
  },
  plugins: [tailwindcssAnimation],
}
