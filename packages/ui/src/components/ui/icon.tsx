import * as React from 'react'
import { Text as RNText } from 'react-native'

import * as Slot from '@rn-primitives/slot'
import type { LucideIcon, LucideProps } from 'lucide-react-native'
import { twMerge } from 'tailwind-merge'

import { iconWithClassName } from '../../lib/icons/iconWithClassName'

const IconClassContext = React.createContext<string | undefined>(undefined)

function Icon({
  className,
  size = 16,
  strokeWidth = 2,
  ...props
}: React.ComponentProps<typeof RNText> & {
  ref?: React.RefObject<RNText>
  icon: LucideIcon
} & LucideProps) {
  const iconClass = React.useContext(IconClassContext)
  iconWithClassName(props.icon)
  return (
    <Slot.Text
      className={twMerge('text-foreground web:pointer-events-none', iconClass, className)}
      pointerEvents="none"
      {...props}
    >
      {React.createElement(props.icon, { size, strokeWidth })}
    </Slot.Text>
  )
}

export { Icon, IconClassContext }
