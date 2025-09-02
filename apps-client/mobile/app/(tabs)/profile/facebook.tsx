import React, { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { clsx } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1 } from '@pple-today/ui/typography'
import * as RadioGroupPrimitive from '@rn-primitives/radio-group'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import FacebookIcon from '@app/assets/facebook-icon.svg'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { reactQueryClient } from '@app/libs/api-client'
import { useFacebookPagesQuery } from '@app/libs/facebook'

export default function FacebookListProfile() {
  const params = useLocalSearchParams()
  const facebookAccessToken = params.facebookAccessToken as string
  const router = useRouter()
  useEffect(() => {
    if (facebookAccessToken === undefined || Array.isArray(facebookAccessToken)) {
      router.push('/profile')
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
  useEffect(() => {
    if (facebookPagesQuery.error) {
      console.error('Failed to fetch Facebook pages', JSON.stringify(facebookPagesQuery.error))
      toast({ text1: 'Failed to fetch Facebook pages' })
    }
  }, [facebookPagesQuery.error])

  const queryClient = useQueryClient()
  const linkPageMutation = reactQueryClient.useMutation('post', '/facebook/linked-page')
  const [value, setValue] = useState('')
  return (
    <View className="flex-1 flex-col">
      <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.push('/profile')}
          aria-label="กลับ"
        >
          <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
        </Button>
        <View className="flex flex-row gap-2">
          <FacebookIcon size={32} />
          <H1 className="font-anakotmai-bold text-2xl text-base-text-high">จัดการเพจที่ดูแล</H1>
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
          linkPageMutation.mutateAsync(
            { body: { facebookPageId: page.id, facebookPageAccessToken: page.access_token } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({
                  queryKey: reactQueryClient.getQueryKey('get', '/facebook/linked-page'),
                })
                router.push('/profile')
              },
              onError: (error) => {
                console.error('Failed to link Facebook page', JSON.stringify(error))
                toast.error({ text1: 'Failed to link Facebook page' })
              },
            }
          )
        }}
      >
        {facebookPagesQuery.isLoading ? (
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
        ) : facebookPagesQuery.isError ? (
          <View className="flex flex-row justify-center w-full">
            <Text>Error loading Facebook pages</Text>
          </View>
        ) : facebookPagesQuery.data!.length === 0 ? (
          <View className="flex flex-row justify-center w-full">
            <Text className="text-base-text-placeholder">No Facebook pages found</Text>
          </View>
        ) : (
          facebookPagesQuery.data!.map((page) => (
            <FacebookPageRadioItem
              key={page.id}
              value={page.id}
              name={page.name}
              imageUrl={page.picture.data.url}
              disabled={
                availableLinkPagesQuery.isLoading ||
                availableLinkPagesQuery.isError ||
                linkPageMutation.isPending
              }
              available={availableLinkPagesQuery.data?.[page.id] ?? true}
            />
          ))
        )}
      </RadioGroupPrimitive.Root>
    </View>
  )
}

// eslint-disable-next-line import/namespace
interface RadioGroupItemProps extends RadioGroupPrimitive.ItemProps {
  ref?: React.RefObject<RadioGroupPrimitive.ItemRef>
  name: string
  imageUrl: string
  available: boolean
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
        <AvatarImage source={{ uri: props.imageUrl }} />
        <AvatarPPLEFallback />
      </Avatar>
      <View className="flex flex-col">
        <Text className="text-sm text-base-text-high font-noto-medium">{props.name}</Text>
        {!props.available && (
          <Text className="text-sm text-base-text-medium font-anakotmai-light">
            เพจนี้ได้มีการเชื่อมต่อกับ PPLE Today แล้ว
          </Text>
        )}
      </View>
    </RadioGroupPrimitive.Item>
  )
})
