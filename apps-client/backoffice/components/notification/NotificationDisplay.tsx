import { Badge } from '@pple-today/web-ui/badge'
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  Check,
  CircleHelp,
  Clock,
  Flag,
  Heart,
  type LucideIcon,
  Send,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'

import type {
  AdminSentNotificationAudience,
  AdminSentNotificationSummary,
  NotificationInteractionIcon,
} from '@api/backoffice/admin'

/** Same mapping as the mobile client's lucide icon map, so the preview matches the phone. */
export const INTERACTION_ICON_COMPONENTS: Record<NotificationInteractionIcon, LucideIcon> = {
  check: Check,
  x: X,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  'calendar-check': CalendarCheck,
  'calendar-x': CalendarX,
  clock: Clock,
  send: Send,
  heart: Heart,
  star: Star,
  flag: Flag,
  'user-check': UserCheck,
  'user-x': UserX,
  help: CircleHelp,
}

export const INTERACTION_ICON_LABELS: Record<NotificationInteractionIcon, string> = {
  check: 'ถูก',
  x: 'กากบาท',
  'thumbs-up': 'ถูกใจ',
  'thumbs-down': 'ไม่ถูกใจ',
  'calendar-check': 'ปฏิทิน (ยืนยัน)',
  'calendar-x': 'ปฏิทิน (ยกเลิก)',
  clock: 'นาฬิกา',
  send: 'ส่ง',
  heart: 'หัวใจ',
  star: 'ดาว',
  flag: 'ธง',
  'user-check': 'ผู้ใช้ (ยืนยัน)',
  'user-x': 'ผู้ใช้ (ปฏิเสธ)',
  help: 'คำถาม',
}

export const ACTION_STYLE_LABELS = {
  primary: 'หลัก',
  outline: 'รอง',
  destructive: 'อันตราย (สีแดง)',
} as const

export const FIELD_TYPE_LABELS = {
  text: 'ข้อความ',
  radio: 'เลือกได้ 1 ข้อ',
  checkbox: 'เลือกได้หลายข้อ',
} as const

export const CHANNEL_LABELS = { APP: 'ในแอป', TRAY: 'จากการแจ้งเตือน' } as const

export const formatAudience = (
  audience: AdminSentNotificationAudience,
  roleLabel: (role: string) => string = (r) => r
) => {
  switch (audience.type) {
    case 'BROADCAST':
      return 'ทุกคน'
    case 'ROLE':
      return `บทบาท: ${audience.roles.map(roleLabel).join(', ')}`
    case 'ADDRESS':
      return `พื้นที่: ${[...audience.provinces, ...audience.districts].join(', ')}`
    case 'PHONE_NUMBER':
      return audience.phoneNumberCount === 1
        ? 'เบอร์โทร 1 เบอร์'
        : `เบอร์โทร ${audience.phoneNumberCount.toLocaleString()} เบอร์`
    case 'TEST':
      return 'ทดสอบ (ส่งหาผู้ส่ง)'
  }
}

export const InteractionStateBadge = ({
  state,
}: {
  state: AdminSentNotificationSummary['interactionState']
}) => {
  switch (state) {
    case null:
      return null
    case 'OPEN':
      return <Badge variant="success">เปิดรับคำตอบ</Badge>
    case 'CLOSED':
      return <Badge variant="closed">ปิดรับคำตอบแล้ว</Badge>
    case 'EXPIRED':
      return (
        <Badge variant="closed">
          <Calendar />
          หมดเวลาตอบกลับ
        </Badge>
      )
  }
}
