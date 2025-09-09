import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[feedId]" options={{ headerShown: false }} />
    </Stack>
  )
}
