import * as React from 'react'
import { View } from 'react-native'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/ui/alert-dialog'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { LogInIcon } from 'lucide-react-native'

/**
 * Shown when a signed-out user opens a mini app that needs a session, or the
 * page on screen asks for one. เข้าสู่ระบบ opens PPLE ID sign-in and the app
 * carries on where it was once it returns.
 */
export function MiniAppSignInDialog({
  appName,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  /** The app on screen, when known. */
  appName: string | null
  /** Sign-in is in progress (or not ready to start). */
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        // Dismissal (Android back) is a cancel; ignored while signing in.
        if (!next && !isSubmitting) onCancel()
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>เข้าสู่ระบบเพื่อใช้งาน</AlertDialogTitle>
          <AlertDialogDescription>
            {appName
              ? `แอปฯ "${appName}" ต้องเข้าสู่ระบบก่อนใช้งาน`
              : 'แอปฯ นี้ต้องเข้าสู่ระบบก่อนใช้งาน'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Plain buttons: AlertDialogAction would close the dialog before the
            sign-in browser has even opened. */}
        <AlertDialogFooter>
          <Button variant="outline" onPress={onCancel} disabled={isSubmitting}>
            <Text>ยกเลิก</Text>
          </Button>
          <Button onPress={onConfirm} disabled={isSubmitting}>
            <Text>เข้าสู่ระบบ</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Stands in for an app that needs a session after the user declined to sign
 * in — what a tab shows when they come back to it.
 */
export function MiniAppSignInRequired({ onSignIn }: { onSignIn: () => void }) {
  return (
    <View className="flex-1 bg-base-bg-light flex flex-col justify-center items-center px-6">
      <Icon icon={LogInIcon} className="text-base-text-placeholder" size={60} />
      <H1 className="text-2xl font-heading-semibold pt-4 pb-1 text-base-text-medium">
        เข้าสู่ระบบเพื่อใช้งาน
      </H1>
      <Text className="text-base-text-medium font-body-regular text-center pb-4">
        แอปฯ นี้ต้องเข้าสู่ระบบก่อนใช้งาน
      </Text>
      <Button onPress={onSignIn}>
        <Text>เข้าสู่ระบบ</Text>
      </Button>
    </View>
  )
}
