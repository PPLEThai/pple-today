import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, Text as RNText, TextProps, View } from 'react-native'
import { AccessToken, LoginManager } from 'react-native-fbsdk-next'
import ImageView from 'react-native-image-viewing'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { BottomSheetModal, BottomSheetView } from '@pple-today/ui/bottom-sheet/index'
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
import { FormControl, FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon, InputRightIcon } from '@pple-today/ui/input'
import { Progress } from '@pple-today/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@pple-today/ui/select'
import { Text } from '@pple-today/ui/text'
import { Textarea } from '@pple-today/ui/textarea'
import { toast } from '@pple-today/ui/toast'
import { ToggleGroup, ToggleGroupItem } from '@pple-today/ui/toggle-group'
import { H1, H2 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import dayjs from 'dayjs'
import { useEvent } from 'expo'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { getItemAsync } from 'expo-secure-store'
import { useTrackingPermissions } from 'expo-tracking-transparency'
import { useVideoPlayer, VideoView } from 'expo-video'
import LottieView from 'lottie-react-native'
import { InfoIcon, PlusIcon, SearchIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import { ElectionWithCurrentStatus } from '@api/backoffice/app'
import { reactQueryClient } from '@app/libs/api-client'
import { useFacebookPagesQuery } from '@app/libs/facebook'

import { AuthPlayground } from './auth-playground'
import { AvatarPPLEFallback } from './avatar-pple-fallback'
import { ElectionCard, ElectionStatusBadge } from './election/election-card'
import { MoreOrLess } from './more-or-less'

const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'authAccessToken'

export function Playground() {
  return (
    <ScrollView>
      <View className="p-4 flex flex-col gap-4 w-full">
        <View className="flex flex-row items-center justify-between">
          <H1 className="font-inter-bold">Playground</H1>
        </View>
        <ElectionCardExample />
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Font</H2>
          <View className="flex flex-col gap-1">
            <Text style={{ fontFamily: 'Inter_400Regular' }}>Inter</Text>
            <Text style={{ fontFamily: 'Inter_600SemiBold' }}>Inter</Text>
            <Text style={{ fontFamily: 'Inter_700Bold' }}>Inter</Text>
            <Text className="font-heading-regular">Heading</Text>
            <Text className="font-heading-semibold">Heading</Text>
            <Text className="font-heading-bold">Heading</Text>
            <Text className="font-body-light">Body</Text>
            <Text className="font-body-medium">Body</Text>
          </View>
        </View>
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Typography</H2>
          <View className="flex flex-col gap-1">
            <View className="flex flex-row gap-2 items-center my-4 bg-blue-50 self-start">
              <RNText
                style={{
                  fontFamily: 'NotoSansThai_400Regular',
                  fontSize: 24,
                  // comment lineHeight and marginTop/paddingTop to see original sizing
                  lineHeight: 32,
                  paddingTop: 4,
                  marginTop: -4,
                }}
                className="bg-red-100/50"
                // onLayout={(e) => console.log(e.nativeEvent.layout.height)}
              >
                ไม่รู้ไม่ชี้
              </RNText>
              <Icon icon={InfoIcon} size={32} className="bg-red-100/50" />
            </View>

            <Text className="font-heading-semibold text-4xl">4xl-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-3xl">3xl-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-2xl">2xl-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-xl">xl-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-lg">lg-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-base">base-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-sm">sm-heading ไม่รู้ไม่ชี้</Text>
            <Text className="font-heading-semibold text-xs">xs-heading ไม่รู้ไม่ชี้</Text>

            <Text className="font-body-light text-xl">xl-body ไม่รู้ไม่ชี้</Text>
            <Text className="font-body-light text-lg">lg-body ไม่รู้ไม่ชี้</Text>
            <Text className="font-body-light text-base">base-body ไม่รู้ไม่ชี้</Text>
            <Text className="font-body-light text-sm">sm-body ไม่รู้ไม่ชี้</Text>
            <Text className="font-body-light text-xs">xs-body ไม่รู้ไม่ชี้</Text>
          </View>
        </View>
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Button</H2>
          <ScrollView
            horizontal
            className="-mx-4"
            contentContainerClassName="px-4"
            showsHorizontalScrollIndicator={false}
          >
            <View className="flex flex-row gap-2">
              <View className="flex flex-col gap-2 flex-wrap">
                <Button>
                  <Text>Button</Text>
                </Button>
                <Button variant="secondary">
                  <Text>Button</Text>
                </Button>
                <Button variant="outline">
                  <Text>Button</Text>
                </Button>
                <Button variant="ghost">
                  <Text>Button</Text>
                </Button>
                <Button variant="link">
                  <Text>Button</Text>
                </Button>
                <Button variant="destructive">
                  <Text>Button</Text>
                </Button>
              </View>
              <View className="flex flex-col gap-2 flex-wrap">
                <Button>
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button variant="secondary">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button variant="outline">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button variant="ghost">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button variant="link">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button variant="destructive">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
              </View>
              <View className="flex flex-col gap-2 flex-wrap">
                <Button size="sm">
                  <Text>Button</Text>
                </Button>
                <Button size="sm" variant="secondary">
                  <Text>Button</Text>
                </Button>
                <Button size="sm" variant="outline">
                  <Text>Button</Text>
                </Button>
                <Button size="sm" variant="ghost">
                  <Text>Button</Text>
                </Button>
                <Button size="sm" variant="link">
                  <Text>Button</Text>
                </Button>
                <Button size="sm" variant="destructive">
                  <Text>Button</Text>
                </Button>
              </View>
              <View className="flex flex-col gap-2 flex-wrap">
                <Button size="sm">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="sm" variant="secondary">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="sm" variant="outline">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="sm" variant="ghost">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="sm" variant="link">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="sm" variant="destructive">
                  <Icon icon={PlusIcon} />
                  <Text>Button</Text>
                  <Icon icon={PlusIcon} />
                </Button>
              </View>
              <View className="flex flex-col gap-2 flex-wrap">
                <Button size="icon">
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="icon" variant="secondary">
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="icon" variant="outline">
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="icon" variant="ghost">
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="icon" variant="link">
                  <Icon icon={PlusIcon} />
                </Button>
                <Button size="icon" variant="destructive">
                  <Icon icon={PlusIcon} />
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Input</H2>
          <Input />
          <Input value="test@example.com ทดสอบ" />
          <InputGroup>
            <InputLeftIcon icon={SearchIcon} strokeWidth={1.5} />
            <Input placeholder="Email" />
            <InputRightIcon icon={SearchIcon} strokeWidth={1.5} />
          </InputGroup>
        </View>
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Dialog</H2>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Text>Edit Profile</Text>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you&apos;re done.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>
                    <Text>OK</Text>
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </View>
        <AvatarExample />
        <BottomSheetExample />
        <ToggleGroupExample />
        <ProgressExample />
        <SelectExample />
        <FormExample />
        <BadgeExample />
        <ToastExample />
        <MoreOrLessExample />
        <LightboxExample />
        <OnboardPlayground />
        <LottieExample />
        <VideoExample />
        <QueryExample />
        <AuthPlayground />
        <FacebookSDKExample />
      </View>
    </ScrollView>
  )
}

function BottomSheetExample() {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])

  const snapPoints = useMemo(() => ['25%', '50%'], [])

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Bottom Sheet</H2>
      <Button onPress={handlePresentModalPress} variant="secondary">
        <Text>Present Modal</Text>
      </Button>
      <BottomSheetModal ref={bottomSheetModalRef} snapPoints={snapPoints}>
        <BottomSheetView className="flex-1 items-center p-4">
          <Text className="text-7xl font-bold">Bottom Sheet Component 🎉</Text>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  )
}

const TAGS = [
  'การเมือง',
  'สส',
  'ไฟป่า',
  'สว',
  'เลือกตั้งนายก',
  'เลือกตั้งท้องถิ่น',
  'การศึกษา',
  'เศรษฐกิจ',
  'สังคม',
  'สิ่งแวดล้อม',
]
function ToggleGroupExample() {
  const [value, setValue] = useState<string[]>([TAGS[0]])
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Radio Group</H2>
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={setValue}
        className="flex flex-row gap-2 flex-wrap justify-start"
      >
        {TAGS.map((tag) => (
          <ToggleGroupItem key={tag} value={tag} variant="outline">
            <Text>{tag}</Text>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </View>
  )
}

function ProgressExample() {
  const [progress, setProgress] = useState(30)
  const incrementProgress = () => {
    setProgress((prev) => (prev < 100 ? prev + 10 : 0))
  }
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Progress</H2>
      <Progress value={progress} />
      <Button onPress={incrementProgress} variant="ghost">
        <Text>Increment Progress</Text>
      </Button>
    </View>
  )
}

function SelectExample() {
  const insets = useSafeAreaInsets()
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  }

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Select</H2>
      <Select defaultValue={{ value: 'apple', label: 'Apple' }}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent insets={contentInsets} className="w-[250px]">
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem label="Apple" value="apple" />
            <SelectItem label="Banana" value="banana" />
            <SelectItem label="Blueberry" value="blueberry" />
            <SelectItem label="Grapes" value="grapes" />
            <SelectItem label="Pineapple" value="pineapple" />
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className="w-[250px]" aria-invalid>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
      </Select>
    </View>
  )
}

const formSchema = z.object({
  name: z
    .string()
    .check(z.minLength(1, { error: 'Name is required' }))
    .check(z.maxLength(50, { error: 'Name must be less than 50 characters' })),
  comment: z
    .string()
    .check(z.minLength(1, { error: 'Comment is required' }))
    .check(z.maxLength(100, { error: 'Comment must be less than 100 characters' })),
})
function FormExample() {
  const form = useForm({
    defaultValues: {
      name: '',
      comment: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async (values) => {
      console.log('Form submitted:', values)
      // Simulate a network request
      return new Promise((resolve) => setTimeout(resolve, 2000))
    },
  })
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Form</H2>
      <View className="flex flex-col gap-2">
        <form.Field name="name">
          {(field) => (
            <FormItem field={field}>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Name"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        </form.Field>
      </View>
      <form.Field name="comment">
        {(field) => (
          <FormItem field={field}>
            <FormLabel>Comment</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Comment"
                value={field.state.value}
                onChangeText={field.handleChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => [state.isSubmitting]}>
        {([isSubmitting]) => (
          <Button onPress={form.handleSubmit} disabled={isSubmitting}>
            <Text>Submit</Text>
          </Button>
        )}
      </form.Subscribe>
    </View>
  )
}

function BadgeExample() {
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Badge</H2>
      <View className="flex flex-row gap-2 flex-wrap">
        <Badge variant="default">
          <Text>Default Badge</Text>
        </Badge>
        <Badge variant="secondary">
          <Text>Secondary Badge</Text>
        </Badge>
        <Badge variant="destructive">
          <Text>Destructive Badge</Text>
        </Badge>
        <Badge variant="outline">
          <Text>Outline Badge</Text>
        </Badge>
      </View>
    </View>
  )
}

function ToastExample() {
  const showDefaultToast = () => {
    toast({
      text1: 'Hello',
      icon: InfoIcon,
    })
  }
  const showErrorToast = () => {
    toast.error({
      type: 'error',
      text1: 'Error',
      text2: 'Something went wrong 😢',
      icon: InfoIcon,
    })
  }
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Toast</H2>
      <Button onPress={showDefaultToast}>
        <Text>Show Default Toast</Text>
      </Button>
      <Button onPress={showErrorToast} variant="destructive">
        <Text>Show Error Toast</Text>
      </Button>
    </View>
  )
}

function MoreOrLessExample() {
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">MoreOrLess</H2>
      <MoreOrLess
        numberOfLines={3}
        moreText="อ่านเพิ่มเติม"
        lessText="แสดงน้อยลง"
        animated
        textComponent={TextPost}
        buttonComponent={ButtonTextPost}
      >
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has
        been the industry&apos;s standard dummy text ever since the 1500s, when an unknown printer
        took a galley of type and scrambled it to make a type specimen book. It has survived not
        only five centuries, but also the leap into electronic typesetting, remaining essentially
        unchanged. It was popularised in the 1960s with the release of Letraset sheets containing
        Lorem Ipsum passages, and more recently with desktop publishing software like Aldus
        PageMaker including versions of Lorem.
      </MoreOrLess>
    </View>
  )
}

function TextPost(props: TextProps) {
  return <Text {...props} className="text-base-text-high font-body-light text-base" />
}
function ButtonTextPost(props: TextProps) {
  return <Text {...props} className="text-base-primary-default font-body-light text-base" />
}

const images = [require('@app/assets/post-1.png'), require('@app/assets/banner-2.png')]
function LightboxExample() {
  const [visible, setIsVisible] = useState(false)
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Lightbox</H2>
      <Pressable onPress={() => setIsVisible(true)}>
        <Image
          style={{ width: '100%', aspectRatio: 1 }}
          source={require('@app/assets/post-1.png')}
        />
      </Pressable>
      <ImageView
        images={images}
        imageIndex={0}
        visible={visible}
        onRequestClose={() => setIsVisible(false)}
      />
    </View>
  )
}

// https://github.com/lottie-react-native/lottie-react-native/issues/1182#issuecomment-2696560014
const LottieFile = Platform.select({
  ios: require('../assets/PPLE-Like-Animation.lottie'),
  android: require('../assets/PPLE-Like-Animation.zip'),
})
function LottieExample() {
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Lottie</H2>
      <View className="border border-base-outline-default rounded-2xl w-[100px] h-[100px]">
        <LottieView source={LottieFile} autoPlay loop style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  )
}

const videoSource =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

function VideoExample() {
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true
    // player.play()
  })

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Video</H2>
      <View className="w-full aspect-square">
        <VideoView style={{ width: '100%', height: '100%' }} player={player} allowsFullscreen />
      </View>
      <Button
        onPress={() => {
          if (isPlaying) {
            player.pause()
          } else {
            player.play()
          }
        }}
      >
        <Text>{isPlaying ? 'Pause' : 'Play'}</Text>
      </Button>
    </View>
  )
}

// Settings.initializeSDK()

function FacebookSDKExample() {
  const [facebookAccessToken, setFacebookAccessToken] = useState<string | null>(null)
  const facebookPagesQuery = useFacebookPagesQuery({
    variables: { facebookAccessToken: facebookAccessToken! },
    enabled: !!facebookAccessToken,
  })

  useEffect(() => {
    if (facebookPagesQuery.error) {
      console.error('Error fetching Facebook pages:', JSON.stringify(facebookPagesQuery.error))
    }
  }, [facebookPagesQuery.error])

  const linkPage = reactQueryClient.useMutation('post', '/facebook/linked-page')

  /**
   * NOTE: (iOS)
   * Facebook Login works only with ATTrackingManager enabled
   * https://github.com/facebook/facebook-ios-sdk/issues/2375#issuecomment-2051743845
   * https://github.com/thebergamo/react-native-fbsdk-next#troubleshooting (item 9.)
   */
  const [status, requestPermission] = useTrackingPermissions()
  const requestTracking = useCallback(async () => {
    const { status } = await requestPermission()
    if (status === 'granted') {
      console.log('Yay! I have user permission to track data')
    }
  }, [requestPermission])

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Facebook SDK</H2>
      {Platform.OS === 'ios' && (
        <>
          <Text>Tracking: {JSON.stringify(status, null, 2)}</Text>
          <Button onPress={requestTracking} variant="outline">
            <Text>Ask to track</Text>
          </Button>
        </>
      )}
      <Button
        onPress={() => {
          Linking.openURL(`app-settings:`)
        }}
        variant="ghost"
      >
        <Text>Open Setting</Text>
      </Button>
      <Button
        disabled={Platform.OS === 'ios' && !status?.granted}
        onPress={async () => {
          try {
            const loginResult = await LoginManager.logInWithPermissions([
              'pages_show_list',
              'pages_read_engagement',
              'pages_read_user_content',
              'pages_manage_metadata',
            ])
            if (loginResult.isCancelled) {
              console.log('User cancelled login')
              return
            }
            console.log('Login success: ' + loginResult)
            const accessTokenResult = await AccessToken.getCurrentAccessToken()
            if (!accessTokenResult || !accessTokenResult.accessToken) {
              console.error('Failed to get facebook access token')
              return
            }
            setFacebookAccessToken(accessTokenResult.accessToken)
          } catch (error) {
            console.error('Login Error: ', error)
          }
        }}
      >
        <Text>Login with Facebook</Text>
      </Button>
      <Button
        onPress={async () => {
          const page = facebookPagesQuery.data?.[0]
          console.log('Linking Facebook Page...', page)
          if (!page) {
            return
          }
          try {
            const result = await linkPage.mutateAsync({
              body: {
                facebookPageId: page.id,
                facebookPageAccessToken: page.access_token,
              },
            })
            console.log(result)
          } catch (error) {
            console.error('Error linking Facebook Page: ', JSON.stringify(error))
          }
        }}
        disabled={!facebookPagesQuery.data || facebookPagesQuery.data?.length === 0}
      >
        <Text>Link with PPLE Today</Text>
      </Button>
      <Button
        onPress={() => {
          LoginManager.logOut()
        }}
        variant="secondary"
      >
        <Text>Logout</Text>
      </Button>
      <Text className="line-clamp-1">Token: {facebookAccessToken}</Text>
      <Text>Pages: {JSON.stringify(facebookPagesQuery.data, null, 2)}</Text>
    </View>
  )
}

function QueryExample() {
  const [token, setToken] = useState<string>('')
  const sampleQuery = reactQueryClient.useQuery('/auth/me', {}, { enabled: !!token })

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await getItemAsync(AUTH_ACCESS_TOKEN_STORAGE_KEY)
      if (storedToken) {
        setToken(storedToken)
      }
    }
    fetchToken()
  }, [])

  const sampleMutation = reactQueryClient.useMutation('post', '/facebook/linked-page')

  return (
    <>
      <View className="flex flex-col gap-2">
        <H2 className="font-inter-bold">Query</H2>
        <View className="flex flex-row gap-1 items-baseline">
          <Text>
            Query:{' '}
            {sampleQuery.isLoading
              ? 'Loading...'
              : sampleQuery.data
                ? JSON.stringify(sampleQuery)
                : JSON.stringify(sampleQuery.error)}
          </Text>
        </View>
      </View>
      <View className="flex flex-col gap-2">
        <H2 className="font-inter-bold">Mutation</H2>
        <View className="flex flex-row gap-1 items-baseline">
          <Text>
            Mutation:{' '}
            {sampleMutation.isPending
              ? 'Loading...'
              : sampleMutation.data
                ? JSON.stringify(sampleMutation.data)
                : JSON.stringify(sampleMutation.error)}
          </Text>
        </View>
        <Button
          onPress={() =>
            sampleMutation.mutateAsync({
              body: {
                facebookPageId: '123456789',
                facebookPageAccessToken: 'EAAG...',
              },
            })
          }
        >
          <Text>Trigger Mutation</Text>
        </Button>
      </View>
    </>
  )
}

function AvatarExample() {
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Avatar</H2>
      <View className="flex flex-row gap-1">
        <Avatar className="size-8" alt="NativewindUI Avatar">
          <AvatarImage
            source={{
              uri: 'https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg',
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-16" alt="NativewindUI Avatar">
          <AvatarImage
            source={{
              uri: 'https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg',
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-24" alt="NativewindUI Avatar">
          <AvatarImage
            source={{
              uri: 'https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg',
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-32" alt="NativewindUI Avatar">
          <AvatarImage
            source={{
              uri: 'https://pbs.twimg.com/profile_images/1782428433898708992/1voyv4_A_400x400.jpg',
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
      </View>
      <View className="flex flex-row gap-1">
        <Avatar className="size-8" alt="NativewindUI Avatar">
          <AvatarImage source={{ uri: '' }} />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-16" alt="NativewindUI Avatar">
          <AvatarImage source={{ uri: '' }} />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-24" alt="NativewindUI Avatar">
          <AvatarImage source={{ uri: '' }} />
          <AvatarPPLEFallback />
        </Avatar>
        <Avatar className="size-32" alt="NativewindUI Avatar">
          <AvatarImage source={{ uri: '' }} />
          <AvatarPPLEFallback />
        </Avatar>
      </View>
    </View>
  )
}

function OnboardPlayground() {
  const router = useRouter()
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Onboarding</H2>
      <View className="flex flex-row gap-4 items-baseline">
        <Button onPress={() => router.push('/onboarding')}>
          <Text>Start Onboarding</Text>
        </Button>
      </View>
    </View>
  )
}

const electionDetail: ElectionWithCurrentStatus = {
  id: '1',
  name: 'เลือกตั้งตัวแทนสมาชิกพรรคประจำ อ.เมือง จ.ระยอง',
  description: 'เลือกตั้งตัวแทนสมาชิกพรรคประจำ อ.เมือง จ.ระยอง บลาบลาบลา',
  location: 'อาคารอเนกประสงชุมชนสองพี่น้อง 1,2,3',
  locationMapUrl: 'https://maps.app.goo.gl/3Da9VfiGFiHXeQKLA',
  mode: 'SECURE',
  isCancelled: false,
  encryptionPublicKey: 'some-public-key',
  type: 'ONLINE',
  publishDate: dayjs(new Date()).subtract(2, 'day').toDate(),
  openRegister: dayjs(new Date()).subtract(1, 'day').toDate(),
  closeRegister: dayjs(new Date()).add(1, 'day').toDate(),
  openVoting: dayjs(new Date()).add(2, 'day').toDate(),
  closeVoting: dayjs(new Date()).add(3, 'day').toDate(),
  startResult: dayjs(new Date()).add(4, 'day').toDate(),
  endResult: dayjs(new Date()).add(5, 'day').toDate(),
  createdAt: dayjs(new Date()).toDate(),
  updatedAt: dayjs(new Date()).toDate(),
  status: 'NOT_OPENED_VOTE',
  votePercentage: 0,
  isRegistered: false,
  isVoted: false,
}
function ElectionCardExample() {
  const elections: ElectionWithCurrentStatus[] = [
    // NOT_OPENED_VOTE
    {
      ...electionDetail,
      type: 'ONLINE',
    },
    {
      ...electionDetail,
      type: 'ONSITE',
    },
    // TODO: add canRegister when past publishDate but before openRegister
    // {
    //   ...electionDetail,
    //   type: 'HYBRID',
    //   canRegister: false,
    // },
    {
      ...electionDetail,
      type: 'HYBRID',
    },
    {
      ...electionDetail,
      type: 'HYBRID',
      isRegistered: true,
    },
    // OPEN_VOTE
    {
      ...electionDetail,
      type: 'ONLINE',
      status: 'OPEN_VOTE',
    },
    {
      ...electionDetail,
      type: 'ONSITE',
      status: 'OPEN_VOTE',
    },
    {
      ...electionDetail,
      type: 'HYBRID',
      status: 'OPEN_VOTE',
    },
    {
      ...electionDetail,
      type: 'HYBRID',
      status: 'OPEN_VOTE',
      isVoted: true,
      votePercentage: 45.84,
    },
    // CLOSED_VOTE
    {
      ...electionDetail,
      type: 'ONLINE',
      status: 'CLOSED_VOTE',
    },
    {
      ...electionDetail,
      type: 'ONSITE',
      status: 'CLOSED_VOTE',
    },
    {
      ...electionDetail,
      type: 'HYBRID',
      status: 'CLOSED_VOTE',
    },
    // RESULT_ANNOUNCE
    {
      ...electionDetail,
      type: 'ONLINE',
      status: 'RESULT_ANNOUNCE',
    },
    {
      ...electionDetail,
      type: 'ONSITE',
      status: 'RESULT_ANNOUNCE',
    },
    {
      ...electionDetail,
      type: 'HYBRID',
      status: 'RESULT_ANNOUNCE',
    },
  ]
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Election Card</H2>
      {elections.map((election, index) => (
        <ElectionCard key={index} election={election} />
      ))}
      <View className="flex flex-col gap-2 items-start">
        <ElectionStatusBadge status="NOT_OPENED_VOTE" />
        <ElectionStatusBadge status="OPEN_VOTE" />
        <ElectionStatusBadge status="CLOSED_VOTE" />
        <ElectionStatusBadge status="RESULT_ANNOUNCE" />
      </View>
    </View>
  )
}
