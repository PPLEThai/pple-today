import { createFileRoute } from '@tanstack/react-router'

import { Data } from './-data'

export const Route = createFileRoute('/_app/notification/$notificationId')({
  component: Data,
  head: () => ({ meta: [{ title: 'แจ้งเตือน' }] }),
})
