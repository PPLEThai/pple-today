import React from 'react'
import { Keyboard, Pressable, ScrollView, View } from 'react-native'

import { FormControl, FormItem } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { H1 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import { useRouter } from 'expo-router'
import { SearchIcon } from 'lucide-react-native'

import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { QuerySearchCard } from '@app/components/search/query-card'
import { TopicSearchCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { reactQueryClient } from '@app/libs/api-client'

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchForm = useForm({
    defaultValues: {
      query: '',
    },
    onSubmit: () => {
      router.navigate({
        pathname: '/result',
        params: { query: searchQuery },
      })
    },
  })

  const keywordQuery = reactQueryClient.useQuery(
    '/search/keyword',
    {
      query: { search: searchQuery },
    },
    {
      enabled: !!searchQuery,
    }
  )

  const RenderKeywordSuggestions = React.useCallback(() => {
    if (keywordQuery.isLoading || !keywordQuery.data) {
      return null
    }

    if (keywordQuery.data.length === 0) {
      return null
    }

    const keywords = keywordQuery.data

    return (
      <ScrollView className="h-full" contentContainerClassName="pb-32">
        {keywords
          .filter((k) => k.type === 'USER')
          .map((profile) => (
            <UserSearchCard
              key={profile.id}
              id={profile.id}
              name={profile.name}
              profileImage={profile.profileImage}
            />
          ))}
        {keywords
          .filter((k) => k.type === 'TOPIC')
          .map((topic) => (
            <TopicSearchCard key={topic.id} id={topic.id} name={topic.name} />
          ))}
        {keywords
          .filter((k) => k.type === 'QUERY')
          .map((query, index) => (
            <QuerySearchCard key={index} query={query.query} />
          ))}
      </ScrollView>
    )
  }, [keywordQuery])

  return (
    <Pressable onPress={Keyboard.dismiss} className="flex-1">
      <SafeAreaLayout>
        <View className="flex flex-col">
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
                  onChangeDebounceMs: 500,
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
                          returnKeyType="search"
                          onSubmitEditing={searchForm.handleSubmit}
                        />
                      </InputGroup>
                    </FormControl>
                  </FormItem>
                )}
              </searchForm.Field>
            </View>
          </View>
          {RenderKeywordSuggestions()}
        </View>
      </SafeAreaLayout>
    </Pressable>
  )
}
