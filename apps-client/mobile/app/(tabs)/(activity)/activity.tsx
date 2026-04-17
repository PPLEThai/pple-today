import React, { useCallback, useEffect, useMemo } from 'react'
import { Pressable, PressableProps, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1, H2, H3 } from '@pple-today/ui/typography'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { Link, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowRightIcon,
  CalendarHeartIcon,
  CalendarIcon,
  CircleArrowRightIcon,
  CircleChevronRightIcon,
  GlobeIcon,
  HandshakeIcon,
  InfoIcon,
  LandmarkIcon,
  ListTodoIcon,
  MailIcon,
  MegaphoneIcon,
  PhoneIcon,
  TicketIcon,
} from 'lucide-react-native'

import { Event, FeedItem, FeedItemPoll, ListPollsResponse } from '@api/backoffice/app'
import ContactMail from '@app/assets/contact-mail.svg'
import Personal from '@app/assets/personal.svg'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { ActivityCard, ActivityCardSkeleton } from '@app/components/activity/activity-card'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@app/components/announcement'
import { FeedCard, FeedCardSkeleton } from '@app/components/feed/feed-card'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import { createImageUrl } from '@app/utils/image'

import { useBottomTabOnPress } from '../_layout'

export default function ActivityPage() {
  return (
    <SafeAreaLayout>
      <PollFeedSection
        ListHeaderComponent={
          <>
            <View className="flex flex-col p-4 bg-base-bg-white">
              <View className="flex flex-row gap-2 items-center">
                <Icon
                  icon={HandshakeIcon}
                  size={32}
                  strokeWidth={2}
                  className="text-base-primary-default"
                />
                <H1 className="text-3xl font-heading-semibold text-base-primary-default">
                  กิจกรรม
                </H1>
              </View>
              <Text className="font-heading-regular text-base-text-medium">
                กิจกรรมจากพรรคประชาชน
              </Text>
            </View>
            <View className="py-4">
              <AnnouncementSection />
            </View>
            <RecentActivity />
          </>
        }
        ListFooterExtraComponent={
          <View className="py-4">
            <InformationSection />
          </View>
        }
      />
    </SafeAreaLayout>
  )
}

// Might not be used
export function MyActivity() {
  const session = useSession()
  if (!session) {
    return null
  }
  const isLoading = false // TODO: fetch user's activities
  const activity: Event = {
    id: '1',
    name: 'Knowledge Center ครั้งที่ 1 – “เอาชีวิตรอดอย่างโปร ปฐมพยาบาลช่วยชีวิตปลอดภัย”',
    location: 'อาคารอนาคตใหม่ (หัวหมาก 6)',
    image: 'https://picsum.photos/300?random=0',
    startAt: new Date(),
    endAt: dayjs().add(1, 'day').toDate(),
    url: 'https://www.facebook.com/',
  }

  return (
    <View className="px-4">
      <View className="rounded-2xl border border-base-outline-default bg-base-bg-white px-4 py-3 flex flex-col gap-3">
        <View className="flex flex-row gap-2 items-center pt-0.5 pb-2.5 border-b border-base-outline-default w-full">
          <Icon
            icon={TicketIcon}
            size={32}
            className="text-base-primary-default"
            strokeWidth={1.5}
          />
          <H2 className="text-xl font-heading-semibold text-base-text-high">กิจกรรมของฉัน</H2>
        </View>
        {/* TODO  */}
        {isLoading &&
          Array.from({ length: 2 }).map((_, idx) => (
            <View className="flex flex-row items-center gap-3" key={idx}>
              <Skeleton className="w-12 h-12 rounded-lg" />
              <View className="flex flex-col flex-1">
                <Skeleton className="h-[14px] mt-[6px] w-full" />
                <Skeleton className="h-[14px] mt-[6px] w-3/4" />
                <Skeleton className="h-[14px] mt-[6px] w-1/2" />
              </View>
              <View className="size-10 flex items-center justify-center">
                <Skeleton className="size-6" />
              </View>
            </View>
          ))}
        {/* TODO */}
        {Array.from({ length: 2 }).map((_, idx) => (
          <View key={idx} className="flex flex-row items-center gap-3">
            <Image
              source={{
                uri: createImageUrl(activity.image, {
                  width: 48,
                  height: 48,
                }),
              }}
              className="w-12 h-12 rounded-lg bg-base-bg-default"
            />
            <View className="flex flex-col flex-1">
              <H3 className="text-sm font-heading-medium text-base-text-high line-clamp-2">
                {activity.name}
              </H3>
              <View className="flex flex-row gap-1 items-center">
                <Icon icon={CalendarIcon} size={12} className="text-base-primary-default" />
                <Text className="text-base-primary-default text-xs font-heading-regular flex-1">
                  {dayjs(activity.startAt).isSame(dayjs(activity.endAt), 'day')
                    ? dayjs(activity.startAt).format('dd D MMM BB')
                    : `${dayjs(activity.startAt).format('dd D MMM')} - ${dayjs(activity.endAt).format('D MMM BB')}`}
                </Text>
              </View>
            </View>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ดูกิจกรรม"
              onPress={() => {
                WebBrowser.openBrowserAsync(activity.url)
              }}
            >
              <Icon
                icon={CircleArrowRightIcon}
                size={24}
                strokeWidth={1}
                className="text-base-text-high"
              />
            </Button>
          </View>
        ))}
        <Link asChild href="/my-activities">
          <Button variant="secondary" size="sm">
            <Text>ดูประวัติกิจกรรม</Text>
          </Button>
        </Link>
      </View>
    </View>
  )
}

function RecentActivity() {
  const recentActivityQuery = reactQueryClient.useQuery('/events', {
    query: {
      limit: 3,
    },
  })
  useEffect(() => {
    if (recentActivityQuery.isError) {
      console.error('Error fetching recent activity:', recentActivityQuery.error)
    }
  }, [recentActivityQuery])
  if (recentActivityQuery.isError) {
    return null
  }
  return (
    <View className="px-4 flex flex-col gap-3 pt-4">
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={CalendarHeartIcon} className="size-8 text-base-primary-default" />
          <H2 className="text-2xl text-base-text-high font-heading-semibold">กิจกรรมช่วงนี้</H2>
        </View>
        <Link asChild href="/recent-activities">
          <Button variant="ghost">
            <Text>ดูทั้งหมด</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </Link>
      </View>
      {recentActivityQuery.isError ? null : recentActivityQuery.isLoading ? (
        <>
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </>
      ) : !recentActivityQuery.data || recentActivityQuery.data.result.length === 0 ? (
        <Text className="text-base-text-medium w-full text-center">ไม่มีข้อมูลกิจกรรม</Text>
      ) : (
        recentActivityQuery.data.result.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))
      )}
    </View>
  )
}

function PollFeedSection(props: {
  ListHeaderComponent: React.ReactNode
  ListFooterExtraComponent?: React.ReactNode
}) {
  const session = useSession()

  const listPollQuery = useInfiniteQuery({
    queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'polls'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/polls', {
        query: { page: pageParam, limit: 10 },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data.length < 10) {
        return undefined
      }
      return allPages.length + 1
    },
    select: useCallback((data: InfiniteData<ListPollsResponse>): InfiniteData<FeedItemPoll[]> => {
      return {
        pageParams: data.pageParams,
        pages: data.pages.map((page) => page.data),
      }
    }, []),
    enabled: !!session,
  })
  const data: FeedItemPoll[] = useMemo(() => {
    if (!listPollQuery.data) {
      return []
    }
    return listPollQuery.data.pages.flat()
  }, [listPollQuery.data])
  const renderFeedItem = React.useCallback(({ item }: { item: FeedItem; index: number }) => {
    return <FeedCard key={item.id} feedItem={item} className="mt-3 mx-4" />
  }, [])
  const onEndReached = React.useCallback(() => {
    if (listPollQuery.hasNextPage && !listPollQuery.isFetchingNextPage) {
      listPollQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPollQuery.fetchNextPage, listPollQuery.hasNextPage, listPollQuery.isFetchingNextPage])

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.resetQueries({ queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'polls'] }),
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/events'),
      }),
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/announcements'),
      }),
    ])
  }, [queryClient])

  const flatListRef = React.useRef<Animated.FlatList<any>>(null)
  useBottomTabOnPress(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  })
  return (
    <Animated.FlatList
      ref={flatListRef}
      className="flex-1"
      contentContainerClassName="flex flex-col bg-base-bg-default flex-grow mb-4"
      refreshControl={<RefreshControl onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          {props.ListHeaderComponent}
          {!!session && (
            <View className="flex flex-row justify-between items-center px-4 pt-4">
              <View className="flex flex-row gap-2 items-center">
                <Icon icon={ListTodoIcon} className="size-8 text-base-primary-default" />
                <H2 className="text-2xl text-base-text-high font-heading-semibold">แบบสอบถาม</H2>
              </View>
              {/* <Link asChild href="/poll/feed">
              <Button variant="ghost">
              <Text>ดูทั้งหมด</Text>
              <Icon icon={ArrowRightIcon} />
              </Button>
              </Link> */}
            </View>
          )}
        </>
      }
      data={data}
      renderItem={renderFeedItem}
      onEndReached={onEndReached}
      ListFooterComponent={
        <>
          {session && <PollFooter queryResult={listPollQuery} className="mx-4" />}
          {props.ListFooterExtraComponent}
        </>
      }
    />
  )
}

interface PollFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}
export function PollFooter({ queryResult, className }: PollFooterProps) {
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return <FeedCardSkeleton className={className} />
  }
  if (
    queryResult.data &&
    queryResult.data.pages.length === 1 &&
    queryResult.data.pages[0].length === 0
  ) {
    // Empty State
    return (
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีแบบสอบถาม</Text>
      </View>
    )
  }
  // Reach end of feed
  return (
    <View className="flex flex-col items-center justify-center py-6">
      <Text className="text-base-text-medium font-heading-semibold">ไม่มีแบบสอบถามเพิ่มเติม</Text>
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
        {data.length === 0 && (
          <View className="flex flex-col items-center justify-center">
            <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีประกาศ</Text>
          </View>
        )}
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
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}
      className={cn('flex-1', props.className)}
    >
      <Animated.View
        style={{ opacity }}
        className="p-4 flex flex-col justify-between min-h-[163px] bg-base-bg-white rounded-2xl border border-base-outline-default"
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
