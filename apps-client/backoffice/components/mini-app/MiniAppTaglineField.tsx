import { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@pple-today/web-ui/form'
import { Input } from '@pple-today/web-ui/input'
import z from 'zod'

/** Mirrors `TAGLINE_MAX_LENGTH` in the API: one line under the app's name. */
export const TAGLINE_MAX_LENGTH = 60

/**
 * The tagline is optional in the database (older apps have none) but required
 * here, so every app the central team saves from now on says what it does.
 */
export const miniAppTaglineSchema = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกคำอธิบายสั้น')
  .max(TAGLINE_MAX_LENGTH, `คำอธิบายสั้นต้องไม่เกิน ${TAGLINE_MAX_LENGTH} ตัวอักษร`)

export function MiniAppTaglineField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>
  name: FieldPath<T>
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            คำอธิบายสั้น <span className="text-system-danger-default">*</span>
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              maxLength={TAGLINE_MAX_LENGTH}
              placeholder="ขึ้นต้นด้วยคำกริยา เช่น ค้นคลังความรู้และเอกสารพรรค"
            />
          </FormControl>
          <FormMessage asChild>
            <FormDescription>
              บอกว่าแอปนี้ใช้ทำอะไร แสดงใต้ชื่อแอปและใช้ในการค้นหาในแอป PPLE Today (
              {String(field.value ?? '').length}/{TAGLINE_MAX_LENGTH})
            </FormDescription>
          </FormMessage>
        </FormItem>
      )}
    />
  )
}
