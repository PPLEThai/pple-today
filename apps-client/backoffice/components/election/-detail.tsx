import { useCallback, useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { Card, CardContent } from '@pple-today/web-ui/card'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import ElectionKeyStatusBadge from 'components/election/ElectionKeyStatusBadge'
import ElectionStatusBadge from 'components/election/ElectionStatusBadge'
import ElectionTypeBadge from 'components/election/ElectionTypeBadge'
import { Calendar, Download, Link, MapPin, RefreshCw, Users } from 'lucide-react'
import { downloadCSV } from 'utils/csv'
import { getTimelineString } from 'utils/date'

import { AdminGetElectionResponse } from '@api/backoffice/admin'

import { fetchClient, reactQueryClient } from '~/libs/api-client'

export function Detail({ election }: { election: AdminGetElectionResponse }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-secondary-200">
          <Link className="mr-2 " />
          <Typography variant="p" className="mr-2 text-secondary-200">
            ID:
          </Typography>
          <Typography variant="p" className="text-primary">
            {election.id}
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          {election.status === 'DRAFT' && (
            <>
              {election.keyStatus === 'FAILED_CREATED' && <ReloadKeyButton election={election} />}
              <ElectionKeyStatusBadge status={election.keyStatus} />
            </>
          )}
          <ElectionTypeBadge type={election.type} />
          <ElectionStatusBadge status={election.status} />
        </div>
      </div>
      <Typography variant="h2">{election.name}</Typography>
      <CardContent>
        <div className="flex flex-col gap-4 text-secondary-200">
          <div className="flex items-center gap-2">
            <MapPin />
            <Typography variant="small" className="text-secondary-200">
              อำเภอ/เขต: {election.district} จังหวัด: {election.province}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Calendar />
            <Typography variant="small" className="text-secondary-200">
              ช่วงเวลาลงคะแนน:{' '}
              {getTimelineString(new Date(election.openVoting), new Date(election.closeVoting))}
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Users />
            <Typography variant="small" className="text-secondary-200">
              ผู้มีสิทธิ์เลือกตั้ง: {election.totalVoters} คน
            </Typography>
          </div>
        </div>
        <Typography variant="large" className="mt-4">
          จำนวนลงคะแนน
        </Typography>
        <div className="flex items-center justify-between">
          <Typography variant="large" className="text-primary">
            {election.totalVoters} คน
          </Typography>
          <div className="flex items-center gap-2">
            <DownloadVotersButton
              election={election}
              filename="รายชื่อผู้มีสิทธิ์เลือกตั้ง"
              text="รายชื่อผู้มีสิทธิ์เลือกตั้ง"
            />
            {election.type === 'HYBRID' &&
              (election.status === 'CLOSED_VOTE' || election.status === 'RESULT_ANNOUNCE') && (
                <DownloadVotersButton
                  election={election}
                  isRegistered={true}
                  filename="รายชื่อผู้มีสิทธิ์ที่ยังไม่ได้ลงทะเบียน"
                  text="รายชื่อผู้มีสิทธิ์ที่ยังไม่ได้ลงทะเบียน"
                />
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReloadKeyButton({ election }: { election: AdminGetElectionResponse }) {
  const queryClient = useQueryClient()
  const mutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/keys/reload')

  const onClick = useCallback(() => {
    if (mutation.isPending) return

    mutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: electionQueryKey(election.id),
          })
        },
      }
    )
  }, [mutation, queryClient, election])

  return (
    <Button variant="outline" size="icon" onClick={onClick} disabled={mutation.isPending}>
      <RefreshCw />
    </Button>
  )
}

function DownloadVotersButton({
  election,
  isRegistered,
  filename,
  text,
}: {
  election: AdminGetElectionResponse
  isRegistered?: boolean
  filename?: string
  text?: string
}) {
  const [isPending, setIsPending] = useState(false)

  const onClick = useCallback(async () => {
    setIsPending(true)

    const { data, error } = await fetchClient('/admin/elections/:electionId/eligible-voters', {
      params: { electionId: election.id },
      query: { isRegistered },
    })

    if (error) {
      console.error('Failed fetching voters', error)
      return
    }

    downloadCSV(data.headers, data.voters, filename)

    setIsPending(false)
  }, [election, isRegistered, filename])

  return (
    <Button variant={isRegistered ? 'default' : 'outline'} onClick={onClick} disabled={isPending}>
      <Download className="mr-2" />
      {text}
    </Button>
  )
}

function electionQueryKey(electionId: string) {
  return reactQueryClient.getQueryKey('/admin/elections/:electionId', {
    pathParams: { electionId },
  })
}
