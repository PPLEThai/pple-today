import { useFieldArray, useFormContext } from 'react-hook-form'

import { Button } from '@pple-today/web-ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { FileUploadInput } from 'components/FileUploadInput'
import { CirclePlus, X } from 'lucide-react'
import { ACCEPTED_FILE_TYPES } from 'utils/file-upload'

import { ElectionFormValues } from './models'

export const ElectionCandidateForm = () => {
  const form = useFormContext<Pick<ElectionFormValues, 'candidates'>>()
  const candidates = useFieldArray({
    control: form.control,
    name: 'candidates',
  })

  return (
    <FormField
      control={form.control}
      name="candidates"
      render={() => (
        <>
          <div className="space-y-1">
            <Typography variant="h6">
              ผู้ลงสมัคร <span className="text-system-danger-default">*</span>
            </Typography>
            <Typography variant="small" className="text-base-text-placeholder mb-4">
              สร้างอย่างน้อย 2 ตัวเลือก
            </Typography>
          </div>
          {candidates.fields.map((field, index) => (
            <div
              key={field.id}
              className="border border-base-border-light bg-base-bg-light rounded-md p-4 mb-4 space-y-4"
            >
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name={`candidates.${index}.number`}
                  render={({ field }) => (
                    <FormItem className="basis-1/4 self-baseline">
                      <FormLabel>หมายเลขผู้สมัคร</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="กรอกหมายเลขผู้สมัคร" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`candidates.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="basis-3/4 self-baseline">
                      <FormLabel>
                        ชื่อผู้สมัคร <span className="text-system-danger-default">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="กรอกชื่อผู้สมัคร" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <FileUploadInput>
                  <Input
                    type="file"
                    placeholder="เลือกไฟล์"
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                  />
                </FileUploadInput>
                <Button className="shrink-0" type="button" variant="secondary" size="icon">
                  <span className="sr-only">ล้างไฟล์ที่เลือก</span>
                  <X className="size-6" />
                </Button>
              </div>
              <Button size="sm" className="w-full" onClick={() => candidates.remove(index)}>
                ลบผู้สมัคร
              </Button>
            </div>
          ))}
          <FormMessage className="text-center" />
          <Button
            variant="outline"
            type="button"
            className="w-full border-dashed gap-2 text-base-secondary-light"
            onClick={() =>
              candidates.append({
                name: '',
                number: undefined,
                imageFile: 'NO_FILE',
              })
            }
          >
            <CirclePlus width={16} height={16} />
            เพิ่มผู้สมัคร
          </Button>
        </>
      )}
    />
  )
}
