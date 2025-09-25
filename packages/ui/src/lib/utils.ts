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
      'text-color': [
        'text-foreground',
        'text-muted-foreground',
        'text-popover-foreground',
        'text-base-primary-default',
        'text-base-text-high',
        'text-base-text-medium',
        'text-base-text-placeholder',
        'text-base-text-invert',
      ],
    },
  },
})
