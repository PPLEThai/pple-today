import * as React from 'react'
import { Text as RNText } from 'react-native'

import * as Slot from '@rn-primitives/slot'
import type { LucideIcon } from 'lucide-react-native'
import { twMerge } from 'tailwind-merge'

import { iconWithClassName } from '../../lib/icons/iconWithClassName'

const IconClassContext = React.createContext<string | undefined>(undefined)

function Icon({
  className,
  size = 16,
  ...props
}: React.ComponentProps<typeof RNText> & {
  ref?: React.RefObject<RNText>
  icon: LucideIcon
  size?: number
}) {
  const iconClass = React.useContext(IconClassContext)
  iconWithClassName(props.icon)
  return (
    <Slot.Text
      className={twMerge('text-foreground web:select-text', iconClass, className)}
      {...props}
    >
      {React.createElement(props.icon, { size })}
    </Slot.Text>
  )
}

export { Icon, IconClassContext }
