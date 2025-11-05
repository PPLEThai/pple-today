import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/activity/internal-election/$electionId')({
  component: InternalElectionPage,
  head: ({ params }) => ({ meta: [{ title: `Internal Election - ${params.electionId}` }] }),
})

function InternalElectionPage() {
  return null
}
