import * as React from 'react'

import { cn } from '../../libs/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full font-sans font-light rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-red-500 aria-invalid:text-red-500 field-sizing-content',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
