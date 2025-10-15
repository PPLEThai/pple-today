import { Text } from '@pple-today/ui/text'
import { useLocalSearchParams } from 'expo-router'

export default function ActivityDetailPage() {
  const params = useLocalSearchParams()
  const activityId = params.activityId as string
  return <Text>{activityId}</Text>
}
