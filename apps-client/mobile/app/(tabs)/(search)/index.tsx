import React from 'react'
import { Keyboard, Pressable, ScrollView, View } from 'react-native'

import { FormControl, FormItem } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import { useRouter } from 'expo-router'
import { SearchIcon } from 'lucide-react-native'

import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { QuerySearchCard } from '@app/components/search/query-card'
import { SearchNotEntered, SearchNotFound } from '@app/components/search/search-status'
import { TopicSearchCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { reactQueryClient } from '@app/libs/api-client'

import { useSearchingContext } from './_layout'

export default function SearchPage() {
  const router = useRouter()
  const { state, dispatch } = useSearchingContext()
  const [isFocused, setIsFocused] = React.useState(false)
  const searchForm = useForm({
    defaultValues: {
      query: state.searchQuery,
    },
    onSubmit: ({ value, formApi }) => {
      if (!value.query) return

      formApi.reset()
      dispatch({ type: 'updateQuery', query: value.query })
      router.navigate({
        pathname: '/result',
        params: { query: value.query },
      })
    },
  })

  const keywordQuery = reactQueryClient.useQuery(
    '/search/keyword',
    {
      query: { search: state.searchQuery },
    },
    {
      enabled: !!state.searchQuery,
    }
  )

  const RenderKeywordSuggestions = React.useCallback(() => {
    // TODO: add spinner
    if (keywordQuery.isLoading) {
      return (
        <Text className="font-heading-regular text-center w-full p-4 text-base-text-placeholder">
          Loading
        </Text>
      )
    }

    if (!isFocused && !state.searchQuery) {
      return <SearchNotEntered />
    }

    //TODO: implement trending / suggestion keywords
    if (!keywordQuery.data) {
      return (
        <Text className="font-heading-regular text-center w-full p-4 text-base-text-placeholder">
          ยังไม่มีคำค้นหาที่เกี่ยวข้อง
        </Text>
      )
    }

    if (keywordQuery.data.length === 0) {
      return <SearchNotFound />
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
              profileImage={profile.profileImage ?? undefined}
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
          <View className="p-4 gap-3">
            {/* Search Header */}
            <View className="flex flex-row items-center gap-2">
              <Icon icon={SearchIcon} size={32} className="text-base-primary-default" />
              <H1 className="text-lg font-semibold text-base-primary-default text-3xl font-heading-semibold">
                ค้นหา
              </H1>
            </View>
            {/* Search Input */}
            <searchForm.Field
              name="query"
              listeners={{
                onChangeDebounceMs: 300,
                onChange: ({ value }) => {
                  dispatch({ type: 'updateQuery', query: value })
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
                        onFocus={() => {
                          setIsFocused(true)
                        }}
                        onBlur={() => {
                          setIsFocused(false)
                        }}
                      />
                    </InputGroup>
                  </FormControl>
                </FormItem>
              )}
            </searchForm.Field>
          </View>
        </View>
        {RenderKeywordSuggestions()}
      </SafeAreaLayout>
    </Pressable>
  )
}
