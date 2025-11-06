import { createFileRoute } from '@tanstack/react-router'

import { Data } from './-data'

export const Route = createFileRoute('/_app/activity/poll/$pollId')({
  component: Data,
  head: ({ params }) => ({ meta: [{ title: `Poll - ${params.pollId}` }] }),
})
