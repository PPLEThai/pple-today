import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'

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
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon, InputRightIcon } from '@pple-today/ui/input'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { ToggleGroup, ToggleGroupItem } from '@pple-today/ui/toggle-group'
import { H1, H2 } from '@pple-today/ui/typography'
import { PlusIcon, SearchIcon } from 'lucide-react-native'

import { useMutation, useQuery } from '@app/libs/react-query'

import { AuthPlayground } from './auth-playground'

export function Playground() {
  return (
    <ScrollView>
      <View className="p-4 flex flex-col gap-4 w-full">
        <View className="flex flex-row items-center justify-between">
          <H1 className="font-inter-bold">Playground</H1>
        </View>
        <View className="flex flex-col gap-2">
          <H2 className="font-inter-bold">Font</H2>
          <View className="flex flex-col gap-1">
            <Text style={{ fontFamily: 'Inter_300Light' }}>Inter</Text>
            <Text style={{ fontFamily: 'Inter_500Medium' }}>Inter</Text>
            <Text style={{ fontFamily: 'Inter_700Bold' }}>Inter</Text>
            <Text className="font-anakotmai-light">Anakotmai</Text>
            <Text className="font-anakotmai-medium">Anakotmai</Text>
            <Text className="font-anakotmai-bold">Anakotmai</Text>
            <Text className="font-noto-light">NotoSansThaiLooped</Text>
            <Text className="font-noto-medium">NotoSansThaiLooped</Text>
            <Text className="font-noto-bold">NotoSansThaiLooped</Text>
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
          <View className="flex flex-row gap-2 flex-wrap">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
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
        </View>
        <BottomSheetExample />
        <ToggleGroupExample />
        <ProgressExample />
        <QueryExample />
        <AuthPlayground />
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
      <H2 className="font-inter-bold">BottomSheet</H2>
      <Button onPress={handlePresentModalPress}>
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
  const [value, setValue] = useState<string[]>([])
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
      <Button onPress={incrementProgress}>
        <Text>Increment Progress</Text>
      </Button>
    </View>
  )
}

function QueryExample() {
  const sampleQuery = useQuery('get', '/:id', {
    pathParams: { id: '123' },
    query: { name: 'John Doe', code: 404 },
    headers: { 'x-custom-header': 'value' },
  })

  const sampleMutation = useMutation('post', '/test-post/:id')

  return (
    <>
      {' '}
      <View className="flex flex-col gap-2">
        <H2>Query</H2>
        <View className="flex flex-row gap-1 items-baseline">
          <Text>
            Query:{' '}
            {sampleQuery.isLoading
              ? 'Loading...'
              : sampleQuery.data
                ? JSON.stringify(sampleQuery.data)
                : JSON.stringify(sampleQuery.error)}
          </Text>
        </View>
      </View>
      <View className="flex flex-col gap-2">
        <H2>Mutation</H2>
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
              pathParams: { id: '123' },
              body: { name: 'John Doe', code: 404 },
              query: { code: 200, name: 'John Doe' },
              headers: { 'x-custom-header': 'value' },
            })
          }
        >
          <Text>Trigger Mutation</Text>
        </Button>
      </View>
    </>
  )
}
