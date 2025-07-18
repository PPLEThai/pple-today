import * as React from 'react'
import { Text as RNText } from 'react-native'

import * as Slot from '@rn-primitives/slot'
import { twMerge } from 'tailwind-merge'

const TextClassContext = React.createContext<string | undefined>(undefined)

function Text({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<typeof RNText> & {
  ref?: React.RefObject<RNText>
  asChild?: boolean
}) {
  const textClass = React.useContext(TextClassContext)
  const Component = asChild ? Slot.Text : RNText
  return (
    <Component
      className={twMerge(
        'text-base text-foreground web:select-text font-noto-medium',
        textClass,
        className
      )}
      {...props}
    />
  )
}

export { Text, TextClassContext }
