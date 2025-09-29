import * as React from 'react'

import * as LabelPrimitive from '@rn-primitives/label'

import { cn } from '../../lib/utils'

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  ...props
}: LabelPrimitive.TextProps & {
  ref?: React.RefObject<LabelPrimitive.TextRef>
}) {
  return (
    <LabelPrimitive.Root
      className="web:cursor-default"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        className={cn(
          'text-sm text-foreground native:text-base font-heading-semibold web:peer-disabled:cursor-not-allowed web:peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  )
}

export { Label }
