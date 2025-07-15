import * as React from 'react'
import { View } from 'react-native'

import { AnyFieldApi, useStore } from '@tanstack/react-form'

import { Label } from './label'
import { Text } from './text'

import { cn } from '../../lib/utils'

interface FormContextValue {
  id: string
  field: AnyFieldApi
}
const FormItemContext = React.createContext<FormContextValue | null>(null)
const useFormItemContext = () => {
  const context = React.useContext(FormItemContext)
  if (context === null) {
    throw new Error('Form components cannot be rendered outside the Form component')
  }
  return context
}

const FormItemProvider = (props: { children: React.ReactNode; field: AnyFieldApi }) => {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id, field: props.field }}>
      {props.children}
    </FormItemContext.Provider>
  )
}
export const FormItem = (props: {
  children: React.ReactNode
  className?: string
  field: AnyFieldApi
}) => {
  // TODO: make it link with control like htmlFor
  return (
    <FormItemProvider field={props.field}>
      <View className={cn('flex flex-col gap-2', props.className)}>{props.children}</View>
    </FormItemProvider>
  )
}
export const FormLabel = (props: React.ComponentProps<typeof Label>) => {
  const { id } = useFormItemContext()

  return (
    <Label nativeID={id} {...props}>
      {props.children}
    </Label>
  )
}

export const FormMessage = (props: { className?: string }) => {
  const { field } = useFormItemContext()
  const errors = useStore(field.store, (state) => state.meta.errors)
  if (errors.length === 0) return null
  return (
    <Text className={cn('text-sm text-destructive -mt-1', props.className)}>
      {errors[0].message}
    </Text>
  )
}
