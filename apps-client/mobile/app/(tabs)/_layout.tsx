// https://www.reactnativereusables.com/extras/material-top-tabs/
import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { type ParamListBase, type TabNavigationState, useTheme } from '@react-navigation/native'
import { withLayoutContext } from 'expo-router'

const { Navigator } = createMaterialTopTabNavigator()

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator)

export default function MaterialTopTabsLayout() {
  const { colors } = useTheme()
  return (
    <MaterialTopTabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: 'grey',
        tabBarLabelStyle: {
          fontSize: 14,
          textTransform: 'capitalize',
          fontWeight: 'bold',
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.text,
        },
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: 'auto', minWidth: 100 },
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Index',
        }}
      />
      <MaterialTopTabs.Screen
        name="red"
        options={{
          title: 'Red',
        }}
      />
    </MaterialTopTabs>
  )
}
