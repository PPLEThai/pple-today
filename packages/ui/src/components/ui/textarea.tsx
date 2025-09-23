import * as React from 'react'
import { TextInput, type TextInputProps } from 'react-native'

import { SlotTextInput } from './slot-textinput'

import { cn } from '../../lib/utils'

function Textarea({
  className,
  multiline = true,
  numberOfLines = 4,
  placeholderClassName,
  asChild,
  ...props
}: TextInputProps & {
  ref?: React.RefObject<TextInput>
  'aria-invalid'?: boolean
  asChild?: boolean
}) {
  const Comp = asChild ? SlotTextInput : TextInput
  return (
    <Comp
      className={cn(
        'web:flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-heading-regular text-foreground web:ring-offset-background placeholder:text-muted-foreground web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
        props.editable === false && 'opacity-50 web:cursor-not-allowed',
        props['aria-invalid'] && 'border-destructive web:ring-destructive',
        className
      )}
      placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  )
}

export { Textarea }
