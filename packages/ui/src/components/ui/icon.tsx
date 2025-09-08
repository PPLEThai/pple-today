import * as React from 'react'

import type { LucideIcon, LucideProps } from 'lucide-react-native'
import { cssInterop } from 'nativewind'

import { cn } from '../../lib/utils'

const IconClassContext = React.createContext<string | undefined>(undefined)

function Icon({ icon: IconComponent, className, size = 16, strokeWidth = 2, ...props }: IconProps) {
  const iconClass = React.useContext(IconClassContext)
  return (
    <IconImpl
      icon={IconComponent}
      className={cn('text-foreground web:pointer-events-none', iconClass, className)}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  )
}

interface IconProps extends LucideProps {
  icon: LucideIcon
}

function IconImpl({ icon: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
    },
  },
})

export { Icon, IconClassContext }
