import * as React from 'react'

import * as TogglePrimitive from '@rn-primitives/toggle'
import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react-native'

import { TextClassContext } from './text'

import { cn } from '../../lib/utils'

const toggleVariants = cva(
  'web:group web:inline-flex items-center justify-center rounded-full web:ring-offset-background web:transition-colors web:hover:bg-muted active:bg-muted web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent web:hover:bg-accent active:bg-accent',
      },
      size: {
        lg: 'h-10 px-4 py-2',
        md: 'h-9 px-2.5 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'lg',
    },
  }
)

const toggleTextVariants = cva('text-sm native:text-base text-foreground font-heading-semibold', {
  variants: {
    variant: {
      default: '',
      outline: 'web:group-hover:text-accent-foreground web:group-active:text-accent-foreground',
    },
    size: {
      md: '',
      lg: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'lg',
  },
})

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.RootProps &
  VariantProps<typeof toggleVariants> &
  VariantProps<typeof toggleVariants> & {
    ref?: React.RefObject<TogglePrimitive.RootRef>
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        toggleTextVariants({ variant, size }),
        props.pressed ? 'text-accent-foreground' : 'web:group-hover:text-muted-foreground',
        className
      )}
    >
      <TogglePrimitive.Root
        className={cn(
          toggleVariants({ variant, size }),
          props.disabled && 'web:pointer-events-none opacity-50',
          props.pressed &&
            'bg-base-primary-default active:bg-base-primary-medium web:hover:bg-base-primary-medium',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function ToggleIcon({
  className,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<LucideIcon> & {
  icon: LucideIcon
}) {
  const textClass = React.useContext(TextClassContext)
  return <Icon className={cn(textClass, className)} {...props} />
}

export { Toggle, ToggleIcon, toggleTextVariants, toggleVariants }
