import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="hashtag/[hashtagId]" />
      <Stack.Screen name="announcement/index" />
      <Stack.Screen name="people-suggestion" />
      <Stack.Screen name="topic-suggestion" />
      <Stack.Screen name="[feedId]" />
    </Stack>
  )
}
