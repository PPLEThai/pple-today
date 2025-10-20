import React, { useCallback } from 'react'
import { Pressable, PressableProps, ScrollView, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H1, H2, H3 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowRightIcon,
  CircleChevronRightIcon,
  GlobeIcon,
  InfoIcon,
  LandmarkIcon,
  MailIcon,
  MegaphoneIcon,
  PhoneIcon,
  VoteIcon,
} from 'lucide-react-native'

import ContactMail from '@app/assets/contact-mail.svg'
import Personal from '@app/assets/personal.svg'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { UserAddressInfoSection } from '@app/components/address-info'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@app/components/announcement'
import { ElectionCard } from '@app/components/election/election-card'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'

import { useBottomTabOnPress } from '../_layout'

export default function OfficialPage() {
  const queryClient = useQueryClient()
  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/elections'),
      }),
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/announcements'),
      }),
    ])
  }, [queryClient])

  useBottomTabOnPress(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true })
  })
  const scrollViewRef = React.useRef<ScrollView>(null)
  return (
    <SafeAreaLayout>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-base-bg-default"
        refreshControl={<RefreshControl onRefresh={onRefresh} />}
      >
        <View className="flex flex-col p-4 bg-base-bg-white">
          <View className="flex flex-row gap-2 items-center">
            <Icon
              icon={LandmarkIcon}
              size={32}
              strokeWidth={2}
              className="text-base-primary-default"
            />
            <H1 className="text-3xl font-heading-semibold text-base-primary-default">ทางการ</H1>
          </View>
          <Text className="font-heading-regular text-base-text-medium">
            ข้อมูลข่าวสารจากพรรคประชาชน
          </Text>
        </View>
        <UserAddressInfoSection className="pb-4 bg-base-bg-white" />
        <View className="gap-3 py-4">
          <ElectionSection />
          <AnnouncementSection />
          <InformationSection />
        </View>
      </ScrollView>
    </SafeAreaLayout>
  )
}

const ElectionSection = () => {
  const session = useSession()
  const electionsQuery = reactQueryClient.useQuery('/elections', {}, { enabled: !!session })
  const elections = electionsQuery.data || []
  if (elections.length === 0) {
    return null
  }
  return (
    <View className="flex flex-col">
      <View className="px-4 flex flex-row gap-2 items-center">
        <Icon icon={VoteIcon} size={32} className="text-base-primary-default" />
        <H2 className="text-2xl font-heading-semibold text-base-text-high">เลือกตั้ง</H2>
      </View>
      <Slide
        isLoading={electionsQuery.isLoading}
        count={elections.length}
        itemWidth="container"
        gap={8}
        paddingHorizontal={16}
        className="mt-2"
      >
        <SlideScrollView>
          {elections.map((election) => (
            <SlideItem key={election.id}>
              <ElectionCard election={election} className="flex-1" />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}

const AnnouncementSection = () => {
  const router = useRouter()
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 3 },
  })

  const data = announcementsQuery.data?.announcements

  const AnnouncementPreviewList = () => {
    if (announcementsQuery.isLoading || !data) {
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
            onPress={() => router.navigate(`/announcement/${item.id}`)}
            id={item.id}
            feedId={item.id}
            title={item.title}
            date={item.publishedAt.toString()}
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
          <H2 className="text-2xl font-heading-semibold text-base-text-high">ประกาศ</H2>
        </View>
        <View className="min-h-10">
          {data && data.length > 0 && (
            <Button variant="ghost" onPress={() => router.navigate('/announcement')}>
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
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null)
  const onOpen = () => {
    bottomSheetModalRef.current?.present()
  }

  const insets = useSafeAreaInsets()

  return (
    <View className="px-4">
      <View className="flex flex-row gap-2 items-center">
        <View className="w-8 h-8 flex items-center justify-center">
          <Icon icon={InfoIcon} size={32} className="text-base-primary-default" />
        </View>
        <H2 className="text-2xl font-heading-semibold text-base-text-high">ข้อมูลพรรคประชาชน</H2>
      </View>
      <View className="mt-4 gap-y-4">
        <View className="flex flex-row gap-x-[12.5px]">
          <InfoItem
            onPress={() => WebBrowser.openBrowserAsync('https://peoplesparty.or.th/person/')}
          >
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-base-secondary-default rounded-lg items-center justify-center">
                <Personal width={24} height={24} color="white" />
              </View>
              <Text className="text-base font-heading-semibold w-full">บุคลากรของพรรค</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </InfoItem>
          <InfoItem
            onPress={() => WebBrowser.openBrowserAsync('https://peoplesparty.or.th/about/')}
          >
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-base-primary-default rounded-lg items-center justify-center">
                <PPLEIcon width={20} height={16} color="white" />
              </View>
              <Text className="text-base font-heading-semibold w-full">เกี่ยวกับพรรคประชาชน</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </InfoItem>
        </View>
        <View className="flex flex-row gap-x-[12.5px]">
          <InfoItem onPress={onOpen}>
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-violet-500 rounded-lg items-center justify-center">
                <ContactMail width={24} height={24} color="white" />
              </View>
              <Text className="text-base font-heading-semibold w-full">ช่องทางการติดต่อ</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
            <BottomSheetModal ref={bottomSheetModalRef} bottomInset={insets.bottom}>
              <BottomSheetView>
                <View className="p-4 pb-0">
                  <H3>ช่องทางการติดต่อ</H3>
                </View>
                <View className="p-4">
                  <View className="w-full rounded-lg border border-base-outline-default p-4 bg-base-bg-default">
                    <View className="gap-4">
                      <View className="gap-2">
                        <View className="flex flex-row justify-start items-center gap-1">
                          <Icon
                            icon={LandmarkIcon}
                            size={16}
                            strokeWidth={1}
                            className="text-base-primary-default"
                          />
                          <Text className="text-base-text-high font-body-medium">สำนักงานใหญ่</Text>
                        </View>
                        <View className="gap-0.5">
                          <Text className="font-body-light">เลขที่ 167 อาคารอนาคตใหม่ ชั้น 4</Text>
                          <Text className="font-body-light">
                            รามคำแหง 42 แขวงหัวหมาก เขต บางกะปิ
                          </Text>
                          <Text className="font-body-light">กรุงเทพมหานคร 10240</Text>
                        </View>
                      </View>
                      <View className="gap-2">
                        <View className="flex flex-row justify-start items-center gap-1">
                          <Icon
                            icon={PhoneIcon}
                            size={16}
                            strokeWidth={1}
                            className="text-base-primary-default"
                          />
                          <Text className="text-base-text-high font-body-medium">เบอร์โทร</Text>
                        </View>
                        <Text className="font-body-light items-baseline">
                          <Text
                            onPress={() => Linking.openURL('tel:028215874')}
                            className="underline font-body-light"
                          >
                            02-821-5874
                          </Text>{' '}
                          (จันทร์-ศุกร์ 10:00-18:00 น.)
                        </Text>
                      </View>
                      <View className="gap-2">
                        <View className="flex flex-row justify-start items-center gap-1">
                          <Icon
                            icon={MailIcon}
                            size={16}
                            strokeWidth={1}
                            className="text-base-primary-default"
                          />
                          <Text className="text-base-text-high font-body-medium">อีเมล</Text>
                        </View>
                        <View className="gap-0.5 mb-10">
                          <Text
                            className="font-body-light underline"
                            onPress={() =>
                              Linking.openURL('mailto:office@peoplespartythailand.org')
                            }
                          >
                            office@peoplespartythailand.org
                          </Text>
                          <Text className="font-body-light">PeoplesPartyThailand</Text>
                          <Text className="font-body-light">@PPLEThailand</Text>
                          <Text className="font-body-light">พรรคประชาชน - People&apos;s Party</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </BottomSheetView>
            </BottomSheetModal>
          </InfoItem>
          <InfoItem onPress={() => WebBrowser.openBrowserAsync('https://peoplesparty.or.th/')}>
            <View className="flex justify-start flex-col flex-wrap">
              <View className="flex flex-col mb-3 h-8 w-8 bg-blue-500 rounded-lg items-center justify-center">
                <Icon icon={GlobeIcon} size={22} color="white" />
              </View>
              <Text className="text-base font-heading-semibold w-full">เว็บไซต์ทางการ</Text>
            </View>
            <View className="flex-1 justify-end items-end">
              <Icon
                icon={CircleChevronRightIcon}
                size={28}
                strokeWidth={1}
                className="text-foreground"
              />
            </View>
          </InfoItem>
        </View>
      </View>
    </View>
  )
}

interface InfoItemProps extends PressableProps {
  children: React.ReactNode
}

const InfoItem = ({ children, ...props }: InfoItemProps) => {
  const opacity = useSharedValue(1)
  const onPressIn = () => {
    opacity.value = withTiming(0.5, { duration: 150 })
  }
  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: 150 })
  }
  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} {...props} className="flex-1">
      <Animated.View
        style={{ opacity }}
        className="p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default"
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
