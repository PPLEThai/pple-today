import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, PressableProps, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1, H2 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
  TriangleAlertIcon,
  VoteIcon,
} from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { ElectionCard } from '@app/components/election/election-card'
import { MiniAppInviteInbox, refreshMiniAppLists } from '@app/components/mini-app/invite-inbox'
import { MiniAppIcon } from '@app/components/mini-app/mini-app-icon'
import { MiniAppRow } from '@app/components/mini-app/mini-app-row'
import { PersonRolePickerDialog } from '@app/components/mini-app/role-person-picker'
import { type MiniAppListItem, useMiniAppList } from '@app/components/mini-app/use-mini-app-list'
import {
  TabHeader,
  TabScreenLayout,
  tabTitleBlockClassName,
  useCollapsingTitle,
} from '@app/components/page-header'
import { RefreshControl } from '@app/components/refresh-control'
import { Spinner } from '@app/components/spinner'
import {
  logAppsTabViewed,
  logMiniAppOpen,
  logMiniAppSearchMiss,
  type MiniAppOpenSource,
} from '@app/libs/analytics'
import { reactQueryClient } from '@app/libs/api-client'
import {
  clearAcceptedInvite,
  useJustAcceptedInvite,
  useRecentMiniApps,
  useSectionOpen,
} from '@app/libs/apps-tab-storage'
import { useActiveRole, useSession, useSwitchRoleMutation } from '@app/libs/auth'
import { activePersonLabel } from '@app/utils/active-role'
import {
  RECENTS_LIMIT,
  searchMiniApps,
  selectRecentApps,
  showsDiscoveryTools,
} from '@app/utils/apps-tab'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'

import { useBottomTabOnPress } from '../_layout'

/** How long a search must sit unchanged before a miss is logged, so typing isn't. */
const SEARCH_MISS_DELAY_MS = 1500

export default function OfficialPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const activeRoleQuery = useActiveRole()
  const switchRoleMutation = useSwitchRoleMutation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const activePersonId = activeRoleQuery.data?.activePersonId ?? null
  const eligiblePersons = activeRoleQuery.data?.eligiblePersons ?? []
  const triggerLabel = activeRoleQuery.data ? activePersonLabel(activeRoleQuery.data) : null
  const isSwitchingRole = switchRoleMutation.isPending
  const canSwitchRole = eligiblePersons.length > 1

  const miniAppList = useMiniAppList()
  const { live, beta, draft } = miniAppList.apps
  const discoveryTools = showsDiscoveryTools(live.length)
  const { recents, record: recordRecent } = useRecentMiniApps(activePersonId)

  // Refresh the app list whenever the active person changes, whether from the
  // picker (switch mutation) or the 10s polling interval. Two delegates share a
  // role string, so this has to key on person id.
  useEffect(() => {
    queryClient.resetQueries({
      queryKey: reactQueryClient.getQueryKey('/mini-app'),
    })
  }, [activePersonId, queryClient])

  // A search typed under one role means nothing under the next.
  useEffect(() => {
    setSearchQuery('')
  }, [activePersonId])

  useEffect(() => {
    if (miniAppList.isLoading || !miniAppList.isSuccess) return
    logAppsTabViewed(live.length)
  }, [activePersonId, live.length, miniAppList.isLoading, miniAppList.isSuccess])

  const searchableApps = useMemo(() => [...live, ...beta, ...draft], [live, beta, draft])
  const searchResults = useMemo(
    () => searchMiniApps(searchableApps, searchQuery),
    [searchableApps, searchQuery]
  )
  const isSearching = discoveryTools && searchQuery.trim() !== ''
  // "อยากทำอะไร?" invites searching by task, which only works once apps carry
  // taglines; until then search matches names, so say just that.
  const searchPlaceholder = live.some((app) => app.tagline) ? 'อยากทำอะไร? ค้นหาแอป…' : 'ค้นหาแอป…'

  useEffect(() => {
    if (!isSearching || searchResults.length > 0) return
    const query = searchQuery.trim()
    const timer = setTimeout(() => logMiniAppSearchMiss(query), SEARCH_MISS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isSearching, searchQuery, searchResults.length])

  const openApp = useCallback(
    (app: MiniAppListItem, source: MiniAppOpenSource) => {
      if (app.tier === 'LIVE') recordRecent(app.slug)
      logMiniAppOpen(app.slug, source)
      router.navigate(`/mini-app/${app.slug}`)
    },
    [recordRecent, router]
  )

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

  const collapsing = useCollapsingTitle()
  useBottomTabOnPress(() => {
    scrollViewRef.current?.scrollTo({ y: collapsing.topOffset, animated: true })
  })
  const scrollViewRef = React.useRef<Animated.ScrollView>(null)

  const roleHint = canSwitchRole ? (
    <RoleSwitchHint onPress={() => setPickerOpen(true)} disabled={isSwitchingRole} />
  ) : null

  return (
    <TabScreenLayout>
      <TabHeader
        title="แอป"
        icon={<PPLEIcon width={30} height={26} />}
        collapsing={collapsing}
        right={
          triggerLabel ? (
            <RolePickerTrigger
              label={triggerLabel}
              disabled={isSwitchingRole}
              onPress={() => setPickerOpen(true)}
            />
          ) : undefined
        }
      />
      <Animated.ScrollView
        ref={scrollViewRef}
        {...collapsing.scrollProps}
        className="flex-1"
        contentContainerClassName="bg-base-bg-default flex-grow"
        refreshControl={<RefreshControl onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View className={cn('flex flex-col bg-base-bg-white', tabTitleBlockClassName)}>
          <View className="flex flex-row gap-2 items-center" onLayout={collapsing.onTitleLayout}>
            <PPLEIcon width={35} height={30} />
            <H1 className="text-3xl font-heading-semibold text-base-primary-default">แอป</H1>
          </View>
          <Text className="font-heading-regular text-base-text-medium">
            แอปพลิเคชันจากพรรคประชาชน
          </Text>
          {discoveryTools && !isSwitchingRole && (
            <InputGroup className="mt-3">
              <InputLeftIcon icon={SearchIcon} className="text-base-text-medium" />
              <Input
                placeholder={searchPlaceholder}
                className="rounded-lg"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="ค้นหาแอป"
              />
            </InputGroup>
          )}
        </View>
        <View className="gap-3 py-4 flex-grow">
          {isSwitchingRole ? (
            // While the active role is switching, the list is stale; show a
            // spinner until the role-scoped list reloads.
            <View className="px-4 py-10 items-center justify-center">
              <Spinner />
            </View>
          ) : isSearching ? (
            <SearchResults
              query={searchQuery.trim()}
              results={searchResults}
              onOpen={(app) => openApp(app, 'search')}
              roleHint={roleHint}
            />
          ) : (
            <>
              <MiniAppInviteInbox />
              {discoveryTools && (
                <RecentApps
                  apps={selectRecentApps(recents, live)}
                  onOpen={(app) => openApp(app, 'recents')}
                />
              )}
              <ElectionSection />
              {miniAppList.isLoading ? (
                <MiniAppSkeleton />
              ) : (
                <MiniAppGrid
                  heading={discoveryTools && live.length > 0 ? 'แอปทั้งหมด' : null}
                  apps={live}
                  onOpen={(app) => openApp(app, 'grid')}
                  emptyState={
                    beta.length === 0 && draft.length === 0 ? (
                      <View className="px-4 py-6 items-center gap-3">
                        <Text className="font-heading-regular text-base-text-medium">
                          ยังไม่มีแอปสำหรับบทบาทนี้
                        </Text>
                        {roleHint}
                      </View>
                    ) : null
                  }
                />
              )}
              <TierSection
                section="beta"
                title="แอปทดลองใช้"
                apps={beta}
                onOpen={(app) => openApp(app, 'beta')}
              />
              <TierSection
                section="draft"
                title="แอปฉบับร่าง"
                apps={draft}
                onOpen={(app) => openApp(app, 'draft')}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>
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
    </TabScreenLayout>
  )
}

/**
 * Opens the บทบาท picker, in the header. On iOS 26 the native bar puts it in a
 * glass capsule; elsewhere it is an outlined select.
 */
function RolePickerTrigger(props: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-label="บทบาท"
      disabled={props.disabled}
      onPress={props.onPress}
      className={cn(
        'flex flex-row items-center gap-1.5',
        supportsLiquidGlass
          ? 'h-8 px-1.5'
          : 'h-10 min-w-[120px] justify-between rounded-lg border border-input bg-background px-3',
        props.disabled && 'opacity-50'
      )}
    >
      <Text
        className="text-[0.875rem] font-heading-regular text-base-text-medium"
        maxFontSizeMultiplier={1}
      >
        บทบาท:
      </Text>
      <Text
        className="shrink text-[0.875rem] font-heading-semibold text-foreground"
        numberOfLines={1}
        maxFontSizeMultiplier={1}
      >
        {props.label}
      </Text>
      <Icon icon={ChevronDownIcon} size={16} className="text-foreground" />
    </Pressable>
  )
}

function RoleSwitchHint({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <Button variant="secondary" size="sm" onPress={onPress} disabled={disabled}>
      <Text>ลองเปลี่ยนบทบาท</Text>
    </Button>
  )
}

function SearchResults({
  query,
  results,
  onOpen,
  roleHint,
}: {
  query: string
  results: MiniAppListItem[]
  onOpen: (app: MiniAppListItem) => void
  roleHint: React.ReactNode
}) {
  if (results.length === 0) {
    return (
      <View className="px-4 py-10 items-center gap-3">
        <Text className="font-heading-regular text-base-text-medium text-center">
          ไม่พบแอปที่ตรงกับ ‘{query}’
        </Text>
        {roleHint}
      </View>
    )
  }

  return (
    <View className="px-4 gap-2">
      <Text className="font-heading-semibold text-base-text-medium">
        ผลการค้นหา {results.length} แอป
      </Text>
      <View className="rounded-xl bg-base-bg-white border border-base-outline-default overflow-hidden">
        {results.map((app, index) => (
          <MiniAppRow
            key={app.slug}
            app={app}
            onPress={() => onOpen(app)}
            showDivider={index > 0}
          />
        ))}
      </View>
    </View>
  )
}

function RecentApps({
  apps,
  onOpen,
}: {
  apps: MiniAppListItem[]
  onOpen: (app: MiniAppListItem) => void
}) {
  if (apps.length === 0) return null

  return (
    <View className="px-4 gap-2">
      <H2 className="text-xl font-heading-semibold text-base-text-high">ใช้ล่าสุด</H2>
      {/* A shelf, not a grid row: a card of its own, spread across the width, so
          the repeat of apps also listed below reads as deliberate. */}
      <View className="flex flex-row gap-2 rounded-2xl bg-base-bg-white border border-base-outline-default p-3">
        {apps.map((app) => (
          <Pressable
            key={app.slug}
            accessibilityRole="button"
            aria-label={app.name}
            onPress={() => onOpen(app)}
            className="flex-1 items-center gap-1 active:opacity-50"
          >
            <MiniAppIcon iconUrl={app.iconUrl} name={app.name} slug={app.slug} size="sm" />
            <Text
              numberOfLines={2}
              className="text-xs leading-4 font-heading-regular text-center w-full"
            >
              {app.name}
            </Text>
          </Pressable>
        ))}
        {Array.from({ length: RECENTS_LIMIT - apps.length }, (_, i) => (
          <View key={`filler-${i}`} className="flex-1" />
        ))}
      </View>
    </View>
  )
}

function MiniAppGrid({
  heading,
  apps,
  onOpen,
  emptyState,
}: {
  /** Shown only when recents sit above, to mark where shortcuts end. */
  heading: string | null
  apps: MiniAppListItem[]
  onOpen: (app: MiniAppListItem) => void
  emptyState: React.ReactNode
}) {
  const rows = useMemo(() => {
    const grouped: MiniAppListItem[][] = []
    for (let i = 0; i < apps.length; i += 3) {
      grouped.push(apps.slice(i, i + 3))
    }
    return grouped
  }, [apps])

  if (apps.length === 0) return <>{emptyState}</>

  return (
    <View className="px-4">
      {heading && <H2 className="text-xl font-heading-semibold text-base-text-high">{heading}</H2>}
      <View className="flex flex-col gap-0">
        {rows.map((group, index) => (
          <View key={index} className="flex flex-row gap-0 w-full">
            {group.map((app) => (
              <View key={app.slug} className="flex-1">
                <InfoItem onPress={() => onOpen(app)}>
                  <View className="flex justify-center items-center flex-col">
                    <MiniAppIcon
                      iconUrl={app.iconUrl}
                      name={app.name}
                      slug={app.slug}
                      className="mb-2"
                    />
                    <Text
                      numberOfLines={2}
                      className="text-xs leading-4 font-heading-semibold w-full text-center"
                    >
                      {app.name}
                    </Text>
                  </View>
                </InfoItem>
              </View>
            ))}
            {Array.from({ length: 3 - group.length }, (_, i) => (
              <View key={`filler-${i}`} className="flex-1" />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * Apps that aren't Live yet, grouped by Publication Tier: แอปทดลองใช้ (Beta —
 * the user's own, ones they help build, or ones they were invited to test) and
 * แอปฉบับร่าง (Draft — only builders see these). Collapsed by default so work in
 * progress never crowds the party's apps; the user's choice is remembered. The
 * Beta section opens by itself once right after an invitation is accepted,
 * pointing at the new app, so it never seems to vanish.
 */
function TierSection({
  section,
  title,
  apps,
  onOpen,
}: {
  section: 'beta' | 'draft'
  title: string
  apps: MiniAppListItem[]
  onOpen: (app: MiniAppListItem) => void
}) {
  const preference = useSectionOpen(section)
  const justAccepted = useJustAcceptedInvite()
  const highlighted =
    section === 'beta' && justAccepted && apps.some((app) => app.slug === justAccepted)
      ? justAccepted
      : null

  // The nudge lasts while the user is on this tab; leaving it ends it.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (section === 'beta') clearAcceptedInvite()
      }
    }, [section])
  )

  if (apps.length === 0 || !preference.loaded) return null

  const open = highlighted !== null || preference.open

  return (
    <View className="px-4">
      {/* Header and apps share one card, so they read as one section. */}
      <View className="rounded-xl bg-base-bg-white border border-base-outline-default overflow-hidden">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => {
            if (highlighted) clearAcceptedInvite()
            preference.choose(!open)
          }}
          className="flex flex-row items-center justify-between px-4 py-3 active:opacity-50"
        >
          <View>
            <Text className="font-heading-semibold text-base-text-high">
              {title} ({apps.length})
            </Text>
            {!open && (
              <Text className="text-sm font-heading-regular text-base-text-medium">แตะเพื่อดู</Text>
            )}
          </View>
          <Icon
            icon={open ? ChevronUpIcon : ChevronRightIcon}
            size={20}
            className="text-base-text-medium"
          />
        </Pressable>
        {open &&
          apps.map((app) => (
            <MiniAppRow
              key={app.slug}
              app={app}
              onPress={() => {
                if (highlighted) clearAcceptedInvite()
                onOpen(app)
              }}
              showDivider
              // The heading already names the tier.
              showTierBadge={false}
              highlighted={app.slug === highlighted}
            />
          ))}
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
      // Not flex-1: inside the grid's column cells a zero flex-basis collapses
      // each row to nothing, so the next section draws over the grid.
      className={cn('w-full', props.className)}
    >
      <Animated.View style={{ opacity }} className="px-1 py-2.5 flex flex-col items-center">
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
