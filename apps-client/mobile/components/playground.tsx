import { useEffect, useState } from 'react'
import { View } from 'react-native'

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
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { getItemAsync } from 'expo-secure-store'

import { useMutation, useQuery } from '@app/libs/react-query'

import { AuthPlayground } from './auth-playground'

const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'authAccessToken'

export function Playground() {
  const [token, setToken] = useState<string>('')
  const sampleQuery = useQuery(
    'get',
    '/auth/me',
    {
      pathParams: {},
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
    { enabled: !!token }
  )

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await getItemAsync(AUTH_ACCESS_TOKEN_STORAGE_KEY)
      if (storedToken) {
        setToken(storedToken)
      }
    }
    fetchToken()
  }, [])

  const sampleMutation = useMutation('post', '/test-post/:id')

  return (
    <View className="p-4 flex flex-col gap-4 w-full">
      <View className="flex flex-row items-center justify-between">
        <H1>Playground</H1>
      </View>
      <View className="flex flex-col gap-2">
        <H2>Font</H2>
        <View className="flex flex-row gap-1 items-baseline">
          <Text>สวัสดี</Text>
          <Text className="font-serif">สวัสดี</Text>
          <Text className="font-sans">สวัสดี</Text>
        </View>
      </View>
      <View className="flex flex-col gap-2">
        <H2>Query</H2>
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
      <View className="flex flex-col gap-2">
        <H2>Button</H2>
        <View className="flex flex-row gap-2 flex-wrap">
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
      </View>
      <AuthPlayground />
      <View className="flex flex-col gap-2">
        <H2>Dialog</H2>
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
    </View>
  )
}
