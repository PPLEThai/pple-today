import { Stack } from 'expo-router'

export default function ActivityLayout() {
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false }} />
}
