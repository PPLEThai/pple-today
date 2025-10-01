import React from 'react'
import { Pressable, PressableProps, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { FormControl, FormItem } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useForm, useStore } from '@tanstack/react-form'
import { MessageSquareHeartIcon, SearchIcon } from 'lucide-react-native'

import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { reactQueryClient } from '@app/libs/api-client'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchForm = useForm({
    defaultValues: {
      query: '',
    },
  })

  const keyword = useStore(searchForm.store, (state) => state.values.query)

  const keywordQuery = reactQueryClient.useQuery(
    '/search/keyword',
    {
      query: { search: keyword },
    },
    {
      enabled: !!searchQuery,
    }
  )

  const RenderKeywordSuggestions = React.useCallback(() => {
    if (keywordQuery.isLoading) {
      return <Text className="p-4">Loading...</Text>
    }

    if (!keywordQuery.data) {
      return null
    }

    const keywords = keywordQuery.data

    return (
      <>
        {keywords
          .filter((k) => k.type === 'USER')
          .map((profile) => (
            <ProfileCard key={profile.id} name={profile.name} profileImage={profile.profileImage} />
          ))}
        {keywords
          .filter((k) => k.type === 'TOPIC')
          .map((topic) => (
            <TopicCard key={topic.id} name={topic.name} />
          ))}
        {keywords
          .filter((k) => k.type === 'QUERY')
          .map((query, index) => (
            <QueryCard key={index} query={query.query} />
          ))}
      </>
    )
  }, [keywordQuery])

  return (
    <View className="pt-safe flex-1 bg-base-white flex flex-col">
      <View className="p-4 pb-2 gap-3">
        {/* Search Header */}
        <View className="flex flex-row items-center gap-2">
          <Icon icon={SearchIcon} size={32} className="text-base-primary-default" />
          <H1 className="text-lg font-semibold text-base-primary-default text-3xl font-heading-semibold">
            ค้นหา
          </H1>
        </View>
        {/* Search Input */}
        <View>
          <searchForm.Field
            name="query"
            listeners={{
              onChangeDebounceMs: 500, // 500ms debounce
              onChange: ({ value }) => {
                setSearchQuery(value)
              },
            }}
          >
            {(field) => (
              <FormItem field={field}>
                <FormControl>
                  <InputGroup>
                    <InputLeftIcon icon={SearchIcon} className="text-base-text-medium" />
                    <Input
                      placeholder="ค้นหา"
                      className="rounded-lg"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                  </InputGroup>
                </FormControl>
              </FormItem>
            )}
          </searchForm.Field>
        </View>
      </View>
      {RenderKeywordSuggestions()}
      <searchForm.Subscribe>
        {(formState) => <View>{<Text>Searching for: {formState.values.query}</Text>}</View>}
      </searchForm.Subscribe>
    </View>
  )
}

interface ProfileProps {
  name: string
  profileImage?: string
}

const ProfileCard = (props: ProfileProps) => {
  return (
    <SearchCard>
      <View className="flex flex-row items-center gap-2 px-4 py-3">
        <Avatar className="size-8" alt={props.name}>
          <AvatarImage
            source={{
              uri: props.profileImage,
            }}
          />
          <AvatarPPLEFallback />
        </Avatar>
        <Text className="font-body-light flex-1 line-clamp-1">{props.name}</Text>
      </View>
    </SearchCard>
  )
}

interface TopicCardProps {
  name: string
}

const TopicCard = (props: TopicCardProps) => {
  return (
    <SearchCard>
      <View className="flex flex-row items-center gap-2 px-4 py-3">
        <View className="h-7 w-7 items-center justify-center">
          <Icon icon={MessageSquareHeartIcon} size={20} className="text-base-primary-default" />
        </View>
        <Text className="font-body-light flex-1 line-clamp-1 mr-3">{props.name}</Text>
      </View>
    </SearchCard>
  )
}

interface QueryCardProps {
  query: string
}

const QueryCard = (props: QueryCardProps) => {
  return (
    <SearchCard>
      <View className="flex flex-row items-center gap-2  px-4 py-3">
        <View className="h-7 w-7 items-center justify-center">
          <Icon icon={SearchIcon} size={20} className="text-base-text-high" />
        </View>
        <Text className="font-body-light flex-1 line-clamp-1 mr-3">{props.query}</Text>
      </View>
    </SearchCard>
  )
}

interface SearchCardProps extends PressableProps {
  children: React.ReactNode
}

const SearchCard = ({ children, ...props }: SearchCardProps) => {
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
      className={cn('flex flex-col items-center relative', props.className)}
    >
      {children}
      <Animated.View
        style={{ opacity }}
        className="absolute top-0 right-0 inset-0 w-full h-full z-[-1] flex-1"
      />
    </Pressable>
  )
}
