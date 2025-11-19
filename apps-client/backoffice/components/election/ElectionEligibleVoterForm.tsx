import { useRef } from 'react'
import { useFormContext } from 'react-hook-form'

import { Button } from '@pple-today/web-ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { FileUploadInput } from 'components/FileUploadInput'
import { X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES } from 'utils/file-upload'

import { ElectionFormValues } from './models'

export const ElectionEligibleVoterForm = () => {
  const form = useFormContext<Pick<ElectionFormValues, 'eligibleVoterFile'>>()
  const elFileInput = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <FormField
        control={form.control}
        name="eligibleVoterFile"
        render={({ field: { onChange, value, ref, ...field } }) => (
          <FormItem>
            <FormLabel>ไฟล์รายชื่อผู้มีสิทธิ์ลงคะแนน</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <FileUploadInput fileName={value?.name} preview={value ?? undefined}>
                  <Input
                    type="file"
                    placeholder="เลือกไฟล์"
                    {...field}
                    ref={(el) => {
                      elFileInput.current = el
                      ref(el)
                    }}
                    onChange={(ev) => {
                      if (!ev.target.files || ev.target.files.length === 0) return
                      onChange(ev.target.files[0])
                    }}
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                  />
                </FileUploadInput>
                <Button
                  className="shrink-0"
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => onChange(null)}
                >
                  <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                  <X className="size-6" />
                </Button>
              </div>
            </FormControl>
            <Typography variant="small" className="text-base-text-placeholder">
              อัปโหลดไฟล์รายชื่อผู้มีสิทธิ์ลงคะแนน (.csv, .xlsx)
            </Typography>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
