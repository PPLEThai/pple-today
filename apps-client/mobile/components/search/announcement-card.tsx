import { cn } from '@pple-today/ui/lib/utils'
import { useRouter } from 'expo-router'

import { GetAnnouncementsResponse } from '@api/backoffice/app'

import { AnnouncementCard } from '../announcement'

type AnnouncementType = GetAnnouncementsResponse['announcements'][number]['type']

interface AnnouncementCardProps {
  id: string
  title: string
  type: AnnouncementType
  date: string
}

export function AnnouncementSearchCard(props: AnnouncementCardProps) {
  const router = useRouter()

  const onPress = () => {
    router.push(`/announcement/${props.id}`)
  }

  return (
    <AnnouncementCard
      id={props.id}
      feedId={props.id}
      title={props.title}
      type={props.type}
      date={props.date}
      className={cn('border-0 rounded-none w-full h-auto flex-1 py-2 px-4 gap-3')}
      onPress={onPress}
    />
  )
}
