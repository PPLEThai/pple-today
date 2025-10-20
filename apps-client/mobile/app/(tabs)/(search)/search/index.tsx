import React from 'react'
import { FlatList, Keyboard, Pressable, View } from 'react-native'

import { FormControl, FormItem } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { Input, InputGroup, InputLeftIcon } from '@pple-today/ui/input'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import { keepPreviousData } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SearchIcon } from 'lucide-react-native'

import { GetSearchKeywordResponse } from '@api/backoffice/app'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { QuerySearchCard } from '@app/components/search/query-card'
import { SearchNotEntered, SearchNotFound } from '@app/components/search/search-status'
import { TopicSearchCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

import { useSearchingContext } from '../_layout'

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
        pathname: './result',
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
      placeholderData: keepPreviousData,
    }
  )

  const keywords = keywordQuery.data

  const keywordList = React.useMemo(() => {
    if (!keywords) return []
    const items = [...keywords]
    return items.sort((a, b) => getKeywordPriority(b) - getKeywordPriority(a))
  }, [keywords])

  const RenderKeywordSuggestions = () => {
    // State: loading
    if (keywordQuery.isLoading) {
      return (
        <View className="items-center py-6">
          <Spinner />
        </View>
      )
    }

    // State NO focusing and NO query
    if (!isFocused && !state.searchQuery) {
      return <SearchNotEntered />
    }

    // State focusing but NO query --> Show trending / suggestion keywords
    // TODO: Integrate trending / suggestion keywords API
    if (!keywordQuery.data) {
      return (
        <Text className="font-heading-regular text-center w-full p-4 text-base-text-placeholder">
          ยังไม่มีคำค้นหาที่เกี่ยวข้อง
        </Text>
      )
    }

    // State HAVE query
    if (keywordList.length === 0) {
      return <SearchNotFound />
    }

    // Normal condition
    return (
      <FlatList
        data={keywordList}
        renderItem={({ item, index }) => {
          switch (item.type) {
            case 'USER':
              return (
                <UserSearchCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  profileImage={item.profileImage}
                />
              )
            case 'TOPIC':
              return <TopicSearchCard key={item.id} id={item.id} name={item.name} />
            case 'QUERY':
              return <QuerySearchCard key={`query-${index}`} query={item.query} />
            default:
              exhaustiveGuard(item)
          }
        }}
      />
    )
  }

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

function getKeywordPriority(keyword: GetSearchKeywordResponse[number]) {
  switch (keyword.type) {
    case 'USER':
      return 0
    case 'TOPIC':
      return 1
    case 'QUERY':
      return 2
    default:
      exhaustiveGuard(keyword)
  }
}
