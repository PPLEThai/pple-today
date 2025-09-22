// https://www.reactnativereusables.com/extras/material-top-tabs/

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { PlatformPressable } from '@react-navigation/elements'
import { Image } from 'expo-image'
import { Tabs } from 'expo-router'
import {
  CircleUserRoundIcon,
  HandshakeIcon,
  HouseIcon,
  LucideIcon,
  SearchIcon,
} from 'lucide-react-native'
import { cssInterop } from 'nativewind'

import PPLEIconBlack from '@app/assets/pple-icon-black.svg'

cssInterop(Image, { className: 'style' })

export default function BottomTabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <View className="flex-1 pb-safe pl-safe pr-safe">
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
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'ค้นหา',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={SearchIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="(official)"
          options={{
            title: 'ทางการ',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={PPLEIconBlack} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'กิจกรรม',
            tabBarIcon: (props) => <TabBarIcon {...props} icon={HandshakeIcon} />,
            tabBarLabel: TabBarLabel,
            tabBarButton: TabBarButton,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'ฉัน',
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
          ? 'font-anakotmai-medium text-base-primary-default'
          : 'font-anakotmai-light text-base-text-high'
      )}
    >
      {props.children}
    </Text>
  )
}
function TabBarButton({ style, ...props }: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      style={{ paddingHorizontal: 0, paddingVertical: 8, height: 60 }}
      className={clsx(
        'border-b-2 flex flex-col items-center justify-center',
        props['aria-selected'] ? 'border-base-primary-default' : 'border-transparent'
      )}
      android_ripple={{ color: undefined }}
    />
  )
}
