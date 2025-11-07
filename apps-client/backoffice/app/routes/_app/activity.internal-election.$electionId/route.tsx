'use client'

import { createFileRoute } from '@tanstack/react-router'
import { Breadcrumbs } from 'components/election/-breadcrumbs'
import { CandidatesAndResult } from 'components/election/-candidatesAndResult'
import { Detail } from 'components/election/-detail'
import { Header } from 'components/election/-header'

import * as apiClient from '~/libs/api-client'

export const Route = createFileRoute('/_app/activity/internal-election/$electionId')({
  component: InternalElectionPage,
  head: ({ params }) => ({ meta: [{ title: `Internal Election - ${params.electionId}` }] }),
})

function InternalElectionPage() {
  const { electionId } = Route.useParams()
  const electionQuery = apiClient.reactQueryClient.useQuery('/admin/elections/:electionId', {
    pathParams: { electionId: electionId || '' },
  })
  const resultQuery = apiClient.reactQueryClient.useQuery('/admin/elections/:electionId/result', {
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
