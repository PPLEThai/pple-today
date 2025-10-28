import { forwardRef, useImperativeHandle, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/web-ui/alert-dialog'
import { Typography } from '@pple-today/web-ui/typography'

export interface ConfirmDialogRef {
  confirm: (data: ConfirmData) => void
}

interface ConfirmData {
  title: string
  description: string
  onConfirm?: () => void
  onCancel?: () => void
}

export const ConfirmDialog = forwardRef<ConfirmDialogRef>(function ConfirmDialog(_, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<ConfirmData>({
    title: '',
    description: '',
  })

  useImperativeHandle(ref, () => ({
    confirm: (data: ConfirmData) => {
      setIsOpen(true)
      setData(data)
    },
  }))

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-col gap-1.5">
          <AlertDialogTitle asChild>
            <Typography variant="h3">{data.title}</Typography>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-base-text-medium leading-tight">
            {data.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 mt-2">
          <AlertDialogCancel className="flex-1 min-w-0" onClick={() => data.onCancel?.()}>
            ยกเลิก
          </AlertDialogCancel>
          <AlertDialogAction className="flex-1 min-w-0" onClick={() => data.onConfirm?.()}>
            ตกลง
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
