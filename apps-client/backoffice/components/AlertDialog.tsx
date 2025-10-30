import { forwardRef, useImperativeHandle, useState } from 'react'

import {
  AlertDialog as AlertDialogRoot,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pple-today/web-ui/alert-dialog'
import { Typography } from '@pple-today/web-ui/typography'

export interface AlertDialogRef {
  alert: (data: AlertData) => void
}

interface AlertData {
  title: string
  description: string
}

export const AlertDialog = forwardRef<AlertDialogRef>(function AlertDialog(_, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<AlertData>({
    title: '',
    description: '',
  })

  useImperativeHandle(ref, () => ({
    alert: (data: AlertData) => {
      setIsOpen(true)
      setData(data)
    },
  }))

  return (
    <AlertDialogRoot open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-col gap-1.5">
          <AlertDialogTitle asChild>
            <Typography variant="h3">{data.title}</Typography>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-base-text-medium leading-tight">
            {data.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center sm:justify-center mt-2">
          <AlertDialogAction>ตกลง</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  )
})
