// https://www.reactnativereusables.com/extras/material-top-tabs/

import React, { useCallback, useEffect } from 'react'
import { ColorValue, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { Image } from 'expo-image'
import { Tabs, usePathname } from 'expo-router'
import { BottomTabBarButtonProps } from 'expo-router/js-tabs'
import { PlatformPressable } from 'expo-router/react-navigation'
import { CircleUserRoundIcon, HandshakeIcon, HouseIcon, LucideIcon } from 'lucide-react-native'
import { cssInterop } from 'nativewind'

import PeopleIcon from '@app/assets/people.svg'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { GlassTab, GlassTabBar, TabBarSafeArea } from '@app/components/glass-tab-bar'
import { useSession } from '@app/libs/auth'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'
import { useCallbackRef } from '@app/utils/use-callback-ref'

cssInterop(Image, { className: 'style' })

export default function BottomTabsLayout() {
  return (
    <BottomTabActionProvider>
      {supportsLiquidGlass ? <GlassTabsLayout /> : <JsTabsLayout />}
    </BottomTabActionProvider>
  )
}

const GLASS_TABS: GlassTab[] = [
  { name: '(feed)', icon: { sf: { default: 'house', selected: 'house.fill' } } },
  { name: '(volunteer)', icon: { sf: { default: 'person.2', selected: 'person.2.fill' } } },
  { name: '(official)', icon: { image: require('@app/assets/tab-icons/pple.png') } },
  { name: '(activity)', icon: { image: require('@app/assets/tab-icons/handshake.png') } },
  {
    name: '(profile)',
    icon: { sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' } },
  },
]

/**
 * iOS 26: our own Liquid Glass tab bar (see <GlassTabBar />), so the selected
 * tab can sit in an orange glass pill; the native bar's selection can't be
 * tinted.
 */
function GlassTabsLayout() {
  const session = useSession()
  const { actions } = useBottomTabActionContext()

  return (
    <Tabs
      tabBar={(props) => (
        <GlassTabBar
          {...props}
          tabs={GLASS_TABS}
          // Tapping the selected tab again: the tab's stack pops to its root,
          // and on the root screen we run its action (scroll to top).
          onReselect={(pathname) => actions.current?.[pathname]?.()}
        />
      )}
      screenOptions={{ headerShown: false, animation: 'none' }}
      screenLayout={({ children }) => <TabBarSafeArea>{children}</TabBarSafeArea>}
    >
      <Tabs.Screen name="(feed)" options={{ title: 'หน้าแรก' }} />
      <Tabs.Screen name="(volunteer)" options={{ title: 'อาสา' }} />
      <Tabs.Screen name="(official)" options={{ title: 'แอปฯ' }} />
      <Tabs.Screen name="(activity)" options={{ title: 'กิจกรรม' }} />
      <Tabs.Screen name="(profile)" options={{ title: session ? 'ฉัน' : 'เข้าสู่ระบบ' }} />
      <Tabs.Screen name="(top-tabs)" options={{ title: 'Playground', href: null }} />
    </Tabs>
  )
}

const PRIMARY_COLOR = '#FF6A13' // base-primary-default

/** Android and iOS before 26. */
function JsTabsLayout() {
  const insets = useSafeAreaInsets()
  const session = useSession()

  return (
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
      >
        <Tabs.Screen
          name="(feed)"
          options={{
            title: 'หน้าแรก',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={HouseIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        {/* Shown signed out too: อาสาประชาชน asks the user to sign in itself. */}
        <Tabs.Screen
          name="(volunteer)"
          options={{
            title: 'อาสา',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={PeopleIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="(official)"
          options={{
            title: 'แอปฯ',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={PPLEIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="(activity)"
          options={{
            title: 'กิจกรรม',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={HandshakeIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            // Signed out, this tab is the sign-in screen, and says so.
            title: session ? 'ฉัน' : 'เข้าสู่ระบบ',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={CircleUserRoundIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
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
  )
}

function TabBarIcon(props: { focused: boolean; icon: LucideIcon; size?: number }) {
  const size = props.size ?? 24
  return (
    <Icon
      icon={props.icon}
      size={size}
      width={size}
      height={size}
      className={clsx(props.focused ? 'text-base-primary-default' : 'text-base-text-high')}
      strokeWidth={1.5}
    />
  )
}
function TabBarLabel(props: {
  focused: boolean
  color: ColorValue
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
function TabBarButton({ style, ...props }: BottomTabBarButtonProps) {
  const { actions } = useBottomTabActionContext()
  const pathname = usePathname()
  return (
    <PlatformPressable
      {...props}
      // Styles, not classes: this pressable isn't styled by className. Each tab
      // takes an equal share of the bar (the default button's `flex: 1`, from
      // the style this button drops), centred, with the selected one underlined.
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
        paddingVertical: 8,
        height: 60,
        borderBottomWidth: 2,
        borderBottomColor: props['aria-selected'] ? PRIMARY_COLOR : 'transparent',
      }}
      android_ripple={{ color: undefined }}
      onPress={(e) => {
        props.onPress?.(e)
        if (props['aria-selected'] && props.href === pathname) {
          actions.current?.[pathname]?.()
        }
      }}
    />
  )
}

type Action = () => void

interface BottomTabActionContextValue {
  actions: React.RefObject<Record<string, Action>>
  registerAction: (path: string, fn: Action) => () => void
}
export const BottomTabActionContext = React.createContext<BottomTabActionContextValue | null>(null)

export function BottomTabActionProvider({ children }: { children: React.ReactNode }) {
  const actions = React.useRef<Record<string, Action>>({})
  const registerAction = useCallback((path: string, fn: () => void) => {
    actions.current[path] = fn
    return () => {
      delete actions.current[path]
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

export function useBottomTabOnPress(action: Action) {
  const { registerAction } = useBottomTabActionContext()
  // TODO: useEffectEvent(action)
  const _action = useCallbackRef(action)
  const pathname = usePathname()
  useEffect(() => {
    return registerAction(pathname, _action)
    // register only on local pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
