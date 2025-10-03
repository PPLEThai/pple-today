import * as React from 'react'
import { Pressable } from 'react-native'

import { cva, type VariantProps } from 'class-variance-authority'

import { IconClassContext } from './icon'
import { TextClassContext } from './text'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'group flex flex-row items-center justify-center web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-base-primary-default web:hover:opacity-90 active:bg-base-primary-medium',
        secondary: 'bg-base-bg-default web:hover:opacity-80 active:bg-base-bg-medium',
        outline:
          'border border-base-outline-dark bg-background web:hover:bg-accent web:hover:text-accent-foreground active:bg-base-bg-default',
        'outline-primary':
          'border border-base-primary-default web:hover:bg-accent web:hover:text-accent-foreground active:bg-base-primary-light/10',
        ghost: 'web:hover:bg-accent web:hover:text-accent-foreground active:bg-base-bg-default',
        destructive: 'bg-destructive web:hover:opacity-90 active:opacity-90',
        link: 'web:underline-offset-4 web:hover:underline web:focus:underline',
      },
      size: {
        md: 'h-10 px-3 py-2 rounded-lg gap-1',
        sm: 'h-9 rounded-lg px-2 py-2',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

const buttonTextVariants = cva(
  'web:whitespace-nowrap text-base font-heading-semibold text-foreground web:transition-colors web:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'text-base-text-invert',
        secondary: 'text-secondary-foreground group-active:text-secondary-foreground',
        outline: 'group-active:text-accent-foreground',
        'outline-primary': 'text-base-primary-default group-active:text-base-primary-medium',
        ghost: 'text-base-primary-default',
        destructive: 'text-destructive-foreground',
        link: 'text-primary group-active:underline',
      },
      size: {
        md: 'px-1',
        sm: 'px-1 text-sm',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>

function Button({ ref, className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <IconClassContext.Provider value={buttonTextVariants({ variant, size })}>
        <Pressable
          className={cn(
            props.disabled && 'opacity-50 web:pointer-events-none',
            buttonVariants({ variant, size, className })
          )}
          ref={ref}
          role="button"
          {...props}
        />
      </IconClassContext.Provider>
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
