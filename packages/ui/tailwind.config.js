import nativewindPreset from 'nativewind/preset'
import { hairlineWidth, platformSelect } from 'nativewind/theme'
import plugin from 'tailwindcss/plugin'
import tailwindcssAnimation from 'tailwindcss-animate'
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: {
        'base-bg-white': 'rgb(var(--base-bg-white))',
        'base-bg-light': 'rgb(var(--base-bg-light))',
        'base-bg-default': 'rgb(var(--base-bg-default))',
        'base-bg-medium': 'rgb(var(--base-bg-medium))',
        'base-bg-dark': 'rgb(var(--base-bg-dark))',
        'base-bg-invert': 'rgb(var(--base-bg-invert))',
        'base-text-high': 'rgb(var(--base-text-high))',
        'base-text-medium': 'rgb(var(--base-text-medium))',
        'base-text-placeholder': 'rgb(var(--base-text-placeholder))',
        'base-text-invert': 'rgb(var(--base-text-invert))',
        'base-primary-extra-light': 'rgb(var(--base-primary-extra-light))',
        'base-primary-light': 'rgb(var(--base-primary-light))',
        'base-primary-default': 'rgb(var(--base-primary-default))',
        'base-primary-medium': 'rgb(var(--base-primary-medium))',
        'base-primary-dark': 'rgb(var(--base-primary-dark))',
        'base-secondary-extra-light': 'rgb(var(--base-secondary-extra-light))',
        'base-secondary-light': 'rgb(var(--base-secondary-light))',
        'base-secondary-default': 'rgb(var(--base-secondary-default))',
        'base-secondary-medium': 'rgb(var(--base-secondary-medium))',
        'base-secondary-dark': 'rgb(var(--base-secondary-dark))',
        'base-outline-default': 'rgb(var(--base-outline-default))',
        'base-outline-medium': 'rgb(var(--base-outline-medium))',
        'base-outline-dark': 'rgb(var(--base-outline-dark))',

        'system-info-default': 'rgb(var(--system-info-default))',
        'system-info-extra-light': 'rgb(var(--system-info-extra-light))',
        'system-info-light': 'rgb(var(--system-info-light))',
        'system-info-medium': 'rgb(var(--system-info-medium))',
        'system-info-dark': 'rgb(var(--system-info-dark))',
        'system-success-default': 'rgb(var(--system-success-default))',
        'system-success-extra-light': 'rgb(var(--system-success-extra-light))',
        'system-success-light': 'rgb(var(--system-success-light))',
        'system-success-medium': 'rgb(var(--system-success-medium))',
        'system-success-dark': 'rgb(var(--system-success-dark))',
        'system-danger-default': 'rgb(var(--system-danger-default))',
        'system-danger-extra-light': 'rgb(var(--system-danger-extra-light))',
        'system-danger-light': 'rgb(var(--system-danger-light))',
        'system-danger-medium': 'rgb(var(--system-danger-medium))',
        'system-danger-dark': 'rgb(var(--system-danger-dark))',
        'system-warning-default': 'rgb(var(--system-warning-default))',
        'system-warning-extra-light': 'rgb(var(--system-warning-extra-light))',
        'system-warning-light': 'rgb(var(--system-warning-light))',
        'system-warning-medium': 'rgb(var(--system-warning-medium))',
        'system-warning-dark': 'rgb(var(--system-warning-dark))',

        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        primary: {
          50: 'rgb(var(--color-primary-50))',
          100: 'rgb(var(--color-primary-100))',
          200: 'rgb(var(--color-primary-200))',
          300: 'rgb(var(--color-primary-300))',
          400: 'rgb(var(--color-primary-400))',
          500: 'rgb(var(--color-primary-500))',
          600: 'rgb(var(--color-primary-600))',
          700: 'rgb(var(--color-primary-700))',
          800: 'rgb(var(--color-primary-800))',
          900: 'rgb(var(--color-primary-900))',
          950: 'rgb(var(--color-primary-950))',
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--primary-foreground))',
        },
        secondary: {
          50: 'rgb(var(--color-secondary-50))',
          100: 'rgb(var(--color-secondary-100))',
          200: 'rgb(var(--color-secondary-200))',
          300: 'rgb(var(--color-secondary-300))',
          400: 'rgb(var(--color-secondary-400))',
          500: 'rgb(var(--color-secondary-500))',
          600: 'rgb(var(--color-secondary-600))',
          700: 'rgb(var(--color-secondary-700))',
          800: 'rgb(var(--color-secondary-800))',
          900: 'rgb(var(--color-secondary-900))',
          950: 'rgb(var(--color-secondary-950))',
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: 'rgb(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover))',
          foreground: 'rgb(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'rgb(var(--card))',
          foreground: 'rgb(var(--card-foreground))',
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      fontSize: {
        // height must be atleast 1.5 times font size otherwise thai font will be cut off
        // https://github.com/facebook/react-native/issues/29507#issuecomment-665147452
        // workaround for this make padding/margin top cannot be applied to text
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
          { lineHeight: '1.5rem', marginTop: '0', paddingTop: '0' }, // 24px
        ],
        lg: [
          '1.125rem', // 18px
          { lineHeight: '1.75rem', marginTop: '0', paddingTop: '0' }, // 28px
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
        'body-regular': platformSelect({
          android: 'NotoSansThaiLooped_400Regular',
          ios: 'NotoSansThaiLooped-Regular',
          default: ['NotoSansThaiLooped-Regular', 'sans-serif'],
        }),
        'body-semibold': platformSelect({
          android: 'NotoSansThaiLooped_600SemiBold',
          ios: 'NotoSansThaiLooped-SemiBold',
          default: ['NotoSansThaiLooped-SemiBold', 'sans-serif'],
        }),
        'body-bold': platformSelect({
          android: 'NotoSansThaiLooped_700Bold',
          ios: 'NotoSansThaiLooped-Bold',
          default: ['NotoSansThaiLooped-Bold', 'sans-serif'],
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
          text: (value, { modifier }) => {
            let [fontSize, options] = Array.isArray(value) ? value : [value]

            if (modifier) {
              return {
                'font-size': fontSize,
                'line-height': modifier,
              }
            }

            let { lineHeight, letterSpacing, fontWeight, marginTop, paddingTop } = isPlainObject(
              options
            )
              ? options
              : { lineHeight: options }

            return {
              'font-size': fontSize,
              ...(lineHeight === undefined ? {} : { 'line-height': lineHeight }),
              ...(letterSpacing === undefined ? {} : { 'letter-spacing': letterSpacing }),
              ...(fontWeight === undefined ? {} : { 'font-weight': fontWeight }),
              ...(marginTop === undefined ? {} : { 'margin-top': marginTop }),
              ...(paddingTop === undefined ? {} : { 'padding-top': paddingTop }),
            }
          },
        },
        {
          values: theme('fontSize'),
          modifiers: theme('lineHeight'),
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
// function isPlainObject<T>(value: T): value is T & Record<keyof T, unknown> {
//   if (Object.prototype.toString.call(value) !== '[object Object]') {
//     return false
//   }

//   const prototype = Object.getPrototypeOf(value)
//   return prototype === null || Object.getPrototypeOf(prototype) === null
// }
