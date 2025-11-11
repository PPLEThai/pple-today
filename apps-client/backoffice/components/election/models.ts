import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

export const ElectionFormSchema = z.object({
  name: z.string({ error: 'กรุณากรอกชื่อการเลือกตั้ง' }).min(1, 'กรุณากรอกชื่อการเลือกตั้ง'),
  locationMapUrl: z.url({ error: 'กรุณากรอก URL สถานที่เลือกตั้งที่ถูกต้อง' }),
  province: z.string({ error: 'กรุณาเลือกจังหวัด' }).min(1, 'กรุณาเลือกจังหวัด'),
  district: z.string({ error: 'กรุณาเลือกเขต' }).min(1, 'กรุณาเลือกเขต'),
  type: z.enum(['ONSITE', 'ONLINE', 'HYBRID'], {
    error: 'กรุณาเลือกประเภทการเลือกตั้ง',
  }),
  mode: z.enum(['FLEXIBLE', 'SECURE'], {
    error: 'กรุณาเลือกประเภทของการเชื่อมต่อข้อมูล',
  }),
  openRegister: z.date({ error: 'กรุณาเลือกวันที่เปิดลงทะเบียน' }).optional(),
  closeRegister: z.date({ error: 'กรุณาเลือกวันที่ปิดลงทะเบียน' }).optional(),
  openVoting: z.date({ error: 'กรุณาเลือกวันที่เปิดหีบ' }),
  closeVoting: z.date({ error: 'กรุณาเลือกวันที่ปิดหีบ' }),
  eligibleVoterFile: z.union([
    z
      .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
      .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
      .refine(
        (file) => ACCEPTED_FILE_TYPES.includes(file.type),
        'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
      ),
    z.literal('OLD_FILE'),
    z.literal('NO_FILE'),
  ]),
  candidates: z
    .array(
      z.object({
        number: z.number().optional(),
        name: z.string().min(1, 'กรุณากรอกชื่อผู้สมัคร'),
        imageFile: z.union([
          z
            .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
            .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
            .refine(
              (file) => ACCEPTED_FILE_TYPES.includes(file.type),
              'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
            ),
          z.literal('OLD_FILE'),
          z.literal('NO_FILE'),
        ]),
      })
    )
    .min(2, 'กรุณาสร้างผู้ลงสมัครอย่างน้อย 2 คน'),
})
export type ElectionFormValues = z.infer<typeof ElectionFormSchema>
