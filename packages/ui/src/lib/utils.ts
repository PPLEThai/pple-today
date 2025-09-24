export { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

export const cn = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-family': [
        'font-body-light',
        'font-body-medium',
        'font-body-bold',
        'font-heading-regular',
        'font-heading-semibold',
        'font-heading-bold',
      ],
    },
  },
})
