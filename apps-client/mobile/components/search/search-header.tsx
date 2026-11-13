import React from 'react'
import { TextInputProps, useWindowDimensions, View } from 'react-native'

import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { GlassView } from 'expo-glass-effect'
import { SearchIcon } from 'lucide-react-native'

import { BackButton } from '@app/components/back-button'
import { NativeHeader } from '@app/components/page-header'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'

// Room the native bar keeps beside a custom item on iOS 26; any wider and UIKit
// moves the item into an overflow menu.
const BAR_INSET = 24

interface SearchHeaderProps {
  onBack: () => void
  /** The search field, usually a <SearchInput />. */
  children: React.ReactNode
  /** iOS 26: Liquid Glass behind the bar while true. See `useHeaderGlass()`. */
  glass?: boolean
}

/**
 * The search screens' header: a back button and the search field. On iOS 26 it
 * sits in the native bar, so the list scrolls under it with Liquid Glass (spread
 * `useHeaderGlass().scrollProps` on the list); elsewhere a white row under the
 * status bar.
 */
export function SearchHeader({ onBack, children, glass }: SearchHeaderProps) {
  const { width } = useWindowDimensions()
  const row = (
    <View className="flex flex-row items-center gap-3">
      <BackButton onPress={onBack} aria-label="กลับ" />
      <View className="flex-1">{children}</View>
    </View>
  )
  if (supportsLiquidGlass) {
    return (
      <NativeHeader
        // In place of the native back button: the search stack's first screen
        // has none, as the stack is nested in the tab's. The bar sizes a custom
        // item to its content, so give the row the bar's full width.
        leftNode={<View style={{ width: width - BAR_INSET * 2 }}>{row}</View>}
        glass={glass}
      />
    )
  }
  return <View className="pt-safe-offset-4 px-4 pb-4 bg-base-bg-white">{row}</View>
}

/** The search field: a glass capsule on iOS 26, an outlined box elsewhere. */
export function SearchInput(props: TextInputProps) {
  if (supportsLiquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={{ height: 44, borderRadius: 22 }}>
        <InputGroup>
          <InputLeftIcon icon={SearchIcon} className="top-3.5 ml-4 text-base-text-medium" />
          <Input
            placeholder="ค้นหา"
            returnKeyType="search"
            {...props}
            className="h-11 pl-11 pr-4 border-0 bg-transparent rounded-full"
          />
        </InputGroup>
      </GlassView>
    )
  }
  return (
    <InputGroup>
      <InputLeftIcon icon={SearchIcon} className="text-base-text-medium" />
      <Input placeholder="ค้นหา" returnKeyType="search" {...props} className="rounded-lg" />
    </InputGroup>
  )
}
