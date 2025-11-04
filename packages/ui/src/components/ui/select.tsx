import * as React from 'react'
import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import * as SelectPrimitive from '@rn-primitives/select'

import { Check } from '../../lib/icons/Check'
import { ChevronDown } from '../../lib/icons/ChevronDown'
import { ChevronUp } from '../../lib/icons/ChevronUp'
import { cn } from '../../lib/utils'

type Option = SelectPrimitive.Option

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = ({
  ref,
  className,
  children,
  ...props
}: SelectPrimitive.ValueProps & {
  ref?: React.RefObject<SelectPrimitive.ValueRef>
  children?: React.ReactNode
}) => {
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn('text-[0.875rem] font-heading-regular text-foreground', className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  ref,
  className,
  children,
  ...props
}: SelectPrimitive.TriggerProps & {
  ref?: React.RefObject<SelectPrimitive.TriggerRef>
  children?: React.ReactNode
  'aria-invalid'?: boolean
}) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-row h-10 items-center justify-between rounded-lg border border-input bg-background px-3 py-2 web:ring-offset-background web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2 [&>span]:line-clamp-1',
        props.disabled && 'web:cursor-not-allowed opacity-50',
        props['aria-invalid'] && 'border-destructive web:ring-destructive',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={16} aria-hidden={true} className="text-foreground" />
    </SelectPrimitive.Trigger>
  )
}

/**
 * Platform: WEB ONLY
 */
function SelectScrollUpButton({ className, ...props }: SelectPrimitive.ScrollUpButtonProps) {
  if (Platform.OS !== 'web') {
    return null
  }
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex web:cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUp size={14} className="text-foreground" />
    </SelectPrimitive.ScrollUpButton>
  )
}

/**
 * Platform: WEB ONLY
 */
function SelectScrollDownButton({ className, ...props }: SelectPrimitive.ScrollDownButtonProps) {
  if (Platform.OS !== 'web') {
    return null
  }
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex web:cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDown size={14} className="text-foreground" />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  portalHost,
  ...props
}: SelectPrimitive.ContentProps & {
  ref?: React.RefObject<SelectPrimitive.ContentRef>
  className?: string
  portalHost?: string
}) {
  const { open } = SelectPrimitive.useRootContext()

  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <SelectPrimitive.Overlay style={Platform.OS !== 'web' ? StyleSheet.absoluteFill : undefined}>
        <AnimatedWrapper>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 max-h-96 min-w-[8rem] rounded-lg border border-border bg-popover shadow-md shadow-foreground/10 py-2 px-1 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
              position === 'popper' &&
                'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
              open
                ? 'web:zoom-in-95 web:animate-in web:fade-in-0'
                : 'web:zoom-out-95 web:animate-out web:fade-out-0',
              className
            )}
            sideOffset={4}
            position={position}
            {...props}
          >
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
              className={cn(
                'p-1',
                position === 'popper' &&
                  'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
              )}
            >
              <NativeSelectScrollView>{children}</NativeSelectScrollView>
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
          </SelectPrimitive.Content>
        </AnimatedWrapper>
      </SelectPrimitive.Overlay>
    </SelectPrimitive.Portal>
  )
}

// https://github.com/founded-labs/react-native-reusables/issues/344
// AnimatedWrapper: NativeOnlyAnimatedView caused scrolling to not work on
// Android devices, so we skip the animated wrapper on Android and render
// children directly. Other platforms still use the animated container.
const AnimatedWrapper = ({ children }: { children: React.ReactNode }) => {
  return Platform.OS === 'android' ? (
    <>{children}</>
  ) : (
    <Animated.View className="z-50" entering={FadeIn} exiting={FadeOut}>
      {children}
    </Animated.View>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.LabelProps & {
  ref?: React.RefObject<SelectPrimitive.LabelRef>
}) {
  return (
    <SelectPrimitive.Label
      className={cn(
        'py-1.5 pl-10 pr-2 text-popover-foreground text-sm font-heading-semibold',
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  // children,
  ...props
}: SelectPrimitive.ItemProps & {
  ref?: React.RefObject<SelectPrimitive.ItemRef>
  children?: never
}) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative web:group flex flex-row w-full web:cursor-default web:select-none items-center rounded-sm py-1.5 native:py-2 pl-8 native:pl-10 pr-2 web:hover:bg-accent/50 active:bg-accent web:outline-none web:focus:bg-accent',
        props.disabled && 'web:pointer-events-none opacity-50',
        className
      )}
      {...props}
    >
      <View className="absolute left-2 native:left-3.5 flex h-3.5 native:pt-px w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={16} className="text-popover-foreground" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="text-sm font-heading-regular text-popover-foreground web:group-focus:text-accent-foreground" />
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.SeparatorProps & {
  ref?: React.RefObject<SelectPrimitive.SeparatorRef>
}) {
  return (
    <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
  )
}

/**
 * @platform Native only
 * Returns the children on the web
 */
function NativeSelectScrollView({ className, ...props }: React.ComponentProps<typeof ScrollView>) {
  if (Platform.OS === 'web') {
    return <>{props.children}</>
  }
  return <ScrollView className={cn('max-h-52', className)} {...props} />
}

export {
  type Option,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
