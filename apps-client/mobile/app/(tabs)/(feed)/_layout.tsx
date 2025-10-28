import { Stack } from 'expo-router'

export default function FeedLayout() {
  return <Stack initialRouteName="index" screenOptions={{ headerShown: false }} />
}
