import { Pressable, PressableProps, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { Image } from 'expo-image'
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
  ScrollTextIcon,
  TicketIcon,
  TrophyIcon,
  VoteIcon,
} from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { environment } from '@app/env'
import { reactQueryClient } from '@app/libs/api-client'
import {
  useDiscoveryQuery,
  useLoginMutation,
  useLogoutMutation,
  useSessionQuery,
} from '@app/libs/auth'

export default function Index() {
  const sessionQuery = useSessionQuery()
  if (sessionQuery.data) {
    // User is already logged in
    return <ProfileSetting />
  }
  return <Login />
}

const Login = () => {
  const discoveryQuery = useDiscoveryQuery()
  const loginMutation = useLoginMutation()
  return (
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
  )
}

const ProfileSetting = () => {
  return (
    <ScrollView className="flex-1" contentContainerClassName="flex-grow">
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
        {/* TODO: สส connect facebook */}
        <FollowingSection />
        {/* <ParticipationSection /> */}
        {/* <ActivitySection /> */}
        <SettingSection />
      </View>
    </ScrollView>
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
        <H1 className="text-3xl leading-normal text-base-primary-default font-anakotmai-medium">
          โปรไฟล์
        </H1>
      </View>
      <Text className="text-base text-base-text-medium font-anakotmai-light">
        จัดการโปรไฟล์ของคุณ
      </Text>
    </View>
  )
}
const ProfileSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  const Profile =
    profileQuery.isLoading || !profileQuery.data ? (
      <>
        <View className="rounded-full size-16 bg-base-bg-default" />
        <View className="flex flex-col gap-2 items-start">
          <View className="rounded-full h-6 mt-2 bg-base-bg-default w-[120px]" />
        </View>
      </>
    ) : (
      <>
        {/* TODO: Avatar */}
        <View className="rounded-full size-16 bg-base-bg-default overflow-hidden">
          <Image source={{ uri: profileQuery.data.profileImage }} className="w-full h-full" />
        </View>
        <View className="flex flex-col gap-2 items-start">
          <Text className="text-base-text-high font-anakotmai-medium text-2xl">
            {profileQuery.data.name}
          </Text>
          {/* TODO: สส, user: hidden */}
          {profileQuery.data.role === 'REPRESENTATIVE' && (
            <Badge>
              <Text>สมาชิกสส.พรรคประชาชน</Text>
            </Badge>
          )}
        </View>
      </>
    )
  return (
    <View className="flex flex-row justify-between items-center">
      <View className="flex flex-row items-center gap-4">{Profile}</View>
      <Button size="icon" variant="outline" className="border-base-outline-default">
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
        <H2 className="text-sm text-base-text-high font-anakotmai-medium">ความสำเร็จของคุณ</H2>
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
        <Text className="text-lg font-anakotmai-bold text-base-primary-default">
          {profileQuery.data.address!.subDistrict}, {profileQuery.data.address!.district}
        </Text>
        <Text className="text-sm text-base-text-high font-anakotmai-light">
          {profileQuery.data.address!.province}
        </Text>
      </>
    )
  return (
    <View className="rounded-xl border border-base-outline-default px-4 py-2 flex flex-row gap-2">
      <View className="flex flex-row gap-2 items-center">
        <Icon icon={MapPinnedIcon} className="text-base-primary-default" size={24} />
        <H2 className="text-sm text-base-text-high font-anakotmai-medium">พื้นที่ของคุณ</H2>
      </View>
      <View className="flex flex-col flex-1 items-end">{Address}</View>
    </View>
  )
}

const PointSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  if (profileQuery.isLoading || !profileQuery.data) {
    return <View className="rounded-xl bg-base-primary-default h-[72px]" />
  }
  return (
    <View className="rounded-xl bg-base-primary-default p-2 flex flex-row justify-between items-center">
      <View className="flex flex-col">
        <View className="flex flex-row gap-1 items-center">
          <PPLEIcon width={16} height={16} color="white" />
          <H2 className="text-base-text-invert text-sm font-anakotmai-bold">PPLE Points</H2>
        </View>
        <Text className="text-base-text-invert text-3xl font-anakotmai-bold">
          {profileQuery.data.point.toLocaleString()}
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

const FollowingSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={HeartIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-anakotmai-medium">เนื้อหาที่ติดตาม</H2>
        </View>
        <Button variant="ghost" size="icon" className="size-9">
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
          <Text className="text-base text-base-text-high font-anakotmai-medium">หัวข้อ</Text>
        </View>
        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
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
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
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
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={HandIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-anakotmai-medium">การเข้าร่วมของฉัน</H2>
        </View>
      </View>
      <View className="flex flex-row items-center justify-between gap-1">
        <View className="flex flex-row gap-3 items-center flex-1">
          <Icon
            icon={MessageCircleQuestionIcon}
            className="text-base-primary-default"
            size={32}
            strokeWidth={2}
          />
          <View className="flex flex-col gap-1 flex-1">
            <Text className="text-sm text-base-text-high font-anakotmai-medium line-clamp-2">
              คุณคิดว่าปัญหาที่สำคัญที่สุด ของประเทศไทยคืออะไร?
            </Text>
            <Text className="text-xs text-base-text-high font-anakotmai-light">
              2 สัปดาห์ที่แล้ว
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
      <View className="flex flex-row items-center justify-between gap-1">
        <View className="flex flex-row gap-3 items-center flex-1">
          <Icon icon={VoteIcon} className="text-base-primary-default" size={32} strokeWidth={2} />
          <View className="flex flex-col gap-1 flex-1">
            <Text className="text-sm text-base-text-high font-anakotmai-medium line-clamp-2">
              เลือกตั้ง อบจ. ระยอง
            </Text>
            <View className="flex flex-row gap-1 flex-wrap">
              <Badge variant="secondary">
                <Text>เลือกตั้งออนไลน์</Text>
              </Badge>
              <Badge>
                <Text>ประกาศผล</Text>
              </Badge>
            </View>
            <Text className="text-xs text-base-text-high font-anakotmai-light">
              2 สัปดาห์ที่แล้ว
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
    </View>
  )
}
const ActivitySection = () => {
  return (
    <View className="flex flex-col gap-3 border border-base-outline-default rounded-xl py-3 px-4 bg-base-bg-white">
      <View className="flex flex-row items-center justify-between pb-2 border-b border-base-outline-default">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={TicketIcon} className="text-base-primary-default" size={32} />
          <H2 className="text-xl text-base-text-high font-anakotmai-medium">กิจกรรมของฉัน</H2>
        </View>
      </View>
      <View className="flex flex-row items-center gap-1">
        <View className="flex flex-row gap-3 items-center flex-1">
          {/* TODO: image */}
          <View className="rounded-lg size-12 bg-slate-500" />
          <View className="flex flex-col gap-1 flex-1">
            <Text className="text-sm text-base-text-high font-anakotmai-medium line-clamp-2">
              Knowledge Center ครั้งที่ 1 – “เอาชีวิตรอดอย่างโปร ปฐมพยาบาล
            </Text>
            <View className="flex flex-row gap-1 items-center">
              <Icon
                icon={CalendarIcon}
                className="text-base-primary-default"
                strokeWidth={1.5}
                size={12}
              />
              <Text className="text-xs text-base-primary-default font-anakotmai-light">
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
  const sessionQuery = useSessionQuery()
  const logoutMutation = useLogoutMutation()

  return (
    <View className="flex flex-col gap-2">
      <H2 className="text-base text-base-text-high font-anakotmai-medium">ตั้งค่า</H2>
      {/* <SettingItem>
        <Icon icon={BellIcon} className="text-base-primary-default" strokeWidth={1} size={24} />
        <Text className="text-base text-base-text-high font-anakotmai-light">การแจ้งเตือน</Text>
      </SettingItem> */}
      {/* TODO: active state */}
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
        <Text className="text-base text-base-text-high font-anakotmai-light">
          ข้อกำหนดและเงื่อนไข
        </Text>
      </SettingItem>
      <SettingItem
        onPress={() =>
          logoutMutation.mutate({ session: sessionQuery.data!, discovery: discoveryQuery.data! })
        }
        disabled={!sessionQuery.data || !discoveryQuery.data || logoutMutation.isPending}
      >
        <Icon
          icon={ArrowLeftToLineIcon}
          className="text-base-primary-default"
          strokeWidth={1}
          size={24}
        />
        <Text className="text-base text-base-text-high font-anakotmai-light">ออกจากระบบ</Text>
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
