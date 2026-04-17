import * as React from 'react'

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

import { openStore, useAppUpdateStatus } from '@app/libs/app-update'

export function AppUpdateGate() {
  const status = useAppUpdateStatus()
  const [dismissed, setDismissed] = React.useState(false)
  const statusKey = status ? `${status.mode}:${status.targetVersion}` : null
  React.useEffect(() => {
    if (statusKey) setDismissed(false)
  }, [statusKey])

  if (!status) return null

  const { mode, targetVersion, storeUrl, alert } = status
  const message = alert.message.replace('{{version}}', targetVersion)
  const isHard = mode === 'hard'
  const open = isHard || !dismissed

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isHard) return
        if (!next) setDismissed(true)
      }}
    >
      <AlertDialogContent className="max-w-xs">
        <AlertDialogHeader>
          <AlertDialogTitle>{alert.title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isHard && (
            <AlertDialogCancel onPress={() => setDismissed(true)}>
              <Text>{alert.laterButton}</Text>
            </AlertDialogCancel>
          )}
          <AlertDialogAction onPress={() => openStore(storeUrl)}>
            <Text>{alert.downloadButton}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
