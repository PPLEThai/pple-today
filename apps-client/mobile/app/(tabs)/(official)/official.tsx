import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, PressableProps, ScrollView, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import {
  Option,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pple-today/ui/select'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { VoteIcon } from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { ElectionCard } from '@app/components/election/election-card'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import { getRoleName } from '@app/utils/get-role-name'

import { useBottomTabOnPress } from '../_layout'

const ALL_ROLES_OPTION: Option = { value: '', label: 'ทั้งหมด' }

export default function OfficialPage() {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<Option | undefined>(ALL_ROLES_OPTION)
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/elections'),
      }),
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/mini-app'),
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
        className="flex-1"
        contentContainerClassName="bg-base-bg-default flex-grow"
        refreshControl={<RefreshControl onRefresh={onRefresh} />}
      >
        <View className="flex flex-col p-4 bg-base-bg-white">
          <View className="flex flex-row gap-2 items-center justify-between">
            <View className="flex flex-row gap-2 items-center">
              <PPLEIcon width={35} height={30} />
              <H1 className="text-3xl font-heading-semibold text-base-primary-default">แอป</H1>
            </View>
            {profileQuery.data && profileQuery.data.roles.length > 0 && (
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem label="ทั้งหมด" value="" />
                  {profileQuery.data.roles.map((role) => (
                    <SelectItem key={role} label={getRoleName([role])} value={role} />
                  ))}
                </SelectContent>
              </Select>
            )}
          </View>
          <Text className="font-heading-regular text-base-text-medium">
            แอปพลิเคชันจากพรรคประชาชน
          </Text>
        </View>
        <View className="gap-3 py-4 flex-1">
          <ElectionSection />
          <MiniAppSection selectedRole={selectedRole} />
        </View>
      </ScrollView>
    </SafeAreaLayout>
  )
}

const ElectionSection = () => {
  const session = useSession()
  const electionsQuery = reactQueryClient.useQuery(
    '/elections',
    { query: { in: 'OFFICIAL' } },
    { enabled: !!session }
  )
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
            <SlideItem key={election.id} className="flex flex-row items-stretch">
              <ElectionCard election={election} />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}

const MiniAppSection = ({ selectedRole }: { selectedRole: Option | undefined }) => {
  const router = useRouter()
  const { data: miniAppData, isLoading } = reactQueryClient.useQuery('/mini-app', {
    query: selectedRole?.value ? { role: selectedRole.value } : {},
  })

  const miniAppGroupByThree = useMemo(() => {
    if (!miniAppData) {
      return []
    }

    const grouped: (typeof miniAppData)[] = []
    for (let i = 0; i < miniAppData.length; i += 3) {
      grouped.push(miniAppData.slice(i, i + 3))
    }

    return grouped
  }, [miniAppData])

  if (isLoading) {
    return <MiniAppSkeleton />
  }

  if (!miniAppData || miniAppData.length === 0) {
    return null
  }

  return (
    <View className="px-4">
      <View className="flex flex-col gap-4 mt-4">
        {miniAppGroupByThree.map((group, index) => (
          <View key={index} className="flex flex-row gap-4 w-full">
            {group.map((app) => (
              <View key={app.slug} className="flex-1">
                <InfoItem onPress={() => router.navigate(`/mini-app/${app.slug}`)}>
                  <View className="flex justify-center items-center flex-col">
                    <View
                      className={cn(
                        'flex flex-col mb-3 h-16 w-16 rounded-lg items-center justify-center overflow-hidden border border-base-outline-default',
                        isImageUri(app.iconUrl) ? 'bg-transparent' : 'bg-base-secondary-default'
                      )}
                    >
                      <MiniAppIcon iconUrl={app.iconUrl} />
                    </View>
                    <Text
                      numberOfLines={2}
                      className="text-xs font-heading-semibold w-full text-center"
                    >
                      {app.name}
                    </Text>
                  </View>
                </InfoItem>
              </View>
            ))}

            {group.length === 1 && (
              <>
                <View className="flex-1" />
                <View className="flex-1" />
              </>
            )}
            {group.length === 2 && <View className="flex-1" />}
          </View>
        ))}
      </View>
    </View>
  )
}

interface InfoItemProps extends PressableProps {
  children: React.ReactNode
}

function isImageUri(url: string | null): url is string {
  if (!url) return false
  return url.startsWith('https://') || url.startsWith('data:image/')
}

function MiniAppIcon({ iconUrl }: { iconUrl: string | null }) {
  if (isImageUri(iconUrl)) {
    return <Image source={{ uri: iconUrl }} contentFit="contain" className="w-16 h-16" />
  }
  return <Icon icon={PPLEIcon} width={32} height={32} className="text-primary" />
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
      <Animated.View style={{ opacity }} className="p-4 flex flex-col items-center">
        {children}
      </Animated.View>
    </Pressable>
  )
}

function MiniAppItemSkeleton() {
  return (
    <View className="flex-1 p-4 flex justify-center items-center flex-col">
      <Skeleton className="mb-3 h-16 w-16 rounded-lg bg-base-bg-white" />
      <Skeleton className="h-3 w-12 rounded bg-base-bg-white" />
    </View>
  )
}

function MiniAppSkeleton() {
  return (
    <View className="px-4">
      <View className="flex flex-col gap-4">
        <View className="flex flex-row gap-4 w-full">
          <MiniAppItemSkeleton />
          <View className="flex-1" />
          <View className="flex-1" />
        </View>
      </View>
    </View>
  )
}
