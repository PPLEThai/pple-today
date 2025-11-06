import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/activity/poll/$pollId')({
  component: PollPage,
  head: ({ params }) => ({ meta: [{ title: `Poll - ${params.pollId}` }] }),
})

function PollPage() {
  return null
}
