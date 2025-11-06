'use client'

import { createFileRoute } from '@tanstack/react-router'

import { Breadcrumbs } from './-breadcrumbs'
import { CandidatesAndResult } from './-candidatesAndResult'
import { Detail } from './-detail'
import { Header } from './-header'

import { reactQueryClient } from '../../../libs/api-client'

export const Route = createFileRoute('/_app/activity/internal-election/$electionId')({
  component: InternalElectionPage,
  head: ({ params }) => ({ meta: [{ title: `Internal Election - ${params.electionId}` }] }),
})

function InternalElectionPage() {
  const { electionId } = Route.useParams()
  const electionQuery = reactQueryClient.useQuery('/admin/elections/:electionId', {
    pathParams: { electionId: electionId || '' },
  })
  const resultQuery = reactQueryClient.useQuery('/admin/elections/:electionId/result', {
    pathParams: { electionId: electionId || '' },
  })

  return (
    <div className="mx-6 space-y-4">
      <Breadcrumbs name={electionQuery.data?.name} />
      {electionQuery.isSuccess && (
        <>
          <Header election={electionQuery.data} />
          <Detail election={electionQuery.data} />
          {resultQuery.isSuccess && (
            <CandidatesAndResult election={electionQuery.data} result={resultQuery.data} />
          )}
        </>
      )}
    </div>
  )
}
