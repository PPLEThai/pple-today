import { View, ViewProps } from 'react-native'

import * as Slot from '@rn-primitives/slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { TextClassContext } from './text'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'web:inline-flex items-center rounded-full border border-border px-3 py-0.5 web:transition-colors web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-base-primary-default web:hover:opacity-80 active:bg-base-primary-medium',
        secondary: 'border-transparent bg-secondary web:hover:opacity-80 active:opacity-80',
        destructive: 'border-transparent bg-destructive web:hover:opacity-80 active:opacity-80',
        outline: 'text-foreground web:hover:bg-base-bg-default active:bg-base-bg-default/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const badgeTextVariants = cva('text-xs font-anakotmai-medium ', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

type BadgeProps = ViewProps & {
  asChild?: boolean
} & VariantProps<typeof badgeVariants>

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot.View : View
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  )
}

export { Badge, badgeTextVariants, badgeVariants }
export type { BadgeProps }
