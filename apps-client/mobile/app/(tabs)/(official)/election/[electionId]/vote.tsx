import React, { createContext, useEffect } from 'react'
import { ScrollView, View } from 'react-native'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Progress } from '@pple-today/ui/progress'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { H1 } from '@pple-today/ui/typography'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Linking from 'expo-linking'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ScanFaceIcon,
  TriangleAlertIcon,
  VoteIcon,
} from 'lucide-react-native'

import { FilePath, GetElectionResponse } from '@api/backoffice/app'
import FaceScan from '@app/assets/face-scan.svg'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { ElectionStatusBadge, ElectionTypeBadge } from '@app/components/election/election-card'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { Spinner } from '@app/components/spinner'
import { reactQueryClient } from '@app/libs/api-client'
import { ImageMimeType } from '@app/types/file'
import { encryptBallot } from '@app/utils/election'
import { handleUploadImage } from '@app/utils/upload'

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
  return <ElectionSteps election={electionQuery.data} />
}

interface ElectionLocation {
  latitude: number
  longitude: number
}
interface ElectionFaceVerification {
  faceImagePath: FilePath
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

export const ElectionSteps = ({ election }: { election: GetElectionResponse }) => {
  const [state, dispatch] = React.useReducer(ElectionReducer, ElectionInitialState)
  return (
    <SafeAreaLayout className="bg-base-bg-white">
      <ElectionContext.Provider value={{ state, dispatch }}>
        <ElectionHeader />
        {state.step === 'location' && <ElectionLocationStep />}
        {state.step === 'faceVerification' && <ElectionFaceVerificationStep />}
        {state.step === 'vote' && <ElectionVoteStep election={election} />}
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
    <View className="px-4 pt-1 flex-1">
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
          <Text className="text-base-text-high text-center font-body-regular">
            {
              'เพื่อยืนยันว่าคุณอยู่ในพื้นที่ที่มีสิทธิ์ลงคะแนน\nกรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้งของอุปกรณ์'
            }
          </Text>
          <View className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-base-bg-white">
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
        </View>
      )}
    </View>
  )
}

function ElectionFaceVerificationStep() {
  const { dispatch } = useElection()
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions()
  const [asset, setAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null)
  const uploadUrlMutation = reactQueryClient.useMutation('post', '/elections/upload-url', {})
  const uploadImageMutation = useMutation({
    mutationFn: (variables: {
      asset: ImagePicker.ImagePickerAsset
      uploadUrl: string
      uploadFields: Record<string, string>
    }) => handleUploadImage(variables.asset, variables.uploadUrl, variables.uploadFields),
  })
  return (
    <View className="px-4 pt-1 gap-5 flex-1">
      <H1 className="text-lg font-heading-semibold text-base-text-high">ถ่ายรูปเพื่อยืนยันตัวตน</H1>
      {asset === null ? (
        <>
          <Icon icon={FaceScan} className="self-center" />
          <Text className="text-base-text-high text-center font-body-regular">
            โปรดถ่ายรูปใบหน้าเพื่อยืนยันตัวตน
          </Text>
        </>
      ) : (
        <Image source={{ uri: asset.uri }} className="w-full rounded-xl aspect-[3/4]" />
      )}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-base-bg-white">
        {asset === null ? (
          <Button
            onPress={async () => {
              async function openCamera() {
                try {
                  const result = await ImagePicker.launchCameraAsync({
                    // android: the behavior of this option may vary based on the camera app installed on the device.
                    // https://docs.expo.dev/versions/latest/sdk/imagepicker/#imagepickeroptions
                    cameraType: ImagePicker.CameraType.front,
                  })
                  if (result.canceled) {
                    return
                  }
                  const asset = result.assets[0]
                  if (!asset) {
                    return
                  }
                  setAsset(asset)
                  uploadUrlMutation.mutateAsync(
                    { body: { contentType: (asset.mimeType || 'image/png') as ImageMimeType } },
                    {
                      onSuccess: async (data) => {
                        uploadImageMutation.mutateAsync(
                          {
                            asset,
                            uploadUrl: data.uploadUrl,
                            uploadFields: data.uploadFields,
                          },
                          {
                            onError: (error) => {
                              console.error('Error uploading image:', error)
                              toast.error({
                                text1: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
                                icon: TriangleAlertIcon,
                              })
                              setAsset(null)
                            },
                          }
                        )
                      },
                      onError: (error) => {
                        console.error('Error getting upload url:', error)
                        toast.error({
                          text1: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
                          icon: TriangleAlertIcon,
                        })
                        setAsset(null)
                      },
                    }
                  )
                } catch (error) {
                  console.error('Error launching camera:', error)
                }
              }
              if (cameraPermission === null) {
                return
              }
              if (cameraPermission.status !== ImagePicker.PermissionStatus.GRANTED) {
                if (!cameraPermission.canAskAgain) {
                  Linking.openSettings()
                  return
                }
                const { status } = await requestCameraPermission()
                if (status === ImagePicker.PermissionStatus.GRANTED) {
                  openCamera()
                  return
                }
                return
              }
              openCamera()
            }}
          >
            <Icon icon={ScanFaceIcon} />
            <Text>ถ่ายรูปใบหน้า</Text>
          </Button>
        ) : (
          <Button
            disabled={uploadUrlMutation.isPending || uploadImageMutation.isPending}
            onPress={() => {
              if (!uploadUrlMutation.data) {
                return
              }
              dispatch({
                type: 'setFaceVerification',
                payload: { faceImagePath: uploadUrlMutation.data.fileKey as FilePath },
              })
            }}
          >
            <Icon icon={ArrowRightIcon} />
            <Text>ถัดไป</Text>
          </Button>
        )}
      </View>
    </View>
  )
}

function ElectionVoteStep({ election }: { election: GetElectionResponse }) {
  const { state } = useElection()
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string | null>(null)
  const voteBallotMutation = reactQueryClient.useMutation(
    'post',
    '/elections/:electionId/ballot',
    {}
  )
  const router = useRouter()
  const submit = async () => {
    if (!selectedCandidateId) {
      return
    }
    voteBallotMutation.mutateAsync(
      {
        pathParams: { electionId: election.id },
        body: {
          encryptedBallot: election.encryptionPublicKey
            ? encryptBallot(selectedCandidateId, election.encryptionPublicKey)
            : selectedCandidateId,
          location: JSON.stringify(state.locationStepResult!),
          // TODO
          faceImagePath: state.faceVerificationStepResult!.faceImageAsset.uri!,
        },
      },
      {
        onSuccess: () => {
          toast({ text1: 'ลงคะแนนเรียบร้อย' })
          router.navigate(`/election/${election.id}`)
        },
        onError: (error) => {
          console.error('Error submitting ballot:', error)
          toast.error({ text1: 'เกิดข้อผิดพลาดในการลงคะแนน' })
        },
      }
    )
  }
  return (
    <>
      <ScrollView contentContainerClassName="px-4 pt-1 gap-3" className="flex-1">
        <H1 className="text-lg font-heading-semibold text-base-text-high">{election.name}</H1>
        <View className="flex flex-row items-center gap-1">
          <Icon icon={CalendarIcon} size={16} className="text-base-primary-default" />
          <Text className="text-base-primary-default text-xs font-heading-semibold">
            {dayjs(election.closeVoting).format('DD MMM BBBB เวลา HH:mm')}
          </Text>
        </View>
        <View className="flex flex-row gap-2">
          <ElectionTypeBadge type={election.type} />
          <ElectionStatusBadge status={election.status} />
        </View>
        <View className="flex flex-col gap-3">
          {election.candidates.map((candidate) => {
            const isSelected = selectedCandidateId === candidate.id
            return (
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
                  {election.candidates[0].profileImagePath && (
                    <AvatarImage source={{ uri: election.candidates[0].profileImagePath }} />
                  )}
                  <AvatarPPLEFallback />
                </Avatar>
                <Text className="text-base font-body-regular text-base-text-high flex-1">
                  {candidate.name}
                </Text>

                <Button
                  size="sm"
                  className="w-16"
                  variant={isSelected ? 'outline-primary' : 'primary'}
                  onPress={() => {
                    setSelectedCandidateId(candidate.id)
                  }}
                >
                  {isSelected && <Icon icon={CheckIcon} />}
                  <Text>เลือก</Text>
                </Button>
              </View>
            )
          })}
        </View>
      </ScrollView>
      <View className="px-4 py-2 bg-base-bg-white">
        <Button onPress={submit} disabled={!selectedCandidateId || voteBallotMutation.isPending}>
          <Icon icon={VoteIcon} />
          <Text>ยืนยันการลงคะแนน</Text>
        </Button>
      </View>
    </>
  )
}
