import React from 'react'
import { Linking, Platform, Pressable, PressableProps, RefreshControl, View } from 'react-native'
import { AccessToken, LoginManager } from 'react-native-fbsdk-next'
import { ScrollView } from 'react-native-gesture-handler'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Avatar, AvatarFallback, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
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
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1, H2 } from '@pple-today/ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { PermissionStatus, useTrackingPermissions } from 'expo-tracking-transparency'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowLeftToLineIcon,
  CalendarIcon,
  CircleArrowRightIcon,
  CircleUserRoundIcon,
  HandIcon,
  HeartIcon,
  MapPinnedIcon,
  MessageCircleQuestionIcon,
  MessageSquareHeartIcon,
  PencilIcon,
  PlusIcon,
  ScrollTextIcon,
  TicketIcon,
  TrashIcon,
  TriangleAlertIcon,
  TrophyIcon,
} from 'lucide-react-native'

import type { GetUserParticipationResponse } from '@api/backoffice/app'
import FacebookIcon from '@app/assets/facebook-icon.svg'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { environment } from '@app/env'
import { reactQueryClient } from '@app/libs/api-client'
import {
  useAuthMe,
  useDiscoveryQuery,
  useLoginMutation,
  useLogoutMutation,
  useSession,
} from '@app/libs/auth'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { formatDateInterval } from '@app/libs/format-date-interval'

export default function Index() {
  const session = useSession()
  if (session) {
    // User is already logged in
    return <ProfileSetting />
  }
  return <Login />
}

const Login = () => {
  const discoveryQuery = useDiscoveryQuery()
  const loginMutation = useLoginMutation()
  return (
    <SafeAreaLayout>
      <View className="flex flex-col flex-1 items-center justify-center gap-10 bg-base-bg-light">
        <View className="flex flex-col items-center gap-2">
          <View className="w-[100px] h-[100px] flex flex-col items-center justify-center">
            <PPLEIcon />
          </View>
          <H1 className="text-2xl">พรรคประชาชน</H1>
        </View>
        <View className="flex flex-col gap-4 max-w-[279px] w-full">
          <Button
            onPress={() => loginMutation.mutate({ discovery: discoveryQuery.data! })}
            disabled={!discoveryQuery.data || loginMutation.isPending}
          >
            <Text>เข้าสู่ระบบ</Text>
          </Button>
          <Button
            variant="outline"
            onPress={() => loginMutation.mutate({ discovery: discoveryQuery.data! })}
            disabled={!discoveryQuery.data || loginMutation.isPending}
          >
            <Text>สมัครสมาชิก</Text>
          </Button>
        </View>
      </View>
    </SafeAreaLayout>
  )
}

const ProfileSetting = () => {
  const [refreshing, setRefreshing] = React.useState(false)
  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      queryClient.invalidateQueries({ queryKey: reactQueryClient.getQueryKey('/auth/me') })
      queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/facebook/linked-page'),
      })
      await queryClient.resetQueries({ queryKey: reactQueryClient.getQueryKey('/profile/me') })
      setRefreshing(false)
    } catch (error) {
      console.error('Error refreshing feed:', error)
      setRefreshing(false)
    }
  }, [queryClient])

  return (
    <SafeAreaLayout>
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6A13']} // base-primary-default
          />
        }
      >
        <View className="bg-base-bg-white flex flex-col">
          <HeaderSection />
          <View className="p-4 flex flex-col gap-3">
            <ProfileSection />
            {/* <AchievementSection /> */}
            <AddressSection />
            <PointSection />
          </View>
        </View>
        <View className="bg-base-bg-light flex-1 flex flex-col gap-3 px-4 py-2.5">
          <FacebookPageSection />
          <FollowingSection />
          <ParticipationSection />
          {/* <ActivitySection /> */}
          <SettingSection />
        </View>
      </ScrollView>
    </SafeAreaLayout>
  )
}

const HeaderSection = () => {
  return (
    <View className="p-4 flex flex-col gap-1">
      <View className="flex flex-row gap-1 items-center">
        <Icon
          icon={CircleUserRoundIcon}
          size={32}
          className="text-base-primary-default"
          strokeWidth={2}
        />
        <H1 className="text-3xl leading-normal text-base-primary-default font-heading-semibold">
          โปรไฟล์
        </H1>
      </View>
      <Text className="text-base text-base-text-medium font-heading-regular">
        จัดการโปรไฟล์ของคุณ
      </Text>
    </View>
  )
}
const ProfileSection = () => {
  const router = useRouter()
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  const getRoleName = (roles: string[]) => {
    for (const role of roles) {
      switch (role) {
        case 'pple-ad:mp':
          return 'สส.'
        case 'pple-ad:hq':
          return 'ส่วนกลาง'
        case 'pple-ad:province':
          return 'ทีมจังหวัด'
        case 'pple-ad:foundation':
          return 'มูลนิธิ'
        case 'pple-ad:local':
          return 'ทีมท้องถิ่น'
        case 'pple-ad:mpassistant':
          return 'ผู้ช่วย สส.'
        case 'pple-ad:tto':
          return 'ตทอ.'
        case 'official':
          return 'Official'
      }
    }

    return 'ประชาชน'
  }
  const Profile =
    profileQuery.isLoading || !profileQuery.data ? (
      <>
        <View className="rounded-full size-16 bg-base-bg-default" />
        <View className="flex flex-col gap-2 items-start">
          <View className="rounded-full h-6 mt-2 bg-base-bg-default w-[160px]" />
          <View className="rounded-full h-6 bg-base-bg-default w-[80px]" />
        </View>
      </>
    ) : (
      <>
        <Avatar className="size-16" alt={profileQuery.data.name}>
          <AvatarImage source={{ uri: profileQuery.data.profileImage }} />
          <AvatarPPLEFallback />
        </Avatar>
        <View className="flex flex-col gap-2 items-start flex-1">
          <Text className="text-base-text-high font-heading-semibold text-2xl line-clamp-1">
            {profileQuery.data.name}
          </Text>
          <Badge>
            <Text>{getRoleName(profileQuery.data.roles)}</Text>
          </Badge>
        </View>
      </>
    )
  return (
    <View className="flex flex-row justify-between items-center">
      <View className="flex flex-row items-center gap-4 flex-1">{Profile}</View>
      <Button
        size="icon"
        variant="outline"
        className="border-base-outline-default"
        onPress={(e) => {
          router.push('/edit/edit-profile')
        }}
      >
        <Icon icon={PencilIcon} strokeWidth={1} size={20} />
      </Button>
    </View>
  )
}
const AchievementSection = () => {
  return (
    <View className="rounded-xl border border-base-outline-default px-4 py-2 flex flex-col gap-2">
      <View className="flex flex-row gap-2 items-center">
        <Icon icon={TrophyIcon} className="text-base-primary-default" size={24} />
        <H2 className="text-sm text-base-text-high font-heading-semibold">ความสำเร็จของคุณ</H2>
      </View>
      <View className="flex flex-row gap-2 flex-wrap">
        {['Top Donate', 'ประชาชนยอดเยี่ยม', 'ผู้ออกความเห็น', 'นักวิจารณ์', 'Content Master'].map(
          (achievement) => (
            <Badge variant="outline" key={achievement} className="border-base-primary-default">
              <Text className="text-base-primary-default">{achievement}</Text>
            </Badge>
          )
        )}
      </View>
    </View>
  )
}

const AddressSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  if (profileQuery.data && profileQuery.data.address === undefined) {
    return null
  }
  const Address =
    profileQuery.isLoading || profileQuery.data === undefined ? (
      <>
        <View className="rounded-full h-[18px] mt-2.5 w-[60px]" />
        <View className="rounded-full h-[14px] mt-1.5 w-[40px]" />
      </>
    ) : (
      <>
        <Text className="text-lg font-heading-bold text-base-primary-default">
          {profileQuery.data.address!.subDistrict}, {profileQuery.data.address!.district}
        </Text>
        <Text className="text-sm text-base-text-high font-heading-regular">
          {profileQuery.data.address!.province}
        </Text>
      </>
    )
  return (
    <View className="rounded-xl border border-base-outline-default px-4 py-2 flex flex-row gap-2">
      <View className="flex flex-row gap-2 items-center">
        <Icon icon={MapPinnedIcon} className="text-base-primary-default" size={24} />
        <H2 className="text-sm text-base-text-high font-heading-semibold">พื้นที่ของคุณ</H2>
      </View>
      <View className="flex flex-col flex-1 items-end">{Address}</View>
    </View>
  )
}

const PointSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  return (
    <View className="rounded-xl bg-base-primary-default p-2 flex flex-row justify-between items-center">
      <View className="flex flex-col">
        <View className="flex flex-row gap-1 items-center">
          <PPLEIcon width={16} height={16} color="white" />
          <H2 className="text-base-text-invert text-sm font-heading-bold">PPLE Points</H2>
        </View>
        <Text className="text-base-text-invert text-3xl font-heading-bold ios:pt-4 ios:-mb-1">
          {profileQuery.data ? profileQuery.data.point.toLocaleString() : ''}
        </Text>
      </View>
      {/* TODO: active style */}
      <Button
        variant="outline"
        className="bg-base-primary-default border-base-text-invert active:bg-base-primary-medium"
      >
        <Text className="text-base-text-invert group-active:text-base-text-invert">
          ดูประวัติคะแนน
        </Text>
      </Button>
    </View>
  )
}

const FacebookPageSection = () => {
  const linkedPageQuery = reactQueryClient.useQuery('/facebook/linked-page', {})
  const authMe = useAuthMe()
  const user = authMe.data
  if (!user || !(user.roles.includes('pple-ad:hq') || user.roles.includes('pple-ad:mp'))) {
    return null
  }
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center pb-2.5 gap-2 border-b border-base-outline-default">
        <FacebookIcon size={32} />
        <H2 className="text-xl text-base-text-high font-heading-semibold flex-1">
          เพจ Facebook ที่ดูแล
        </H2>
        {linkedPageQuery.data?.linkedFacebookPage ? (
          <UnlinkFacebookPageDialog />
        ) : (
          <View className="h-9" />
        )}
      </View>
      {linkedPageQuery.status !== 'success' ? (
        <View className="bg-base-bg-default h-10 rounded-lg w-full" />
      ) : linkedPageQuery.data.linkedFacebookPage ? (
        <View className="flex flex-row gap-3 items-center">
          <Avatar alt={linkedPageQuery.data.linkedFacebookPage.name} className="size-8">
            <AvatarImage
              source={{ uri: linkedPageQuery.data.linkedFacebookPage.profilePictureUrl }}
            />
            <AvatarFallback />
          </Avatar>
          <Text className="text-base-text-medium text-sm font-heading-semibold flex-1 line-clamp-2">
            {linkedPageQuery.data.linkedFacebookPage.name}
          </Text>
          {/* TODO: linked page status */}
          {/* <Badge>
            <Text>รอการอนุมัติ</Text>
          </Badge> */}
          <Badge variant="success">
            <Text>อนุมัติ</Text>
          </Badge>
        </View>
      ) : (
        <LinkFacebookPageDialog />
      )}
    </View>
  )
}

function LinkFacebookPageDialog() {
  const [permissionStatus, requestPermission] = useTrackingPermissions()
  const [permissionDialogOpen, setPermissionDialogOpen] = React.useState(false)
  const router = useRouter()

  async function loginWithFacebook() {
    try {
      const loginResult = await LoginManager.logInWithPermissions([
        'pages_show_list',
        'pages_read_engagement',
        'pages_read_user_content',
        'pages_manage_metadata',
      ])
      if (loginResult.isCancelled) {
        console.log('User cancelled login')
        // toast({ text1: 'Facebook login is cancelled' })
        return
      }
      const accessTokenResult = await AccessToken.getCurrentAccessToken()
      if (!accessTokenResult || !accessTokenResult.accessToken) {
        console.error('Failed to get facebook access token')
        return
      }
      router.push(`/profile/facebook?facebookAccessToken=${accessTokenResult.accessToken}`)
    } catch (error) {
      console.error('Login Error: ', error)
    }
  }
  function addFacebookPage() {
    if (Platform.OS !== 'ios') {
      loginWithFacebook()
      return
    }
    if (permissionStatus === null) {
      return
    }
    if (permissionStatus.status !== PermissionStatus.GRANTED) {
      setPermissionDialogOpen(true)
      return
    }
    loginWithFacebook()
  }
  /* This dialog should only open on iOS when permission is not granted */
  return (
    <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
      <Button variant="secondary" disabled={permissionStatus === null} onPress={addFacebookPage}>
        <Icon icon={PlusIcon} />
        <Text>เพิ่มเพจที่ดูแล</Text>
      </Button>
      <DialogContent className="gap-6">
        <DialogHeader className="gap-4">
          <Icon icon={TriangleAlertIcon} size={40} strokeWidth={1.5} />
          <DialogTitle>กรุณาอนุญาตการติดตาม</DialogTitle>
          <DialogDescription>
            {
              'เพื่อเชื่อมต่อข้อมูลเพจ Facebook\nกรุณาเปิดใช้งานการติดตามในการตั้งค่า\nความเป็นส่วนตัว'
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onPress={() => setPermissionDialogOpen(false)}>
            <Text>ยกเลิก</Text>
          </Button>
          <Button
            onPress={async () => {
              if (permissionStatus === null) {
                console.warn('permissionStatus is null')
                return
              }
              if (!permissionStatus.granted) {
                if (permissionStatus.canAskAgain) {
                  const { status } = await requestPermission()
                  if (status !== PermissionStatus.GRANTED) {
                    console.log('Permission not granted')
                    toast({ text1: 'Permission not granted' })
                    return
                  }
                  setPermissionDialogOpen(false)
                  // add a delay to wait for dialog to close
                  // otherwise loginWithFacebook will be cancelled
                  setTimeout(() => loginWithFacebook(), 1000)
                  return
                }
                Linking.openSettings()
                return
              }
              setPermissionDialogOpen(false)
              setTimeout(() => loginWithFacebook(), 1000)
            }}
          >
            <Text>ตกลง</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UnlinkFacebookPageDialog() {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = React.useState(false)
  const unlinkPageMutation = reactQueryClient.useMutation('delete', '/facebook/linked-page')
  const queryClient = useQueryClient()
  return (
    <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="ลบเพจ"
          onPress={() => setUnlinkDialogOpen(true)}
        >
          <Icon icon={TrashIcon} className="size-5 text-system-danger-default" strokeWidth={1} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        {/* TODO: content */}
        <DialogHeader>
          <DialogTitle>ยืนยันการลบเพจ</DialogTitle>
        </DialogHeader>
        <DialogDescription>คุณแน่ใจหรือว่าต้องการลบเพจ Facebook นี้?</DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">
              <Text>ยกเลิก</Text>
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={unlinkPageMutation.isPending}
            onPress={() => {
              unlinkPageMutation.mutateAsync(
                {},
                {
                  onSuccess: () => {
                    queryClient.setQueryData(
                      reactQueryClient.getQueryKey('/facebook/linked-page'),
                      { linkedFacebookPage: null }
                    )
                    queryClient.invalidateQueries({
                      queryKey: reactQueryClient.getQueryKey('/facebook/linked-page'),
                    })
                    toast({ text1: 'ลบเพจ Facebook สำเร็จ' })
                    setUnlinkDialogOpen(false)
                  },
                  onError: (error) => {
                    toast({ text1: 'เกิดข้อผิดพลาดบางอย่าง' })
                    console.error('Error removing linked Facebook page', JSON.stringify(error))
                  },
                }
              )
            }}
          >
            <Text>ยืนยันการลบเพจ</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const FollowingSection = () => {
  const router = useRouter()
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={HeartIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-heading-semibold">เนื้อหาที่ติดตาม</H2>
        </View>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onPress={() => {
            router.push('/profile/follow')
          }}
        >
          <Icon icon={PencilIcon} strokeWidth={1} size={20} className="text-base-text-high" />
        </Button>
      </View>
      <View className="flex flex-row items-center justify-between px-1">
        <View className="flex flex-row gap-2 items-center">
          <Icon
            icon={MessageSquareHeartIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-heading-semibold">หัวข้อ</Text>
        </View>
        <Text className="text-base text-base-text-high font-heading-regular">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-heading-semibold">
              {profileQuery.data.numberOfFollowingTopics}
            </Text>
          )}{' '}
          หัวข้อ
        </Text>
      </View>
      <View className="flex flex-row items-center justify-between px-1">
        <View className="flex flex-row gap-2 items-center">
          <Icon
            icon={CircleUserRoundIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-heading-semibold">ผู้คน</Text>
        </View>
        <Text className="text-base text-base-text-high font-heading-regular">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-heading-semibold">
              {profileQuery.data.numberOfFollowing}
            </Text>
          )}{' '}
          คน
        </Text>
      </View>
    </View>
  )
}
const ParticipationSection = () => {
  const participationQuery = reactQueryClient.useQuery('/profile/participation', {})
  if (
    participationQuery.isLoading ||
    !participationQuery.data ||
    participationQuery.data.length === 0
  ) {
    return null
  }
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={HandIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-heading-semibold">การเข้าร่วมของฉัน</H2>
        </View>
      </View>
      {participationQuery.data.map((participation) => (
        <Participation key={participation.feedItemId} participation={participation} />
      ))}
    </View>
  )
}

const Participation = ({
  participation,
}: {
  participation: GetUserParticipationResponse[number]
}) => {
  switch (participation.type) {
    case 'POLL':
      return (
        <View className="flex flex-row items-center justify-between gap-1">
          <View className="flex flex-row gap-3 items-center flex-1">
            <Icon
              icon={MessageCircleQuestionIcon}
              className="text-base-primary-default"
              size={32}
              strokeWidth={2}
            />
            <View className="flex flex-col gap-1 flex-1">
              <Text className="text-sm text-base-text-high font-heading-semibold line-clamp-2">
                {participation.title}
              </Text>
              <Text className="text-xs text-base-text-high font-heading-regular">
                {formatDateInterval(participation.createdAt.toString())}
              </Text>
            </View>
          </View>
          <Button variant="ghost" size="icon">
            <Icon
              icon={CircleArrowRightIcon}
              className="text-base-text-high"
              size={24}
              strokeWidth={1}
            />
          </Button>
        </View>
      )
    // case 'VOTE':
    //   return (
    //     <View className="flex flex-row items-center justify-between gap-1">
    //       <View className="flex flex-row gap-3 items-center flex-1">
    //         <Icon icon={VoteIcon} className="text-base-primary-default" size={32} strokeWidth={2} />
    //         <View className="flex flex-col gap-1 flex-1">
    //           <Text className="text-sm text-base-text-high font-heading-semibold line-clamp-2">
    //             เลือกตั้ง อบจ. ระยอง
    //           </Text>
    //           <View className="flex flex-row gap-1 flex-wrap">
    //             <Badge variant="secondary">
    //               <Text>เลือกตั้งออนไลน์</Text>
    //             </Badge>
    //             <Badge>
    //               <Text>ประกาศผล</Text>
    //             </Badge>
    //           </View>
    //           <Text className="text-xs text-base-text-high font-heading-regular">
    //             2 สัปดาห์ที่แล้ว
    //           </Text>
    //         </View>
    //       </View>
    //       <Button variant="ghost" size="icon">
    //         <Icon
    //           icon={CircleArrowRightIcon}
    //           className="text-base-text-high"
    //           size={24}
    //           strokeWidth={1}
    //         />
    //       </Button>
    //     </View>
    //   )
    default:
      return exhaustiveGuard(participation.type)
  }
}

const ActivitySection = () => {
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={TicketIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-heading-semibold">กิจกรรมของฉัน</H2>
        </View>
      </View>
      <View className="flex flex-row items-center gap-1">
        <View className="flex flex-row gap-3 items-center flex-1">
          {/* TODO: image */}
          <View className="rounded-lg size-12 bg-slate-500" />
          <View className="flex flex-col gap-1 flex-1">
            <Text className="text-sm text-base-text-high font-heading-semibold line-clamp-2">
              Knowledge Center ครั้งที่ 1 – “เอาชีวิตรอดอย่างโปร ปฐมพยาบาล
            </Text>
            <View className="flex flex-row gap-1 items-center">
              <Icon
                icon={CalendarIcon}
                className="text-base-primary-default"
                strokeWidth={1.5}
                size={12}
              />
              <Text className="text-xs text-base-primary-default font-heading-regular">
                อ, 20 พ.ค. - 22 พ.ค. 68
              </Text>
            </View>
          </View>
        </View>
        <Button variant="ghost" size="icon">
          <Icon
            icon={CircleArrowRightIcon}
            className="text-base-text-high"
            size={24}
            strokeWidth={1}
          />
        </Button>
      </View>
    </View>
  )
}
const SettingSection = () => {
  const discoveryQuery = useDiscoveryQuery()
  const session = useSession()
  const logoutMutation = useLogoutMutation()

  return (
    <View className="flex flex-col gap-2">
      <H2 className="text-base text-base-text-high font-heading-semibold">ตั้งค่า</H2>
      {/* <SettingItem>
        <Icon icon={BellIcon} className="text-base-primary-default" strokeWidth={1} size={24} />
        <Text className="text-base text-base-text-high font-heading-regular">การแจ้งเตือน</Text>
      </SettingItem> */}
      {/* TODO: dismiss button inside webview */}
      <SettingItem
        onPress={() =>
          WebBrowser.openBrowserAsync(environment.EXPO_PUBLIC_OIDC_BASE_URL + '/privacy-policy')
        }
      >
        <Icon
          icon={ScrollTextIcon}
          className="text-base-primary-default"
          strokeWidth={1}
          size={24}
        />
        <Text className="text-base text-base-text-high font-heading-regular">
          ข้อกำหนดและเงื่อนไข
        </Text>
      </SettingItem>
      <SettingItem
        onPress={() =>
          logoutMutation.mutate({ session: session!, discovery: discoveryQuery.data! })
        }
        disabled={!session || !discoveryQuery.data || logoutMutation.isPending}
      >
        <Icon
          icon={ArrowLeftToLineIcon}
          className="text-base-primary-default"
          strokeWidth={1}
          size={24}
        />
        <Text className="text-base text-base-text-high font-heading-regular">ออกจากระบบ</Text>
      </SettingItem>
    </View>
  )
}

interface SettingItemProps extends PressableProps {
  children: React.ReactNode
}
const SettingItem = ({ children, ...props }: SettingItemProps) => {
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
      className="disabled:opacity-50"
    >
      <Animated.View
        style={{ opacity }}
        className="flex flex-row gap-2 items-center px-4 py-3 rounded-2xl bg-base-bg-white border border-base-outline-default"
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
