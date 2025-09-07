import * as React from 'react'

import { cn } from '@/libs/utils'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'group flex items-center font-sans justify-center rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap text-base font-medium text-foreground disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-primary hover:opacity-90 active:opacity-90 text-primary-foreground',
        destructive:
          'bg-destructive hover:opacity-90 active:opacity-90 text-destructive-foreground',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent text-secondary-foreground group-active:text-secondary-foreground',
        secondary:
          'bg-secondary hover:opacity-80 active:opacity-80 text-secondary-foreground group-active:text-secondary-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground',
        link: 'underline-offset-4 hover:underline focus:underline text-primary group-active:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-sm',
        lg: 'h-11 rounded-md px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
