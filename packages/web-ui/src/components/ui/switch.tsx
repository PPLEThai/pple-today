import * as React from 'react'

import * as SwitchPrimitive from '@radix-ui/react-switch'
import { LoaderCircle } from 'lucide-react'

import { cn } from '../../libs/utils'

function Switch({
  className,
  isPending,
  ...props
}: { isPending?: boolean } & React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const SwitchBase = (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.5rem] w-11 shrink-0 items-center rounded-full border border-transparent shadow-sm transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      aria-busy={isPending ?? props['aria-busy']}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-5 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-0px)] data-[state=unchecked]:translate-x-0.5'
        )}
      />
    </SwitchPrimitive.Root>
  )

  return isPending ? (
    <div className="relative flex">
      {SwitchBase}
      <div className="absolute left-[52px] top-1/2 -translate-y-1/2">
        <LoaderCircle className="animate-spin size-5 stroke-base-secondary-light" />
      </div>
    </div>
  ) : (
    SwitchBase
  )
}

export { Switch }
