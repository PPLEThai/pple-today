import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@pple-today/ui/text'
import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { type ParamListBase, type TabNavigationState } from '@react-navigation/native'
import { withLayoutContext } from 'expo-router'

import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'

const { Navigator } = createMaterialTopTabNavigator()

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator)

/**
 * Note: TapBar Indicator might be glitchy on Android
 * especially when route navigating is slow or when the the page is very heavy.
 */

export default function MaterialTopTabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingViewLayout>
      <MaterialTopTabs
        initialRouteName="playground"
        style={{ paddingTop: insets.top }}
        screenOptions={{
          tabBarLabel: (props) => {
            return (
              <Text
                className="text-sm font-heading-semibold"
                {...props}
                style={{ color: props.color }}
              >
                {props.children}
              </Text>
            )
          },
          tabBarActiveTintColor: '#FF6A13', // --base-primary-default
          tabBarInactiveTintColor: '#64748B', // --base-text-medium
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#FF6A13', // --base-primary-default
            height: 2,
            marginBottom: -1,
          },
          tabBarAndroidRipple: { color: undefined },
          tabBarScrollEnabled: true,
          tabBarItemStyle: {
            width: 'auto',
            minWidth: 100,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
            height: 42,
          },
          tabBarStyle: {
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB', // --base-border-default
          },
        }}
      >
        {/* <MaterialTopTabs.Screen
          name="index"
          options={{
            title: 'Index',
          }}
        /> */}
        <MaterialTopTabs.Screen
          name="playground"
          options={{
            title: 'Playground',
          }}
        />
      </MaterialTopTabs>
    </KeyboardAvoidingViewLayout>
  )
}
