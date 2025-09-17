import { Pressable, ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import {
  ArrowRightIcon,
  CircleChevronRightIcon,
  GlobeIcon,
  InfoIcon,
  LandmarkIcon,
  MegaphoneIcon,
} from 'lucide-react-native'

import ContactMail from '@app/assets/contact-mail.svg'
import Personal from '@app/assets/personal.svg'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { UserAddressInfoSection } from '@app/components/address-info'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@app/components/announcement'
import { reactQueryClient } from '@app/libs/api-client'

export default function OfficialPage() {
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <ScrollView>
        <View className="flex flex-col p-4 bg-base-bg-white">
          <View className="flex flex-row gap-2 items-center">
            <Icon
              icon={LandmarkIcon}
              size={32}
              strokeWidth={2}
              className="text-base-primary-default"
            />
            <H1 className="text-3xl font-anakotmai-medium text-base-primary-default mt-2">
              ทางการ
            </H1>
          </View>
          <Text className="font-anakotmai-light text-base-text-medium">
            ข้อมูลข่าวสารจากพรรคประชาชน
          </Text>
        </View>
        <UserAddressInfoSection className="pb-4 bg-base-bg-white" />
        <View className="gap-3 py-4">
          <AnnouncementSection />
          <InformationSection />
          <DemoSection />
          <DemoSection />
        </View>
      </ScrollView>
    </View>
  )
}

const DemoSection = () => {
  return (
    <View className="px-4">
      <View className="flex flex-row gap-2 items-center">
        <View className="w-8 h-8 flex items-center justify-center">
          <Icon icon={MegaphoneIcon} size={32} className="text-base-primary-default" />
        </View>
        <H2 className="text-2xl font-anakotmai-medium text-base-text-high">ประกาศ</H2>
      </View>
      <View className="h-48 bg-base-bg-white rounded-xl border border-base-outline-default mt-2 p-4"></View>
    </View>
  )
}

const AnnouncementSection = () => {
  const router = useRouter()
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 3 },
  })

  const data = announcementsQuery.data?.announcements || []

  const AnnouncementPreviewList = () => {
    if (announcementsQuery.isLoading) {
      return (
        <View className="my-3 gap-3">
          <AnnouncementCardSkeleton className="w-full" />
          <AnnouncementCardSkeleton className="w-full" />
          <AnnouncementCardSkeleton className="w-full" />
        </View>
      )
    }

    return (
      <View className="my-3 gap-3">
        {data.map((item) => (
          <AnnouncementCard
            className="w-full"
            key={item.id}
            onPress={() => router.navigate(`/(official)/announcement/${item.id}`)}
            id={item.id}
            feedId={item.id}
            title={item.title}
            date={item.createdAt.toString()}
            type={item.type}
          />
        ))}
      </View>
    )
  }

  return (
    <View className="px-4">
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={MegaphoneIcon} size={32} className="text-base-primary-default" />
          <H2 className="text-2xl font-anakotmai-medium text-base-text-high">ประกาศ</H2>
        </View>
        <View className="min-h-10">
          {data.length > 0 && (
            <Button variant="ghost" onPress={() => router.navigate('/(official)/announcement')}>
              <Text>ดูเพิ่มเติม</Text>
              <Icon icon={ArrowRightIcon} strokeWidth={2} />
            </Button>
          )}
        </View>
      </View>
      <AnnouncementPreviewList />
    </View>
  )
}

const InformationSection = () => {
  return (
    <View className="px-4">
      <View className="flex flex-row gap-2 items-center">
        <View className="w-8 h-8 flex items-center justify-center">
          <Icon icon={InfoIcon} size={32} className="text-base-primary-default" />
        </View>
        <H2 className="text-2xl font-anakotmai-medium text-base-text-high">ข้อมูลพรรคประชาชน</H2>
      </View>
      <View className="mt-4 gap-y-4">
        <View className="flex flex-row gap-x-[12.5px]">
          <Pressable className="flex-1 p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default">
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-base-secondary-default rounded-lg items-center justify-center">
                <Personal width={24} height={24} color="white" />
              </View>
              <Text className="text-base font-anakotmai-medium w-full">บุคคลากรของพรรค</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </Pressable>
          <Pressable className="flex-1 p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default">
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-base-primary-default rounded-lg items-center justify-center">
                <PPLEIcon width={20} height={16} color="white" />
              </View>
              <Text className="text-base font-anakotmai-medium w-full">เกี่ยวกับพรรคประชาชน</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </Pressable>
        </View>
        <View className="flex flex-row gap-x-[12.5px]">
          <Pressable className="flex-1 p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default">
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-violet-500 rounded-lg items-center justify-center">
                <ContactMail width={24} height={24} color="white" />
              </View>
              <Text className="text-base font-anakotmai-medium w-full">ช่องทางการติดต่อ</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </Pressable>
          <Pressable className="flex-1 p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default">
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-blue-500 rounded-lg items-center justify-center">
                <Icon icon={GlobeIcon} size={22} color="white" />
              </View>
              <Text className="text-base font-anakotmai-medium w-full">เว็บไซต์ทางการ</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
