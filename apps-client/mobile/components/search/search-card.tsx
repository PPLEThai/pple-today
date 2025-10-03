import React from 'react'
import { PressableProps } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { cn } from '@pple-today/ui/lib/utils'
import { ExternalPathString, Link } from 'expo-router'

interface SearchCardProps extends PressableProps {
  href: string
  children: React.ReactNode
}

export function SearchCard({ children, ...props }: SearchCardProps) {
  return (
    <Link href={props.href as ExternalPathString} asChild>
      <AnimatedBackgroundPressable
        {...props}
        className={cn('flex flex-col items-center relative', props.className)}
      >
        {children}
      </AnimatedBackgroundPressable>
    </Link>
  )
}
