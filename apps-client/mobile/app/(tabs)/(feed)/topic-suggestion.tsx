import { FlatList, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, MegaphoneIcon } from 'lucide-react-native'

import { TopicCard } from '@app/components/feed/topic-card'

export default function TopicSuggestionPage() {
  const router = useRouter()

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => {
            router.back()
          }}
          aria-label="กลับ"
        >
          <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
        </Button>
        <View className="flex flex-col gap-1 items-end">
          <View className="inline-flex flex-row justify-center gap-2 items-center">
            <Icon
              icon={MegaphoneIcon}
              size={32}
              className="text-base-primary-default align-middle"
            />
            <H1 className="font-anakotmai-medium text-3xl text-base-primary-default">
              หัวข้อน่าสนใจ
            </H1>
          </View>
          <Text className="text-base-text-medium text-base font-anakotmai-light">
            คุณติดตามหัวข้อเหล่านี้แล้วหรือยัง?
          </Text>
        </View>
      </View>
      <FlatList
        contentContainerClassName="py-4 px-3 gap-3"
        showsVerticalScrollIndicator={false}
        data={Array.from({ length: 20 }).map((_, i) => ({
          id: i.toString(),
          name: 'ลุยพื้นที่',
          description:
            '“ส้มสู้ไฟ” คือโครงการพรรคประชาชน ร่วมแก้ไฟป่า-ฝุ่น PM2.5 ภาคเหนือ เน้นแนวกันไฟ หนุนอาสา และขับเคลื่อน นโยบายสิ่งแวดล้อม',
          imageUrl: 'https://picsum.photos/200',
          followed: false,
          hashtags: [
            { id: '1', name: '#ส้มสู้ไฟ' },
            { id: '2', name: '#ไฟป่า' },
          ],
        }))}
        renderItem={({ item }) => <TopicCard topic={item} className="w-full h-[243px]" />}
      />
    </View>
  )
}
