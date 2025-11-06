import { Breadcrumbs } from './breadcrumbs'
import { CandidatesAndResult } from './candidatesAndResult'
import { Detail } from './detail'
import { Header } from './header'
import { Route } from '.react-router/types/app/+types/root'

import { reactQueryClient } from '../../libs/api-client'

export function meta() {
  return [{ title: 'Internal-election' }]
}

export default function InternalElectionDetailPage({ params }: Route.LoaderArgs) {
  const { electionId } = params
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
