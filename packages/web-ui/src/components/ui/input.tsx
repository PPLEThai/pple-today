import * as React from 'react'

import { cn } from '../../libs/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full font-sans font-light rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'aria-[invalid=true]:border-red-500 aria-[invalid=true]:text-red-500',
        className
      )}
      {...props}
    />
  )
}

export { Input }
