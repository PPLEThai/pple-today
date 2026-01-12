import { useEffect } from 'react'
import { ScrollView, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import * as Linking from 'expo-linking'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, MapPinnedIcon, VoteIcon } from 'lucide-react-native'

import { ElectionWithCurrentStatus, GetElectionResponse } from '@api/backoffice/app'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { ElectionDetailCard } from '@app/components/election/election-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { reactQueryClient } from '@app/libs/api-client'
import { useAuthMe } from '@app/libs/auth'
import { createImageUrl } from '@app/utils/image'

export default function ElectionDetailPage() {
  const router = useRouter()

  const params = useLocalSearchParams()
  const electionId = params.electionId as string
  useEffect(() => {
    if (!electionId) {
      router.dismissTo('/')
    }
  }, [electionId, router])

  const electionQuery = reactQueryClient.useQuery('/elections/:electionId', {
    pathParams: { electionId: electionId! },
    enabled: !!electionId,
  })
  useEffect(() => {
    if (electionQuery.error) {
      console.error('Error fetching election content:', JSON.stringify(electionQuery.error))
      router.dismissTo('/') // Redirect to election list on error
    }
  }, [electionQuery.error, router])
  if (!electionId) {
    return null
  }
  const election = electionQuery.data
  return (
    <SafeAreaLayout className="flex-1 flex-col bg-base-bg-white">
      <View className="pt-4 pb-2 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      {!election ? (
        <View className="flex flex-col gap-3 px-4">
          <Skeleton className="h-5 mt-2 w-1/2 rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="flex flex-col gap-3 px-4">
            <H1 className="text-xl font-heading-semibold text-base-text-high">{election.name}</H1>
            <ElectionDetailCard election={election} />
            {election.status !== 'RESULT_ANNOUNCE' && election.description && (
              <Text className="text-base font-body-regular text-base-text-high">
                {election.description}
              </Text>
            )}
            <ElectionCandidateList election={election} />
            <ElectionResult election={election} />
          </ScrollView>
          <ElectionAction election={election} />
        </>
      )}
    </SafeAreaLayout>
  )
}

function ElectionAction({ election }: { election: ElectionWithCurrentStatus }) {
  const user = useAuthMe()
  if (
    election.status === 'OPEN_VOTE' &&
    (election.type === 'ONLINE' || election.type === 'HYBRID')
  ) {
    return (
      <View className="p-4">
        <Link disabled={user.data?.isSuspended} href={`/election/${election.id}/vote`} asChild>
          <Button disabled={user.data?.isSuspended}>
            <Icon icon={VoteIcon} size={16} />
            <Text>{election.isVoted ? 'ลงคะแนนใหม่' : 'ลงคะแนน'}</Text>
          </Button>
        </Link>
      </View>
    )
  }
  if (
    election.status === 'NOT_OPENED_VOTE' &&
    (election.type === 'ONSITE' || election.type === 'HYBRID') &&
    election.locationMapUrl
  ) {
    return (
      <View className="p-4">
        <Button
          onPress={() => {
            Linking.openURL(election.locationMapUrl!)
          }}
        >
          <Icon icon={MapPinnedIcon} size={16} />
          <Text>ดูสถานที่</Text>
        </Button>
      </View>
    )
  }
  return null
}

function ElectionCandidateList({ election }: { election: GetElectionResponse }) {
  if (election.status !== 'OPEN_VOTE' || election.candidates.length === 0) return null
  return (
    <View className="py-2">
      <H2 className="text-xs font-heading-semibold text-base-text-high mb-1">
        รายชื่อผู้ลงสมัครเลือกตั้ง
      </H2>
      <View className="flex flex-col">
        {election.candidates.map((candidate) => (
          <View key={candidate.id} className="py-1 px-1 flex flex-row gap-2 items-center">
            {candidate.number !== null && (
              <View className="flex flex-col gap-1 items-center">
                <Text className="text-xs font-heading-semibold text-base-primary-default -mb-1">
                  เบอร์
                </Text>
                <Text className="text-3xl font-heading-bold text-base-primary-default">
                  {candidate.number}
                </Text>
              </View>
            )}
            <Avatar alt="Candidate Profile Image" className="size-10">
              {election.candidates[0].profileImageUrl && (
                <AvatarImage
                  source={{
                    uri: createImageUrl(election.candidates[0].profileImageUrl, {
                      width: 40,
                      height: 40,
                    }),
                  }}
                />
              )}
              <AvatarPPLEFallback />
            </Avatar>
            <Text className="text-base font-body-regular text-base-text-high">
              {candidate.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ElectionResult({ election }: { election: GetElectionResponse }) {
  if (election.status !== 'RESULT_ANNOUNCE') return null
  return (
    <View className="py-2">
      <H2 className="text-xs font-heading-semibold text-base-text-high mb-1">ผลการเลือกตั้ง</H2>
      <View className="flex flex-col gap-3">
        {election.candidates.map((candidate) => (
          <View key={candidate.id} className="py-3 px-1 flex flex-row gap-2 items-center">
            <View className="flex flex-col gap-1 items-center">
              <Text className="text-xs font-heading-semibold text-base-primary-default -mb-1">
                เบอร์
              </Text>
              <Text className="text-3xl font-heading-bold text-base-primary-default">
                {candidate.number}
              </Text>
            </View>
            <Avatar alt="Candidate Profile Image" className="size-10">
              {election.candidates[0].profileImageUrl && (
                <AvatarImage
                  source={{
                    uri: createImageUrl(election.candidates[0].profileImageUrl, {
                      width: 40,
                      height: 40,
                    }),
                  }}
                />
              )}
              <AvatarPPLEFallback />
            </Avatar>
            <Text className="text-base font-body-regular text-base-text-high flex-1">
              {candidate.name}
            </Text>
            <Text className="text-base font-heading-bold text-base-primary-default">
              {candidate.voteScorePercent!}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
