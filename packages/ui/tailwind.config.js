import baseTailwindConfig from '@pple-today/tailwind-config/tailwind.config.js'
import nativewindPreset from 'nativewind/preset'
import { hairlineWidth, platformSelect } from 'nativewind/theme'
import plugin from 'tailwindcss/plugin'
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
      fontSize: {
        // height must be atleast 1.5 times font size otherwise thai font will be cut off
        // https://github.com/facebook/react-native/issues/29507#issuecomment-665147452
        // workaround for this is to add padding/margin top
        // but a catch is that we cant directly apply margin/padding top to Text component
        // default: https://github.com/tailwindlabs/tailwindcss/blob/ba55a445cd82eda384af91d8846c5fdb889fdfcd/stubs/config.full.js#L324
        xs: [
          '0.75rem', // 12px
          { lineHeight: '1rem', marginTop: '-0.125rem', paddingTop: '0.125rem' }, // 16, 18px
        ],
        sm: [
          '0.875rem', // 14px
          { lineHeight: '1.25rem', marginTop: '-0.125rem', paddingTop: '0.125rem' }, // 20, 22px
        ],
        base: [
          '1rem', // 16px
          { lineHeight: '1.5rem' }, // 24px
        ],
        lg: [
          '1.125rem', // 18px
          { lineHeight: '1.75rem' }, // 28px
        ],
        xl: [
          '1.25rem', // 20px
          { lineHeight: '1.75rem', marginTop: '-0.25rem', paddingTop: '0.25rem' }, // 28, 32px
        ],
        '2xl': [
          '1.5rem', // 24px
          { lineHeight: '2rem', marginTop: '-0.25rem', paddingTop: '0.25rem' }, // 32, 36px
        ],
        '3xl': [
          '1.875rem', // 30px
          { lineHeight: '2.25rem', marginTop: '-0.75rem', paddingTop: '0.75rem' }, // 36, 48px
        ],
        '4xl': [
          '2.25rem', // 36px
          { lineHeight: '2.5rem', marginTop: '-0.875rem', paddingTop: '0.875rem' }, // 40, 54px
        ],
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
        'heading-regular': platformSelect({
          android: 'NotoSansThai_400Regular',
          ios: 'NotoSansThai-Regular',
          default: ['NotoSansThai-Regular', 'sans-serif'],
        }),
        'heading-semibold': platformSelect({
          android: 'NotoSansThai_600SemiBold',
          ios: 'NotoSansThai-SemiBold',
          default: ['NotoSansThai-SemiBold', 'sans-serif'],
        }),
        'heading-bold': platformSelect({
          android: 'NotoSansThai_700Bold',
          ios: 'NotoSansThai-Bold',
          default: ['NotoSansThai-Bold', 'sans-serif'],
        }),
        'body-light': platformSelect({
          android: 'NotoSansThaiLooped_300Light',
          ios: 'NotoSansThaiLooped-Light',
          default: ['NotoSansThaiLooped-Light', 'sans-serif'],
        }),
        'body-medium': platformSelect({
          android: 'NotoSansThaiLooped_500Medium',
          ios: 'NotoSansThaiLooped-Medium',
          default: ['NotoSansThaiLooped-Medium', 'sans-serif'],
        }),
      },
    },
  },
  plugins: [
    tailwindcssAnimation,
    // https://github.com/tailwindlabs/tailwindcss/blob/ba55a445cd82eda384af91d8846c5fdb889fdfcd/src/corePlugins.js#L2105
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          text: (value) => {
            let [_fontSize, options] = Array.isArray(value) ? value : [value]
            let { marginTop, paddingTop } = isPlainObject(options) ? options : {}
            return {
              ...(marginTop === undefined ? {} : { 'margin-top': marginTop }),
              ...(paddingTop === undefined ? {} : { 'padding-top': paddingTop }),
            }
          },
        },
        {
          values: theme('fontSize'),
          type: ['absolute-size', 'relative-size', 'length', 'percentage'],
        }
      )
    }),
  ],
}
// https://github.com/tailwindlabs/tailwindcss/blob/c6e0a55d3681c854328b5b7e08324353ba5e0430/packages/tailwindcss/src/compat/config/deep-merge.ts#L1
function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === null || Object.getPrototypeOf(prototype) === null
}
