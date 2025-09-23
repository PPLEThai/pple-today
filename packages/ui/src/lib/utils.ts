export { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

export const cn = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-family': [
        'font-body-regular',
        'font-body-semibold',
        'font-body-bold',
        'font-heading-regular',
        'font-heading-semibold',
        'font-heading-bold',
      ],
    },
  },
})
