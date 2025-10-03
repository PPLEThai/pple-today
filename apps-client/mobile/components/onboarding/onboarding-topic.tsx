import React from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { FormControl, FormItem } from '@pple-today/ui/form'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { ToggleGroup, ToggleGroupItem } from '@pple-today/ui/toggle-group'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod/v4'

import { reactQueryClient } from '@app/libs/api-client'

import { useOnboardingContext } from './onboarding-context'

const formSchema = z.object({
  topics: z.array(z.string()).min(3, 'กรุณาเลือกอย่างน้อย 3 หัวข้อที่สนใจ'),
})

export function OnboardingTopic() {
  const { state, dispatch } = useOnboardingContext()
  const [interestedTopics, setInterestedTopics] = React.useState<string[]>(
    state.topicStepResult?.topics ?? []
  )

  const listTopicQuery = reactQueryClient.useQuery('/topics/list', {})

  const form = useForm({
    defaultValues: {
      topics: interestedTopics,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: (values) => {
      dispatch({
        type: 'setTopicStepResults',
        payload: values.value,
      })
      dispatch({ type: 'next' })
    },
  })

  const handleNext = React.useCallback(() => {
    form.handleSubmit()
  }, [form])

  const handleSkip = React.useCallback(() => {
    dispatch({ type: 'skip' })
  }, [dispatch])

  return (
    <View className="flex-1 justify-between mt-4">
      <ScrollView contentContainerClassName="px-6 pb-6">
        <form.Field name="topics">
          {(field) => (
            <FormItem field={field}>
              <FormControl>
                <ToggleGroup
                  type="multiple"
                  value={interestedTopics}
                  onValueChange={setInterestedTopics}
                  className="flex flex-row gap-2 flex-wrap justify-start"
                >
                  {listTopicQuery.isLoading ? (
                    <TopicSkeleton />
                  ) : listTopicQuery.data ? (
                    listTopicQuery.data.map((tag) => (
                      <ToggleGroupItem key={tag.id} value={tag.id} variant="outline">
                        <Text>{tag.name}</Text>
                      </ToggleGroupItem>
                    ))
                  ) : (
                    <Text>No topics found</Text>
                  )}
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        </form.Field>
      </ScrollView>
      <View className="gap-2 px-6 pb-6 pt-4">
        <form.Subscribe selector={(state) => state.values.topics}>
          {(topics) => (
            <Button onPress={handleNext} disabled={topics.length < 3}>
              <Text>ถัดไป</Text>
            </Button>
          )}
        </form.Subscribe>
        <Button variant="ghost" onPress={handleSkip}>
          <Text>ข้าม</Text>
        </Button>
      </View>
    </View>
  )
}

const TopicSkeleton = () => {
  return (
    <>
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-18" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-18" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-28" />
    </>
  )
}
