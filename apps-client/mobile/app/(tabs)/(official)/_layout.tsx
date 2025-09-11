import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack initialRouteName="announcement">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="announcement" options={{ headerShown: false }} />
    </Stack>
  )
}
