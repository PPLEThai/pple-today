import React, { createContext, useEffect } from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, TriangleAlertIcon } from 'lucide-react-native'

import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'

export default function ElectionVotePage() {
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

  if (!electionId) {
    return null
  }
  if (electionQuery.isLoading || !electionQuery.data) {
    // TODO: skeleton
    return null
  }
  return <ElectionSteps />
}

interface ElectionLocation {
  latitude: number
  longitude: number
}
interface ElectionFaceVerification {
  faceImageFile: File
}

interface ElectionState {
  step: 'location' | 'faceVerification' | 'vote'
  locationStepResult: ElectionLocation | null
  faceVerificationStepResult: ElectionFaceVerification | null
}

export type ElectionAction =
  | {
      type: 'setLocation'
      payload: ElectionLocation
    }
  | {
      type: 'setFaceVerification'
      payload: ElectionFaceVerification
    }

const ElectionInitialState: ElectionState = {
  step: 'location',
  locationStepResult: null,
  faceVerificationStepResult: null,
}

function ElectionReducer(s: ElectionState, a: ElectionAction): ElectionState {
  const next = { ...s }

  switch (a.type) {
    case 'setLocation': {
      next.locationStepResult = a.payload
      next.step = 'faceVerification'
      break
    }
    case 'setFaceVerification': {
      next.faceVerificationStepResult = a.payload
      next.step = 'vote'
      break
    }
  }
  return next
}

interface ElectionContextValue {
  state: ElectionState
  dispatch: React.Dispatch<ElectionAction>
}

const ElectionContext = createContext<ElectionContextValue | null>(null)

export const useElection = () => {
  const context = React.useContext(ElectionContext)
  if (!context) {
    throw new Error('useElection must be used within ElectionProvider')
  }
  return context
}

export const ElectionSteps = () => {
  const [state, dispatch] = React.useReducer(ElectionReducer, ElectionInitialState)
  return (
    <SafeAreaLayout className="bg-base-bg-white">
      <ElectionContext.Provider value={{ state, dispatch }}>
        <ElectionHeader />
        {state.step === 'location' && <ElectionLocationStep />}
        {state.step === 'faceVerification' && <ElectionFaceVerificationStep />}
        {state.step === 'vote' && <ElectionVoteStep />}
      </ElectionContext.Provider>
    </SafeAreaLayout>
  )
}
function ElectionHeader() {
  const { state } = useElection()
  const step = state.step === 'location' ? 1 : state.step === 'faceVerification' ? 2 : 3
  const router = useRouter()
  return (
    <View className="p-4 pb-2 flex flex-row gap-3 items-center">
      <Button
        variant="outline-primary"
        size="icon"
        onPress={() => router.back()}
        aria-label="Go back"
      >
        <Icon icon={ArrowLeftIcon} size={24} />
      </Button>
      <Progress value={(step / 3) * 100} className="flex-1" />
      <Text className="px-2 text-base font-heading-semibold text-base-text-medium">{step}/3</Text>
    </View>
  )
}

function ElectionLocationStep() {
  const { dispatch } = useElection()
  const [permissionStatus, requestPermission] = Location.useForegroundPermissions()
  useEffect(() => {
    if (
      permissionStatus === null ||
      permissionStatus.status === Location.PermissionStatus.GRANTED
    ) {
      return
    }
    requestPermission()
  }, [permissionStatus, requestPermission])
  const currentLocationQuery = useQuery({
    queryKey: ['currentLocation'],
    queryFn: () => Location.getCurrentPositionAsync(),
    enabled: permissionStatus?.status === Location.PermissionStatus.GRANTED,
  })
  useEffect(() => {
    if (currentLocationQuery.data) {
      const location = currentLocationQuery.data
      dispatch({
        type: 'setLocation',
        payload: { latitude: location.coords.latitude, longitude: location.coords.longitude },
      })
    }
  }, [currentLocationQuery.data, dispatch])
  return (
    <ScrollView className="px-4 pt-1">
      <H1 className="text-lg font-heading-semibold text-base-text-high">ยืนยันตำแหน่งที่อยู่</H1>
      {currentLocationQuery.isLoading || permissionStatus === null ? (
        <View className="flex flex-col py-16 items-center">
          <Spinner />
        </View>
      ) : (
        <View className="flex flex-col gap-4 py-16 items-center">
          <Icon
            icon={TriangleAlertIcon}
            size={40}
            strokeWidth={1.5}
            className="text-base-text-medium"
          />
          <Text className="text-base-text-medium text-center font-body-medium">
            {
              'เพื่อยืนยันว่าคุณอยู่ในพื้นที่ที่มีสิทธิ์ลงคะแนน\nกรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้งของอุปกรณ์'
            }
          </Text>
          <Button
            onPress={() => {
              if (permissionStatus === null) {
                return
              }
              if (permissionStatus.status === Location.PermissionStatus.GRANTED) {
                return
              }
              if (!permissionStatus.canAskAgain) {
                Linking.openSettings()
                return
              }
              requestPermission()
            }}
          >
            <Text>อนุญาต</Text>
          </Button>
        </View>
      )}
    </ScrollView>
  )
}

function ElectionFaceVerificationStep() {
  const { state, dispatch } = useElection()
  return <></>
}

function ElectionVoteStep() {
  const { state, dispatch } = useElection()
  return <></>
}
