import React from 'react'
import { FlatList, Keyboard, Pressable, View } from 'react-native'

import { FormControl, FormItem } from '@pple-today/ui/form'
import { Text } from '@pple-today/ui/text'
import { useForm } from '@tanstack/react-form'
import { keepPreviousData } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { GetSearchKeywordResponse } from '@api/backoffice/app'
import { useHeaderGlass, usePageHeaderInset } from '@app/components/page-header'
import { QuerySearchCard } from '@app/components/search/query-card'
import { SearchHeader, SearchInput } from '@app/components/search/search-header'
import { SearchNotEntered, SearchNotFound } from '@app/components/search/search-status'
import { TopicSearchCard } from '@app/components/search/topic-card'
import { UserSearchCard } from '@app/components/search/user-card'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

import { useSearchingContext } from './_layout'

export default function SearchPage() {
  const headerGlass = useHeaderGlass()
  const headerInset = usePageHeaderInset()
  const router = useRouter()
  const { state, dispatch } = useSearchingContext()
  const [isFocused, setIsFocused] = React.useState(true)
  const searchForm = useForm({
    defaultValues: {
      query: state.searchQuery,
    },
    onSubmit: ({ value, formApi }) => {
      if (!value.query) return

      formApi.reset()
      dispatch({ type: 'updateQuery', query: value.query })
      router.navigate({
        pathname: '/search/result',
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

  const hasList =
    !keywordQuery.isLoading &&
    !(!isFocused && !state.searchQuery) &&
    !!keywordQuery.data &&
    keywordList.length > 0

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
        {...headerGlass.scrollProps}
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
    <Pressable onPress={Keyboard.dismiss} className="flex-1 bg-base-bg-white">
      <SearchHeader
        glass={headerGlass.glass}
        onBack={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
      >
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
                <SearchInput
                  autoFocus
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onSubmitEditing={searchForm.handleSubmit}
                  onFocus={() => {
                    setIsFocused(true)
                  }}
                  onBlur={() => {
                    setIsFocused(false)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        </searchForm.Field>
      </SearchHeader>
      {/* The list scrolls under the iOS 26 bar; the other states sit below it. */}
      <View className="flex-1" style={{ paddingTop: hasList ? 0 : headerInset }}>
        {RenderKeywordSuggestions()}
      </View>
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
