import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, PressableProps, ScrollView, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1, H2 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { ChevronDownIcon, TriangleAlertIcon, VoteIcon } from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { ElectionCard } from '@app/components/election/election-card'
import { MiniAppInviteInbox, refreshMiniAppLists } from '@app/components/mini-app/invite-inbox'
import { PersonRolePickerDialog } from '@app/components/mini-app/role-person-picker'
import { MiniAppTierBadge } from '@app/components/mini-app/tier-badge'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'
import { useActiveRole, useSession, useSwitchRoleMutation } from '@app/libs/auth'
import { activePersonLabel } from '@app/utils/active-role'

import { useBottomTabOnPress } from '../_layout'

export default function OfficialPage() {
  const queryClient = useQueryClient()
  const activeRoleQuery = useActiveRole()
  const switchRoleMutation = useSwitchRoleMutation()
  const [pickerOpen, setPickerOpen] = useState(false)

  const activePersonId = activeRoleQuery.data?.activePersonId ?? null
  const eligiblePersons = activeRoleQuery.data?.eligiblePersons ?? []
  const triggerLabel = activeRoleQuery.data ? activePersonLabel(activeRoleQuery.data) : null
  const isSwitchingRole = switchRoleMutation.isPending

  // Refresh the app list whenever the active person changes, whether from the
  // picker (switch mutation) or the 10s polling interval. Two delegates share a
  // role string, so this has to key on person id.
  useEffect(() => {
    queryClient.resetQueries({
      queryKey: reactQueryClient.getQueryKey('/mini-app'),
    })
  }, [activePersonId, queryClient])

  const onConfirmPerson = useCallback(
    async (personId: number | null) => {
      // The dialog stays up until the switch finishes, so a second tap in that
      // gap must not switch บทบาท twice.
      if (isSwitchingRole) return

      if (personId != null && personId !== activePersonId) {
        try {
          await switchRoleMutation.mutateAsync({ pplePersonId: personId })
        } catch {
          toast.error({ text1: 'เปลี่ยนบทบาทไม่สำเร็จ', icon: TriangleAlertIcon })
          return
        }
      }
      setPickerOpen(false)
    },
    [activePersonId, isSwitchingRole, switchRoleMutation]
  )

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/elections'),
      }),
      refreshMiniAppLists(queryClient),
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
            {triggerLabel && (
              <View className="flex flex-row gap-2 items-center">
                <Text className="font-heading-regular text-base-text-medium">บทบาท:</Text>
                <Pressable
                  accessibilityRole="button"
                  aria-label="บทบาท"
                  disabled={isSwitchingRole}
                  onPress={() => setPickerOpen(true)}
                  className={cn(
                    'flex flex-row h-10 min-w-[120px] items-center justify-between rounded-lg border border-input bg-background px-3 py-2',
                    isSwitchingRole && 'opacity-50'
                  )}
                >
                  <Text className="text-[0.875rem] font-heading-regular text-foreground">
                    {triggerLabel}
                  </Text>
                  <Icon icon={ChevronDownIcon} size={16} className="text-foreground" />
                </Pressable>
              </View>
            )}
          </View>
          <Text className="font-heading-regular text-base-text-medium">
            แอปพลิเคชันจากพรรคประชาชน
          </Text>
        </View>
        <View className="gap-3 py-4 flex-1">
          <MiniAppInviteInbox />
          <ElectionSection />
          <MiniAppSection isSwitchingRole={isSwitchingRole} />
        </View>
      </ScrollView>
      {pickerOpen && (
        <PersonRolePickerDialog
          title="เลือกบทบาทที่ต้องการใช้งาน"
          confirmLabel="ยืนยัน"
          eligiblePersons={eligiblePersons}
          preferredPersonId={activePersonId}
          showList={eligiblePersons.length > 1}
          isSubmitting={isSwitchingRole}
          onCancel={() => {
            if (!isSwitchingRole) setPickerOpen(false)
          }}
          onConfirm={onConfirmPerson}
        />
      )}
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

const MiniAppSection = ({ isSwitchingRole }: { isSwitchingRole: boolean }) => {
  const router = useRouter()
  const { data: miniAppData, isLoading } = reactQueryClient.useQuery('/mini-app', { query: {} })
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

  // While the active role is switching, clear the (now stale) app list and show
  // a spinner until the role-scoped list reloads.
  if (isSwitchingRole) {
    return (
      <View className="px-4 py-10 items-center justify-center">
        <Spinner />
      </View>
    )
  }

  if (isLoading) {
    return <MiniAppSkeleton />
  }

  if (!miniAppData || miniAppData.length === 0) {
    return null
  }

  return (
    <View className="px-4">
      <View className="flex flex-col gap-0 mt-4">
        {miniAppGroupByThree.map((group, index) => (
          <View key={index} className="flex flex-row gap-0 w-full">
            {group.map((app) => (
              <View key={app.slug} className="flex-1">
                <InfoItem onPress={() => router.navigate(`/mini-app/${app.slug}`)}>
                  <View className="flex justify-center items-center flex-col">
                    <View className="relative mb-3">
                      <View
                        className={cn(
                          'flex flex-col h-16 w-16 rounded-lg items-center justify-center overflow-hidden border border-base-outline-default',
                          isImageUri(app.iconUrl) ? 'bg-transparent' : 'bg-base-secondary-default'
                        )}
                      >
                        <MiniAppIcon iconUrl={app.iconUrl} />
                      </View>
                      {/* Half the badge's h-6 (24px) sits above the icon's top border. */}
                      <View className="absolute -top-3 left-0 right-0 items-center">
                        <MiniAppTierBadge tier={app.tier} />
                      </View>
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
