import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="announcement/index" />
      <Stack.Screen name="announcement/[feedId]" />
      <Stack.Screen name="election/[electionId]/index" />
      <Stack.Screen name="mini-app/[appId]/index" />
    </Stack>
  )
}
