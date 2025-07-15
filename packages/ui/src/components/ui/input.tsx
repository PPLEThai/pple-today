import * as React from 'react'
import { TextInput, type TextInputProps, View } from 'react-native'

import { Icon } from './icon'

import { cn } from '../../lib/utils'

/**
 * TODO: use react-native-keyboard-controller
 * to handle for keyboard avoiding view
 * https://github.com/kirillzyusko/react-native-keyboard-controller
 */

function Input({
  className,
  placeholderClassName,
  ...props
}: TextInputProps & {
  ref?: React.RefObject<TextInput>
}) {
  const { hasLeftIcon, hasRightIcon } = useInputGroupContext()
  return (
    <TextInput
      className={cn(
        'relative z-0 web:flex h-10 web:w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground font-anakotmai-light placeholder:text-muted-foreground web:ring-offset-background  web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
        props.editable === false && 'opacity-50 web:cursor-not-allowed',
        hasLeftIcon && 'pl-9',
        hasRightIcon && 'pr-9',
        className
      )}
      placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
      {...props}
    />
  )
}

interface InputGroupContextValue {
  hasLeftIcon: boolean
  hasRightIcon: boolean
  disabled?: boolean
}

const InputGroupContext = React.createContext({} as InputGroupContextValue)
const useInputGroupContext = () => React.useContext(InputGroupContext)

export function getValidChildren(children: React.ReactNode) {
  return React.Children.toArray(children).filter((child) =>
    React.isValidElement(child)
  ) as React.ReactElement[]
}

interface InputGroupProps extends React.ComponentProps<typeof View> {
  ref?: React.RefObject<View>
}
const InputGroup = ({ className, children, ref, ...props }: InputGroupProps) => {
  function isChildrenInputAddons() {
    const validChildren = getValidChildren(children)
    let hasLeftIcon = false
    let hasRightIcon = false

    validChildren.forEach((child: any) => {
      if (child.type.displayName === 'InputLeftIcon') {
        hasLeftIcon = true
      } else if (child.type.displayName === 'InputRightIcon') {
        hasRightIcon = true
      }
    })
    return { hasLeftIcon, hasRightIcon }
  }
  const hasAddons = isChildrenInputAddons()

  return (
    <InputGroupContext.Provider value={{ ...hasAddons }}>
      <View ref={ref} className={cn('relative w-full flex', className)} {...props}>
        {children}
      </View>
    </InputGroupContext.Provider>
  )
}
InputGroup.displayName = 'InputGroup'

export const InputLeftIcon = ({ className, ref, ...props }: React.ComponentProps<typeof Icon>) => {
  return <Icon ref={ref} {...props} className={cn('absolute ml-3 left-0 top-3 z-[1]', className)} />
}
InputLeftIcon.displayName = 'InputLeftIcon'

export const InputRightIcon = ({ className, ref, ...props }: React.ComponentProps<typeof Icon>) => {
  return (
    <Icon ref={ref} {...props} className={cn('absolute mr-3 right-0 top-3 z-[1]', className)} />
  )
}
InputRightIcon.displayName = 'InputRightIcon'

export { Input, InputGroup }
