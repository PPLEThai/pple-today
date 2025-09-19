import { FlatList, View } from 'react-native'

import { MegaphoneIcon } from 'lucide-react-native'

import { TopicCard } from '@app/components/feed/topic-card'
import { PageHeader } from '@app/components/page-header'

export default function TopicSuggestionPage() {
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <PageHeader
        icon={MegaphoneIcon}
        title="หัวข้อน่าสนใจ"
        subtitle="คุณติดตามหัวข้อเหล่านี้แล้วหรือยัง?"
      />
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
