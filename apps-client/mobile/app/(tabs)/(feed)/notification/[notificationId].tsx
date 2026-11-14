import React, { useEffect } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { produce } from 'immer'
import { ArrowUpRightIcon } from 'lucide-react-native'

import type { NotificationInteraction as NotificationInteractionDto } from '@api/backoffice/app'
import { useTabBarOverlap } from '@app/components/glass-tab-bar'
import { LinkifiedText } from '@app/components/linkified-text'
import { MiniAppInviteInbox } from '@app/components/mini-app/invite-inbox'
import { NotificationInteraction } from '@app/components/notification/interaction'
import {
  NotificationSenderIcon,
  PLATFORM_SENDER_NAME,
} from '@app/components/notification/sender-icon'
import { BackHeader, useHeaderGlass, usePageHeaderInset } from '@app/components/page-header'
import { reactQueryClient } from '@app/libs/api-client'
import { formatNotificationTime } from '@app/libs/format-notification-time'
import type { PushSenderApp } from '@app/utils/branded-push'
import { openLink } from '@app/utils/link'
import { pendingActionFromParams } from '@app/utils/live-activity'
import { pathnameToMiniAppRoute } from '@app/utils/mini-app'

import { infiniteNotificationsQueryOptions } from './index'

const DEFAULT_ACTION_LABEL = {
  MINI_APP: 'ไปยังแอป',
  IN_APP_NAVIGATION: 'ดูรายละเอียด',
  EXTERNAL_BROWSER: 'เปิดลิงก์',
} as const

export default function NotificationDetailPage() {
  const headerGlass = useHeaderGlass()
  const router = useRouter()
  const params = useLocalSearchParams()
  const notificationId = params.notificationId as string
  const headerInset = usePageHeaderInset()
  const tabBarOverlap = useTabBarOverlap()
  // Set by a tray action that has to open the app (it has a confirm dialog or
  // required fields): the id of the interaction action to leave pending. A Live
  // Activity button opens `pple-today://notification/<id>?action=<actionId>`.
  const pendingActionId = pendingActionFromParams(params)
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!notificationId) {
      router.dismissTo('/')
    }
  }, [notificationId, router])
  const notificationDetailQuery = reactQueryClient.useQuery('/notifications/:id', {
    pathParams: { id: notificationId! },
    enabled: !!notificationId,
  })
  useEffect(() => {
    if (notificationDetailQuery.error) {
      console.error(
        'Error fetching notification detail:',
        JSON.stringify(notificationDetailQuery.error)
      )
      router.dismissTo('/notification')
    }
  }, [notificationDetailQuery.error, router])
  const item = notificationDetailQuery.data
  const detailQueryKey = reactQueryClient.getQueryKey('/notifications/:id', {
    pathParams: { id: notificationId! },
  })
  // The answer is recorded: keep the detail and the list in step with it so the
  // summary survives a remount and the "รอตอบกลับ" chip goes away.
  const onResponded = (interaction: NotificationInteractionDto) => {
    queryClient.setQueryData(detailQueryKey, (old: typeof item) =>
      // The api-client types a cached action's `icon` as `undefined`; the DTO's is
      // the allowlist union, which is what the server really sends.
      old ? { ...old, interaction: interaction as typeof old.interaction } : old
    )
    queryClient.setQueryData(infiniteNotificationsQueryOptions.queryKey, (old) =>
      old
        ? produce(old, (draft) => {
            for (const page of draft.pages) {
              for (const n of page.items) {
                if (n.id === notificationId) n.interactionState = interaction.state
              }
            }
          })
        : old
    )
  }
  const onStale = () => {
    queryClient.invalidateQueries({ queryKey: detailQueryKey })
    queryClient.invalidateQueries({ queryKey: infiniteNotificationsQueryOptions.queryKey })
  }
  // A Beta invite is delivered as an ordinary notification carrying the
  // MINI_APP_INVITE marker. Rather than dead-end on the message, we render the
  // same accept/decline inbox shown on the แอป tab inline here, and drop the
  // bottom action button (the inbox has its own accept/decline).
  const isInvite =
    item?.content.link?.type === 'IN_APP_NAVIGATION' &&
    item.content.link.destination.inAppType === 'MINI_APP_INVITE'
  // A notification that names no destination of its own still came from
  // somewhere: an app-sent one falls back to the app itself, which is the only
  // place its message can be acted on. One of PPLE Today's own has no such
  // fallback — the reader is already inside it — and keeps no button at all.
  // The slug is read defensively: an API deployed before it existed sends the
  // sending app without one, and this screen must still render.
  const appRoute = item?.app?.slug ? pathnameToMiniAppRoute(item.app.slug) : null
  const action = item?.content.link
    ? {
        // The sender may leave the button text out; a button must still say
        // where it goes rather than render as a bare arrow.
        label: item.content.actionButtonText || DEFAULT_ACTION_LABEL[item.content.link.type],
        onPress: () => openLink(item.content.link!),
      }
    : appRoute && item?.app
      ? {
          label: `ไปยังแอป ${item.app.name}`,
          onPress: () => router.push(appRoute),
        }
      : undefined
  if (!notificationId) {
    return null
  }
  return (
    <View className="flex-1 flex-col">
      <BackHeader
        glass={headerGlass.glass}
        leading={item && <NotificationSenderTitle app={item.app} />}
        trailing={
          item && (
            <Text
              className="text-sm text-base-text-medium font-heading-regular"
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {formatNotificationTime(item.createdAt)}
            </Text>
          )
        }
      />
      {notificationDetailQuery.isLoading || !item ? (
        <NotificationDetailSkeleton topInset={headerInset} />
      ) : (
        <>
          {/* No flex-grow on the content: grown to the frame, the header and tab bar
              insets would push it past the frame and a short message would scroll. */}
          <ScrollView
            className="flex-1 bg-base-bg-white"
            contentContainerClassName="pt-1 pb-2 flex flex-col gap-3 px-4"
            alwaysBounceVertical={false}
            {...headerGlass.scrollProps}
          >
            <H1 className="text-lg font-heading-semibold">{item.content.header}</H1>
            <LinkifiedText className="text-base-text-medium font-body-regular text-base">
              {item.content.message}
            </LinkifiedText>
            {item.interaction && (
              <NotificationInteraction
                notificationId={notificationId}
                interaction={item.interaction}
                pendingActionId={pendingActionId}
                onResponded={onResponded}
                onStale={onStale}
              />
            )}
            {isInvite && (
              // The inbox owns its own px-4; cancel the ScrollView's so its cards
              // line up with the message above. It renders nothing once every
              // invite has been answered (e.g. accepted on another device).
              <View className="-mx-4">
                <MiniAppInviteInbox />
              </View>
            )}
          </ScrollView>
          {action && !isInvite && (
            // The floating tab bar covers the screen's bottom: end the button
            // above it (the overlap already holds the gap), else keep pb-6.
            <View className="p-4 bg-base-bg-white" style={{ paddingBottom: tabBarOverlap || 24 }}>
              <Button onPress={action.onPress}>
                <Icon icon={ArrowUpRightIcon} />
                <Text>{action.label}</Text>
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  )
}

/** The header's title, beside the back button: who sent the notification. */
function NotificationSenderTitle({ app }: { app?: PushSenderApp }) {
  const { width } = useWindowDimensions()
  return (
    <View className="flex flex-row items-center gap-2">
      <NotificationSenderIcon app={app} size={28} />
      <Text
        className="text-base text-base-text-high font-heading-semibold"
        numberOfLines={1}
        // The native bar is a fixed 44pt and doesn't grow for a custom title.
        maxFontSizeMultiplier={1}
        // A bar item sizes to its content: cap a long name so it leaves room
        // for the back button and the time.
        style={{ maxWidth: width - 200 }}
      >
        {app?.name ?? PLATFORM_SENDER_NAME}
      </Text>
    </View>
  )
}

function NotificationDetailSkeleton({ topInset }: { topInset: number }) {
  return (
    <View
      className="flex-1 pb-2 bg-base-bg-white flex-grow flex flex-col gap-3 px-4"
      style={{ paddingTop: topInset + 4 }}
    >
      <Skeleton className="w-full h-[18px] mt-[10px]" />
      <View>
        <Skeleton className="w-full h-4 mt-2" />
        <Skeleton className="w-full h-4 mt-2" />
        <Skeleton className="w-1/3 h-4 mt-2" />
      </View>
    </View>
  )
}
