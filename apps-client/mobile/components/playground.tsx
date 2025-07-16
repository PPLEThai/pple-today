import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
import { PlusIcon, SearchIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

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
        <BottomSheetExample />
        <ToggleGroupExample />
        <ProgressExample />
        <SelectExample />
        <FormExample />
        <BadgeExample />
        <ToastExample />
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
      text2: 'This is some something 👋',
    })
  }
  const showErrorToast = () => {
    toast.error({
      type: 'error',
      text1: 'Error',
      text2: 'Something went wrong 😢',
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

function QueryExample() {
  const sampleQuery = useQuery('get', '/:id', {
    pathParams: { id: '123' },
    query: { name: 'John Doe', code: 404 },
    headers: { 'x-custom-header': 'value' },
  })

  const sampleMutation = useMutation('post', '/test-post/:id')

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
                ? JSON.stringify(sampleQuery.data)
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
