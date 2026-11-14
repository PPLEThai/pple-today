import React, { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1 } from '@pple-today/ui/typography'
import * as RadioGroupPrimitive from '@rn-primitives/radio-group'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, TriangleAlertIcon, UnlinkIcon } from 'lucide-react-native'

import FacebookIcon from '@app/assets/facebook-icon.svg'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { reactQueryClient } from '@app/libs/api-client'
import {
  canManageFacebookPage,
  clearFacebookLogin,
  disconnectFacebook,
  FACEBOOK_MISSING_PERMISSIONS_MESSAGE,
  FacebookLoginCancelledError,
  FacebookMissingPermissionsError,
  FacebookTokenRejectedError,
  getFacebookPageAccessToken,
  useFacebookPagesQuery,
} from '@app/libs/facebook'
import { responseErrorCode } from '@app/libs/notification-interaction'
import { createImageUrl } from '@app/utils/image'

export default function FacebookListPage() {
  const params = useLocalSearchParams()
  const facebookAccessToken = params.facebookAccessToken as string
  const router = useRouter()
  useEffect(() => {
    if (facebookAccessToken === undefined || Array.isArray(facebookAccessToken)) {
      router.back()
      console.error('Invalid Facebook access token')
      toast({ text1: 'Invalid Facebook access token' })
      return
    }
  }, [facebookAccessToken, router])

  const facebookPagesQuery = useFacebookPagesQuery({
    variables: { facebookAccessToken: facebookAccessToken! },
    enabled: !!facebookAccessToken,
  })
  const availableLinkPagesQuery = reactQueryClient.useQuery(
    '/facebook/linked-page/available',
    { query: { pageIds: facebookPagesQuery.data?.map((p) => p.id) || [] } },
    { enabled: !!facebookPagesQuery.data }
  )
  // Set when linking a page fails in a way only a new Facebook login can fix.
  const [linkFailure, setLinkFailure] = useState<ConnectionFailure | null>(null)
  const failure: ConnectionFailure | null =
    linkFailure ??
    (facebookPagesQuery.isError
      ? facebookPagesQuery.error instanceof FacebookTokenRejectedError
        ? 'connection-failed'
        : 'network-error'
      : null)
  useEffect(() => {
    if (facebookPagesQuery.error) {
      console.error('Failed to fetch Facebook pages', JSON.stringify(facebookPagesQuery.error))
    }
  }, [facebookPagesQuery.error])

  // Pages the server refused because the person's role on them is too low.
  // Facebook does not always report roles in the page list, so learn them here.
  const [insufficientRolePageIds, setInsufficientRolePageIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  const queryClient = useQueryClient()
  const linkPageMutation = reactQueryClient.useMutation('post', '/facebook/linked-page')
  const [value, setValue] = useState('')

  const reconnectMutation = useMutation({
    mutationFn: getFacebookPageAccessToken,
    onSuccess: (newAccessToken) => {
      setLinkFailure(null)
      setValue('')
      setInsufficientRolePageIds(new Set())
      if (newAccessToken === facebookAccessToken) {
        // Same token, so the query key does not change: fetch again by hand.
        facebookPagesQuery.refetch()
      } else {
        router.setParams({ facebookAccessToken: newAccessToken })
      }
    },
    onError: (error) => {
      if (error instanceof FacebookLoginCancelledError) return
      if (error instanceof FacebookMissingPermissionsError) {
        setLinkFailure('insufficient-permission')
        return
      }
      console.error('Failed to reconnect Facebook', error)
      toast.error({ text1: 'เชื่อมต่อ Facebook ไม่สำเร็จ', text2: 'กรุณาลองใหม่อีกครั้ง' })
    },
  })

  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectFacebook(facebookAccessToken),
    onSuccess: () => {
      setDisconnectDialogOpen(false)
      toast({ text1: 'ยกเลิกการเชื่อมต่อ Facebook แล้ว' })
      router.back()
    },
    onError: (error) => {
      console.error('Failed to disconnect Facebook', error)
      toast.error({ text1: 'ยกเลิกการเชื่อมต่อไม่สำเร็จ', text2: 'กรุณาลองใหม่อีกครั้ง' })
    },
  })

  if (!facebookAccessToken) {
    return null
  }
  const busy = linkPageMutation.isPending || disconnectMutation.isPending
  return (
    <View className="pt-safe flex-1 flex-col">
      <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="กลับ"
        >
          <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
        </Button>
        <View className="flex flex-row gap-2">
          <FacebookIcon size={32} />
          <H1 className="font-heading-bold text-2xl text-base-text-high">จัดการเพจที่ดูแล</H1>
        </View>
      </View>
      <RadioGroupPrimitive.Root
        className="p-4 flex flex-col"
        value={value}
        onValueChange={(val) => {
          setValue(val)
          if (!facebookPagesQuery.data) {
            return
          }
          const page = facebookPagesQuery.data.find((p) => p.id === val)
          if (!page) {
            return
          }
          linkPageMutation.mutate(
            { body: { facebookPageId: page.id, facebookPageAccessToken: page.access_token } },
            {
              onSuccess: () => {
                queryClient.resetQueries({
                  queryKey: reactQueryClient.getQueryKey('/facebook/linked-page'),
                })
                router.back()
              },
              onError: (error) => {
                console.error('Failed to link Facebook page', JSON.stringify(error))
                setValue('')
                switch (responseErrorCode(error)) {
                  case 'FACEBOOK_INSUFFICIENT_PERMISSION':
                    clearFacebookLogin()
                    setLinkFailure('insufficient-permission')
                    return
                  case 'FACEBOOK_INSUFFICIENT_PAGE_ROLE':
                    setInsufficientRolePageIds((ids) => new Set(ids).add(page.id))
                    toast.error(INSUFFICIENT_PAGE_ROLE_MESSAGE)
                    return
                  case 'FACEBOOK_INVALID_ACCESS_TOKEN':
                  case 'FACEBOOK_API_ERROR':
                  case 'FACEBOOK_INVALID_RESPONSE':
                    clearFacebookLogin()
                    setLinkFailure('connection-failed')
                    return
                  default:
                    toast.error({ text1: 'เชื่อมต่อเพจไม่สำเร็จ', text2: 'กรุณาลองใหม่อีกครั้ง' })
                }
              },
            }
          )
        }}
      >
        {failure ? (
          <ConnectionFailedState
            failure={failure}
            retrying={reconnectMutation.isPending || facebookPagesQuery.isFetching}
            onRetry={() =>
              failure === 'network-error'
                ? facebookPagesQuery.refetch()
                : reconnectMutation.mutate()
            }
          />
        ) : facebookPagesQuery.isLoading ? (
          <>
            <View className="py-2 flex flex-row gap-2 items-center">
              <View className="rounded-full h-8 w-full bg-base-bg-default" />
            </View>
            <View className="py-2 flex flex-row gap-2 items-center">
              <View className="rounded-full h-8 w-full bg-base-bg-default" />
            </View>
            <View className="py-2 flex flex-row gap-2 items-center">
              <View className="rounded-full h-8 w-full bg-base-bg-default" />
            </View>
          </>
        ) : !facebookPagesQuery.data || facebookPagesQuery.data.length === 0 ? (
          <View className="flex flex-row justify-center w-full">
            <Text className="text-base-text-placeholder">
              ไม่พบเพจที่คุณดูแลในบัญชี Facebook นี้
            </Text>
          </View>
        ) : (
          facebookPagesQuery.data.map((page) => {
            const canManage = canManageFacebookPage(page) && !insufficientRolePageIds.has(page.id)
            const available = availableLinkPagesQuery.data?.[page.id] ?? true
            return (
              <FacebookPageRadioItem
                key={page.id}
                value={page.id}
                name={page.name}
                imageUrl={page.picture.data.url}
                disabled={
                  busy ||
                  availableLinkPagesQuery.isLoading ||
                  availableLinkPagesQuery.isError ||
                  !available ||
                  !canManage
                }
                unavailableReason={
                  !canManage
                    ? INSUFFICIENT_PAGE_ROLE_MESSAGE.text1
                    : !available
                      ? 'เพจนี้ได้มีการเชื่อมต่อกับ PPLE Today แล้ว'
                      : undefined
                }
              />
            )
          })
        )}
      </RadioGroupPrimitive.Root>
      {(failure === null || failure === 'insufficient-permission') &&
        !facebookPagesQuery.isLoading && (
          <View className="px-4 pb-safe-offset-4 flex flex-col gap-2">
            <Text className="text-sm text-base-text-medium font-body-regular">
              ไม่พบเพจที่ต้องการ หรือต้องการใช้บัญชี Facebook อื่น?
            </Text>
            <DisconnectFacebookDialog
              open={disconnectDialogOpen}
              onOpenChange={setDisconnectDialogOpen}
              disabled={busy || reconnectMutation.isPending}
              disconnecting={disconnectMutation.isPending}
              onConfirm={() => disconnectMutation.mutate()}
            />
          </View>
        )}
    </View>
  )
}

const INSUFFICIENT_PAGE_ROLE_MESSAGE = {
  text1: 'บทบาทของคุณในเพจนี้ไม่มีสิทธิ์เพียงพอ',
  text2: 'ต้องเป็นผู้มีสิทธิสูงสุดของเพจ',
}

function DisconnectFacebookDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled: boolean
  disconnecting: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline-primary" disabled={props.disabled}>
          <Icon icon={UnlinkIcon} />
          <Text>ยกเลิกการเชื่อมต่อ</Text>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ยกเลิกการเชื่อมต่อ Facebook?</DialogTitle>
          <DialogDescription>
            {
              'PPLE Today จะถูกถอดสิทธิ์ทั้งหมดออกจากบัญชี Facebook นี้ เพื่อให้คุณเริ่มเชื่อมต่อใหม่ด้วยบัญชี เพจ หรือสิทธิ์อื่นได้\n\nหากบัญชี Facebook นี้เคยใช้เชื่อมต่อเพจอื่นกับ PPLE Today ไว้แล้ว เพจเหล่านั้นจะหยุดอัปเดตจนกว่าจะเชื่อมต่อใหม่'
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={props.disconnecting}>
              <Text>ยกเลิก</Text>
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={props.disconnecting} onPress={props.onConfirm}>
            <Text>ยกเลิกการเชื่อมต่อ</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ConnectionFailure = 'connection-failed' | 'network-error' | 'insufficient-permission'

const CONNECTION_FAILURE_COPY: Record<
  ConnectionFailure,
  { title: string; description: string; action: string }
> = {
  'connection-failed': {
    title: 'เชื่อมต่อ Facebook ไม่สำเร็จ',
    description: 'กรุณาเชื่อมต่อ Facebook ใหม่อีกครั้ง',
    action: 'เชื่อมต่อใหม่',
  },
  'network-error': {
    title: 'โหลดรายชื่อเพจไม่สำเร็จ',
    description: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
    action: 'ลองใหม่',
  },
  'insufficient-permission': {
    title: FACEBOOK_MISSING_PERMISSIONS_MESSAGE.text1,
    description:
      'กรุณาเชื่อมต่อใหม่ เลือกเพจที่ต้องการ และอนุญาตสิทธิ์ทั้งหมดที่ PPLE Today ขอ หากหน้าต่าง Facebook ไม่ให้เลือกเพจหรือสิทธิ์ใหม่ ให้กด "ยกเลิกการเชื่อมต่อ" แล้วเริ่มใหม่',
    action: 'เชื่อมต่อใหม่',
  },
}

function ConnectionFailedState(props: {
  failure: ConnectionFailure
  retrying: boolean
  onRetry: () => void
}) {
  const copy = CONNECTION_FAILURE_COPY[props.failure]
  return (
    <View className="py-6 flex flex-col items-center gap-4">
      <Icon
        icon={TriangleAlertIcon}
        size={40}
        strokeWidth={1.5}
        className="text-base-text-medium"
      />
      <View className="flex flex-col items-center gap-1">
        <Text className="text-base text-base-text-high font-heading-semibold text-center">
          {copy.title}
        </Text>
        <Text className="text-sm text-base-text-medium font-body-regular text-center">
          {copy.description}
        </Text>
      </View>
      <Button disabled={props.retrying} onPress={props.onRetry}>
        <Text>{copy.action}</Text>
      </Button>
    </View>
  )
}

// eslint-disable-next-line import/namespace
interface RadioGroupItemProps extends RadioGroupPrimitive.ItemProps {
  ref?: React.RefObject<RadioGroupPrimitive.ItemRef>
  name: string
  imageUrl: string
  unavailableReason?: string
}
// Rerendering avatar causing image to flicker somehow
const FacebookPageRadioItem = React.memo(function FacebookRadioItem({
  className,
  ...props
}: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      className={clsx(
        'py-2 flex flex-row gap-2 items-center',
        props.disabled && 'web:cursor-not-allowed opacity-50'
      )}
      {...props}
    >
      <View className="aspect-square h-4 w-4 rounded-full justify-center items-center border border-primary text-primary">
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <View className="aspect-square h-[9px] w-[9px] native:h-[10] native:w-[10] bg-primary rounded-full" />
        </RadioGroupPrimitive.Indicator>
      </View>
      <Avatar alt={props.name} className="size-8">
        <AvatarImage source={{ uri: createImageUrl(props.imageUrl, { width: 32, height: 32 }) }} />
        <AvatarPPLEFallback />
      </Avatar>
      <View className="flex flex-col">
        <Text className="text-sm text-base-text-high font-body-medium">{props.name}</Text>
        {props.unavailableReason && (
          <Text className="text-sm text-base-text-medium font-heading-regular">
            {props.unavailableReason}
          </Text>
        )}
      </View>
    </RadioGroupPrimitive.Item>
  )
})
