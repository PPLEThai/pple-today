import * as React from 'react'
import { Linking } from 'react-native'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/ui/alert-dialog'
import { Text } from '@pple-today/ui/text'

/**
 * Shown when notifications are off and the OS will no longer ask (iOS after a
 * refusal, Android after "don't ask again"): only Settings can turn them back
 * on. Coming back from Settings registers the token on its own (see
 * `libs/notification-registration.ts`).
 */
export function NotificationSettingsPromptDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>เปิดการแจ้งเตือน</AlertDialogTitle>
          <AlertDialogDescription>
            การแจ้งเตือนของ PPLE Today ปิดอยู่ คุณจะไม่ได้รับข่าวสารและการแจ้งเตือนสำคัญจากแอปฯ ต่าง
            ๆ เปิดได้ที่การตั้งค่าของเครื่อง
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={() => onOpenChange(false)}>
            <Text>ไว้ภายหลัง</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              onOpenChange(false)
              Linking.openSettings().catch(() => {})
            }}
          >
            <Text>ไปที่การตั้งค่า</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
