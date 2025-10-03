import React from 'react'
import { PressableProps } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { cn } from '@pple-today/ui/lib/utils'
interface SearchCardProps extends PressableProps {
  children: React.ReactNode
}

export function SearchCard({ children, ...props }: SearchCardProps) {
  return (
    <AnimatedBackgroundPressable
      {...props}
      className={cn('flex flex-col items-center relative', props.className)}
    >
      {children}
    </AnimatedBackgroundPressable>
  )
}
