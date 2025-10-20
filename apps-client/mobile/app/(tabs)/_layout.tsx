// https://www.reactnativereusables.com/extras/material-top-tabs/

import React, { useCallback } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { PlatformPressable } from '@react-navigation/elements'
import { Image } from 'expo-image'
import { Tabs, useFocusEffect } from 'expo-router'
import {
  CircleUserRoundIcon,
  HandshakeIcon,
  HouseIcon,
  LucideIcon,
  SearchIcon,
} from 'lucide-react-native'
import { cssInterop } from 'nativewind'

import PPLEIconBlack from '@app/assets/pple-icon-black.svg'
import { useSession } from '@app/libs/auth'
import { useCallbackRef } from '@app/utils/use-callback-ref'

cssInterop(Image, { className: 'style' })

export default function BottomTabsLayout() {
  const insets = useSafeAreaInsets()
  const session = useSession()

  return (
    <BottomTabActionProvider>
      <View className="flex-1 px-safe">
        <Tabs
          screenOptions={{
            headerShown: false,
            animation: 'none',
            tabBarStyle: {
              paddingHorizontal: 16,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom,
              borderTopColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
            },
            tabBarHideOnKeyboard: true,
          }}
          initialRouteName="(feed)"
        >
          <Tabs.Screen
            name="(feed)"
            options={{
              title: 'หน้าแรก',
              tabBarIcon: (props) => <TabBarIcon {...props} icon={HouseIcon} />,
              tabBarLabel: TabBarLabel,
              tabBarButton: (props) => <TabBarButton {...props} index={0} />,
            }}
          />
          <Tabs.Protected guard={!!session}>
            <Tabs.Screen
              name="(search)"
              options={{
                title: 'ค้นหา',
                tabBarIcon: (props) => <TabBarIcon {...props} icon={SearchIcon} />,
                tabBarLabel: TabBarLabel,
                ...(session
                  ? { tabBarButton: (props) => <TabBarButton {...props} index={1} /> }
                  : { href: null }),
              }}
            />
          </Tabs.Protected>
          <Tabs.Screen
            name="(official)"
            options={{
              title: 'ทางการ',
              tabBarIcon: (props) => <TabBarIcon {...props} icon={PPLEIconBlack} />,
              tabBarLabel: TabBarLabel,
              tabBarButton: (props) => <TabBarButton {...props} index={2} />,
            }}
          />
          <Tabs.Screen
            name="activity"
            options={{
              title: 'กิจกรรม',
              tabBarIcon: (props) => <TabBarIcon {...props} icon={HandshakeIcon} />,
              tabBarLabel: TabBarLabel,
              tabBarButton: (props) => <TabBarButton {...props} index={3} />,
            }}
          />
          <Tabs.Screen
            name="(profile)"
            options={{
              title: 'ฉัน',
              tabBarIcon: (props) => <TabBarIcon {...props} icon={CircleUserRoundIcon} />,
              tabBarLabel: TabBarLabel,
              tabBarButton: (props) => <TabBarButton {...props} index={4} />,
            }}
          />
          <Tabs.Screen
            name="(top-tabs)"
            options={{
              title: 'Playground',
              href: null,
            }}
          />
        </Tabs>
      </View>
    </BottomTabActionProvider>
  )
}

function TabBarIcon(props: { focused: boolean; icon: LucideIcon }) {
  return (
    <Icon
      icon={props.icon}
      size={24}
      className={clsx(props.focused ? 'text-base-primary-default' : 'text-base-text-high ')}
      strokeWidth={1.5}
    />
  )
}
function TabBarLabel(props: {
  focused: boolean
  color: string
  // position: LabelPosition
  children: string
}) {
  return (
    <Text
      className={clsx(
        'text-xs',
        props.focused
          ? 'font-heading-semibold text-base-primary-default'
          : 'font-heading-regular text-base-text-high'
      )}
    >
      {props.children}
    </Text>
  )
}
function TabBarButton({ style, index, ...props }: BottomTabBarButtonProps & { index: number }) {
  const { actions } = useBottomTabActionContext()
  return (
    <PlatformPressable
      {...props}
      style={{ paddingHorizontal: 0, paddingVertical: 8, height: 60 }}
      className={clsx(
        'border-b-2 flex flex-col items-center justify-center',
        props['aria-selected'] ? 'border-base-primary-default' : 'border-transparent'
      )}
      android_ripple={{ color: undefined }}
      onPress={(e) => {
        props.onPress?.(e)
        if (props['aria-selected']) {
          actions.current?.[index]?.()
        }
      }}
    />
  )
}

type Action = () => void

interface BottomTabActionContextValue {
  actions: React.RefObject<Record<number, Action>>
  registerAction: (index: number, fn: Action) => () => void
}
export const BottomTabActionContext = React.createContext<BottomTabActionContextValue | null>(null)

export function BottomTabActionProvider({ children }: { children: React.ReactNode }) {
  const actions = React.useRef<Record<number, Action>>({})
  const registerAction = useCallback((index: number, fn: () => void) => {
    actions.current[index] = fn
    return () => {
      delete actions.current[index]
    }
  }, [])
  return (
    <BottomTabActionContext.Provider value={{ actions, registerAction }}>
      {children}
    </BottomTabActionContext.Provider>
  )
}

export function useBottomTabActionContext() {
  const context = React.useContext(BottomTabActionContext)
  if (!context) {
    throw new Error(
      'useBottomTabActionContext must be used within a BottomTabActionContext.Provider'
    )
  }
  return context
}

export function useBottomTabOnPress(index: number, action: Action) {
  const { registerAction } = useBottomTabActionContext()
  // TODO: useEffectEvent(action)
  const _action = useCallbackRef(action)
  useFocusEffect(
    React.useCallback(() => {
      return registerAction(index, _action)
    }, [registerAction, index, _action])
  )
}
