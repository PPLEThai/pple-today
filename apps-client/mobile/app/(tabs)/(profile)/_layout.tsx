import { Stack } from 'expo-router'

export default function Layout() {
  return <Stack initialRouteName="profile/index" screenOptions={{ headerShown: false }} />
}
