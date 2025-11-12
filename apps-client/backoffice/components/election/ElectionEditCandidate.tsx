import { ReactNode, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Button } from '@pple-today/web-ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/web-ui/dialog'
import { Form } from '@pple-today/web-ui/form'
import { ScrollArea } from '@pple-today/web-ui/scroll-area'
import { Typography } from '@pple-today/web-ui/typography'
import z from 'zod'

import { ElectionCandidateForm } from './ElectionCandidateForm'
import { ElectionFormSchema } from './models'

const ElectionEditCandidateFormSchema = ElectionFormSchema.pick({
  candidates: true,
  isCandidateHasNumber: true,
})

type ElectionEditCandidateFormValues = z.infer<typeof ElectionEditCandidateFormSchema>

interface ElectionCreateFormProps {
  defaultValues?: ElectionEditCandidateFormValues
  setIsOpen: (isOpen: boolean) => void
  onSuccess: () => void
}

export const ElectionEditCandidateForm = (props: ElectionCreateFormProps) => {
  const form = useForm<ElectionEditCandidateFormValues>({
    resolver: standardSchemaResolver(ElectionEditCandidateFormSchema),
    defaultValues: props.defaultValues ?? {
      candidates: [],
    },
  })

  const onSubmit: SubmitHandler<ElectionEditCandidateFormValues> = async () => {
    props.onSuccess()
    props.setIsOpen(false)
    form.reset()
  }

  return (
    <>
      <DialogTitle asChild>
        <Typography variant="h3">แก้ไขการเลือกตั้ง</Typography>
      </DialogTitle>
      <DialogDescription className="text-sm text-base-text-medium leading-tight">
        แก้ไขรายละเอียดการเลือกตั้งสำหรับลงคะแนนภายในพรรค
      </DialogDescription>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Form {...form}>
          <ScrollArea className="h-[60vh] px-1">
            <ElectionCandidateForm />
          </ScrollArea>
          <div className="flex flex-row-reverse gap-2 mt-2">
            <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'กําลังบันทึก' : 'บันทึก'}
            </Button>
            <DialogTrigger asChild>
              <Button variant="ghost" className="flex-1 min-w-0">
                ยกเลิก
              </Button>
            </DialogTrigger>
          </div>
        </Form>
      </form>
    </>
  )
}

interface ElectionEditCandidateProps {
  trigger: ReactNode
  defaultValues?: ElectionEditCandidateFormValues
  onSuccess: () => void
}

export const ElectionEditCandidate = (props: ElectionEditCandidateProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Pushing the change to the end of the call stack
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 0)

      return () => clearTimeout(timer)
    } else {
      document.body.style.pointerEvents = 'auto'
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{props.trigger}</DialogTrigger>
      <DialogContent asChild cardClassName="max-w-3xl">
        <ElectionEditCandidateForm
          setIsOpen={setIsOpen}
          onSuccess={props.onSuccess}
          defaultValues={props.defaultValues}
        />
      </DialogContent>
    </Dialog>
  )
}
