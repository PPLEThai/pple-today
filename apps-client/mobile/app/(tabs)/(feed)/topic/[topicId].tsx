import React, { useEffect } from 'react'
import { FlatList, ScrollView, View } from 'react-native'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { Image } from 'expo-image'
import { Link, usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon, HashIcon, InfoIcon } from 'lucide-react-native'

import { GetTopicsResponse } from '@api/backoffice/app'
import { reactQueryClient } from '@app/libs/api-client'

export default function TopicDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const topicId = pathname.split('/').at(-1)
  useEffect(() => {
    if (!topicId) {
      router.dismissTo('/')
    }
  }, [topicId, router])
  const topicQuery = reactQueryClient.useQuery('/topics/:id', {
    pathParams: { id: topicId! },
    enabled: !!topicId,
  })
  if (!topicId) {
    return null
  }
  if (!topicQuery.data) {
    return null
  }
  const topic = topicQuery.data
  return (
    <View className="flex-1 flex flex-col bg-base-bg-default">
      {/* TODO: bleed top safe area */}
      <View className="bg-black">
        {topic.bannerImage && (
          <Image
            source={{ uri: topic.bannerImage }}
            className="absolute top-0 bottom-0 left-0 right-0"
          />
        )}
        <View className="flex flex-col p-4 gap-4">
          <Button
            variant="outline-primary"
            size="icon"
            onPress={() => router.back()}
            aria-label="กลับ"
            className="bg-transparent active:bg-white/10"
          >
            <Icon icon={ArrowLeftIcon} size={24} />
          </Button>
          {/* TODO: Animation when scroll */}
          <View className="flex flex-col gap-2">
            <H1 className="text-3xl font-anakotmai-bold text-base-text-invert">{topic.name}</H1>
            <Button size="sm">
              <Text>ติดตาม</Text>
            </Button>
          </View>
        </View>
      </View>
      <FlatList
        data={[]}
        contentContainerClassName="bg-base-bg-default py-4 px-3"
        ListHeaderComponent={
          <View className="flex flex-col gap-3">
            <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
              <View className="flex flex-row items-center gap-2">
                <Icon icon={InfoIcon} size={24} className="text-base-primary-default" />
                <H2 className="text-base text-base-text-high font-anakotmai-medium">
                  เกี่ยวกับหัวข้อ
                </H2>
              </View>
              <Text className="text-sm text-base-text-medium font-noto-medium">
                {topic.description}
              </Text>
            </View>
            {topic.hashTags.length > 0 && (
              <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
                <View className="flex flex-row items-center gap-2">
                  <Icon icon={HashIcon} size={24} className="text-base-primary-default" />
                  <H2 className="text-base text-base-text-high font-anakotmai-medium">
                    ที่เกี่ยวข้อง
                  </H2>
                </View>
                <View className="flex flex-row flex-wrap gap-2">
                  {topic.hashTags.slice(0, 4).map((tag) => (
                    <Link href={`/(feed)/hashtag/${tag.id}`} key={tag.id} asChild>
                      <Badge variant="outline" className="px-4 py-1.5">
                        <Text className="text-sm text-base-text-high font-anakotmai-medium">
                          {tag.name}
                        </Text>
                      </Badge>
                    </Link>
                  ))}
                  {topic.hashTags.length > 4 && <MoreHashtagDialog hashTags={topic.hashTags} />}
                </View>
              </View>
            )}
          </View>
        }
        renderItem={() => null}
        // renderItem={({ item }) => (
        //   <View className="p-4 border-b border-base-border">
        //     <H1 className="text-xl font-anakotmai-bold text-base-text">{item.title}</H1>
        //     <Text className="text-base-text">{item.content}</Text>
        //   </View>
        // )}
      />
    </View>
  )
}

interface MoreHashtagDialogProps {
  hashTags: GetTopicsResponse[number]['hashTags']
}
function MoreHashtagDialog({ hashTags }: MoreHashtagDialogProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="outline" className="px-4 py-1.5">
          <Text className="text-sm text-base-text-high font-anakotmai-medium">
            ดูเพิ่มเติม ({hashTags.length - 4})
          </Text>
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle># ที่เกี่ยวข้อง</DialogTitle>
          <DialogDescription>แฮชแท็กที่เกี่ยวข้องกับหัวข้อนี้</DialogDescription>
        </DialogHeader>
        <ScrollView
          contentContainerClassName="flex flex-row p-2 flex-wrap gap-2"
          className="border border-base-outline-default rounded-xl max-h-96 bg-base-bg-light"
        >
          {hashTags.map((tag) => (
            <Link
              href={`/(feed)/hashtag/${tag.id}`}
              key={tag.id}
              asChild
              onPress={() => setOpen(false)}
            >
              <Badge variant="outline" className="px-4 py-1.5">
                <Text className="text-sm text-base-text-high font-anakotmai-medium">
                  {tag.name}
                </Text>
              </Badge>
            </Link>
          ))}
        </ScrollView>
      </DialogContent>
    </Dialog>
  )
}
