import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="announcement/index" options={{ headerShown: false }} />
      <Stack.Screen name="announcement/[announcementId]" options={{ headerShown: false }} />
    </Stack>
  )
}
