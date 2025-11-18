import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from 'utils/file-upload'
import z from 'zod'

export const ElectionFormSchema = z
  .object({
    name: z.string({ error: 'กรุณากรอกชื่อการเลือกตั้ง' }).min(1, 'กรุณากรอกชื่อการเลือกตั้ง'),
    locationMapUrl: z.url({ error: 'กรุณากรอก URL สถานที่เลือกตั้งที่ถูกต้อง' }).optional(),
    province: z.string({ error: 'กรุณาเลือกจังหวัด' }).min(1, 'กรุณาเลือกจังหวัด'),
    district: z.string({ error: 'กรุณาเลือกเขต' }).min(1, 'กรุณาเลือกเขต'),
    type: z.enum(['ONSITE', 'ONLINE', 'HYBRID'], {
      error: 'กรุณาเลือกประเภทการเลือกตั้ง',
    }),
    mode: z.enum(['FLEXIBLE', 'SECURE'], {
      error: 'กรุณาเลือกประเภทของการเชื่อมต่อข้อมูล',
    }),
    openRegister: z
      .date({ error: 'กรุณาเลือกวันที่เปิดลงทะเบียน' })
      .min(new Date(), 'วันที่เปิดลงทะเบียนต้องอยู่หลังปัจจุบัน')
      .optional(),
    closeRegister: z
      .date({ error: 'กรุณาเลือกวันที่ปิดลงทะเบียน' })
      .min(new Date(), 'วันที่ปิดลงทะเบียนต้องอยู่หลังปัจจุบัน')
      .optional(),
    openVoting: z
      .date({ error: 'กรุณาเลือกวันที่เปิดหีบ' })
      .min(new Date(), 'วันที่เปิดหีบต้องอยู่หลังปัจจุบัน'),
    closeVoting: z
      .date({ error: 'กรุณาเลือกวันที่ปิดหีบ' })
      .min(new Date(), 'วันที่ปิดหีบต้องอยู่หลังปัจจุบัน'),
    eligibleVoterFile: z.file().nullable().optional(),
    isCandidateHasNumber: z.boolean({ error: 'กรุณาเลือกว่าผู้สมัครมีหมายเลขประจําตัวหรือไม่' }),
    candidates: z
      .array(
        z.object({
          id: z.string(),
          number: z.number().optional(),
          name: z.string().min(1, 'กรุณากรอกชื่อผู้สมัคร'),
          imageFile: z.discriminatedUnion(
            'type',
            [
              z.object({
                type: z.literal('NEW_FILE'),
                file: z
                  .instanceof(File, { error: 'กรุณาอัปโหลดไฟล์' })
                  .refine((file) => file.size <= MAX_FILE_SIZE, `กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5 MB`)
                  .refine(
                    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
                    'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG'
                  ),
              }),
              z.object({
                type: z.literal('OLD_FILE'),
                filePath: z.string(),
                url: z.url({
                  error: 'กรุณาอัปโหลดไฟล์ประเภท PDF / JPG / PNG',
                }),
              }),
              z.object({
                type: z.literal('NO_FILE'),
              }),
            ],
            {
              error: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            }
          ),
        })
      )
      .min(2, 'กรุณาสร้างผู้ลงสมัครอย่างน้อย 2 คน'),
  })
  .check(({ issues, value }) => {
    if (value.closeVoting <= value.openVoting) {
      issues.push({
        code: 'invalid_type',
        message: 'วันที่เปิดหีบต้องอยู่ก่อนวันที่ปิดหีบ',
        expected: 'date',
        input: value.closeVoting,
      })
    }
    if (value.closeRegister && value.openRegister) {
      if (value.openVoting <= value.openRegister) {
        issues.push({
          code: 'invalid_type',
          message: 'วันที่เปิดลงทะเบียนต้องอยู่ก่อนวันที่เปิดหีบ',
          expected: 'date',
          input: value.openRegister,
          path: ['openRegister'],
        })
      }
      if (value.closeRegister <= value.openRegister) {
        issues.push({
          code: 'invalid_type',
          message: 'วันที่เปิดลงทะเบียนต้องอยู่ก่อนวันที่ปิดลงทะเบียน',
          expected: 'date',
          input: value.closeRegister,
          path: ['openRegister'],
        })
      }
    }
    if (value.type !== 'ONLINE') {
      if (!value.locationMapUrl) {
        issues.push({
          code: 'invalid_type',
          message: 'กรุณากรอก URL สำหรับสถานที่เลือกตั้ง',
          expected: 'string',
          input: value.locationMapUrl,
          path: ['locationMapUrl'],
        })
      }
    }
    if (value.type === 'HYBRID') {
      if (!value.openRegister) {
        issues.push({
          code: 'invalid_type',
          message: 'กรุณาเลือกวันที่เปิดลงทะเบียน',
          expected: 'date',
          input: value.openRegister,
          path: ['openRegister'],
        })
      }
      if (!value.closeRegister) {
        issues.push({
          code: 'invalid_type',
          message: 'กรุณาเลือกวันที่ปิดลงทะเบียน',
          expected: 'date',
          input: value.closeRegister,
          path: ['closeRegister'],
        })
      }
    }
    if (value.isCandidateHasNumber) {
      const existingNumbers = new Set<number>()
      for (const candidateIdx in value.candidates) {
        const candidate = value.candidates[candidateIdx]
        if (candidate.number === undefined) {
          issues.push({
            code: 'invalid_type',
            message: 'กรุณากรอกหมายเลขผู้สมัคร',
            expected: 'number',
            input: candidate.number,
            path: ['candidates', candidateIdx, 'number'],
          })
        } else if (existingNumbers.has(candidate.number)) {
          issues.push({
            code: 'invalid_type',
            message: 'หมายเลขผู้สมัครซ้ำกัน กรุณากรอกใหม่',
            expected: 'number',
            input: candidate.number,
            path: ['candidates', candidateIdx, 'number'],
          })
        } else {
          existingNumbers.add(candidate.number)
        }
      }
    }
  })
export type ElectionFormValues = z.infer<typeof ElectionFormSchema>
