// reference: https://github.com/bluesky-social/social-app/blob/main/src/lib/hooks/usePermissions.ts

import { Alert, Linking } from 'react-native'

import * as ImagePicker from 'expo-image-picker'

const openPermissionAlert = (perm: string) => {
  Alert.alert('Permission needed', `PPLE Today does not have permission to access your ${perm}.`, [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ])
}

export function usePhotoLibraryPermission() {
  const [permissionResponse, requestPermission] = ImagePicker.useMediaLibraryPermissions()
  const requestPhotoAccessIfNeeded = async () => {
    if (permissionResponse?.granted) {
      return true
    } else if (
      !permissionResponse ||
      permissionResponse.status === 'undetermined' ||
      permissionResponse.canAskAgain
    ) {
      const { canAskAgain, granted, status } = await requestPermission()

      if (!canAskAgain && status === 'undetermined') {
        openPermissionAlert('photo library')
      }

      return granted
    } else {
      openPermissionAlert('photo library')
      return false
    }
  }
  return { requestPhotoAccessIfNeeded }
}
