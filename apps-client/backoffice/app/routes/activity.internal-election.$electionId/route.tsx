import { useCallback, useReducer } from 'react'
import { NavLink } from 'react-router'
import { useNavigate } from 'react-router'

import { Avatar, AvatarImage } from '@pple-today/web-ui/avatar'
import { Badge } from '@pple-today/web-ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Button } from '@pple-today/web-ui/button'
import { Card, CardContent } from '@pple-today/web-ui/card'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { cn } from '@pple-today/web-ui/utils'
import { useQueryClient } from '@tanstack/react-query'
import ElectionKeyStatusBadge from 'components/election/ElectionKeyStatusBadge'
import ElectionResultAnnouceDialog from 'components/election/ElectionResultAnnouceDialog'
import ElectionStatusBadge from 'components/election/ElectionStatusBadge'
import ElectionTypeBadge from 'components/election/ElectionTypeBadge'
import {
  Calendar,
  CalendarX2,
  CircleAlert,
  Download,
  Eye,
  Link,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Users,
  Vote,
} from 'lucide-react'
import { downloadCSV } from 'utils/csv'
import { getTimelineString } from 'utils/date'

import { AdminGetElectionResponse, AdminGetResultResponse } from '@api/backoffice/admin'

import { fetchClient, reactQueryClient } from '~/libs/api-client'
import { exhaustiveGuard } from '~/libs/exhaustive-guard'
import {
  EditOnsiteResultContext,
  EditOnsiteResultReducer,
  useEditOnsiteResultContext,
} from '~/routes/activity.internal-election.$electionId/context'

import { Route } from '.react-router/types/app/+types/root'

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
      <Breadcrumbs name={electionQuery.data?.name || '-'} />
      {electionQuery.isSuccess && (
        <>
          <Header election={electionQuery.data} />
          <ElectionDetail election={electionQuery.data} />
          {resultQuery.isSuccess && (
            <ElectionCandidate election={electionQuery.data} result={resultQuery.data} />
          )}
        </>
      )}
    </div>
  )
}

function Breadcrumbs({ name }: { name: string }) {
  return (
    <Breadcrumb className="mt-4">
      <BreadcrumbList>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <NavLink to="/activity">Activity</NavLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <NavLink to="/activity/internal-election">Internal Election</NavLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

const electionQueryKey = (electionId: string) =>
  reactQueryClient.getQueryKey('/admin/elections/:electionId', {
    pathParams: { electionId },
  })

const resultQueryKey = (electionId: string) =>
  reactQueryClient.getQueryKey('/admin/elections/:electionId/result', {
    pathParams: { electionId },
  })

function Header({ election }: { election: AdminGetElectionResponse }) {
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/elections/:electionId')
  const cancelMutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/cancel')
  const publishMutation = reactQueryClient.useMutation(
    'put',
    '/admin/elections/:electionId/publish'
  )

  const deleteElection = useCallback(() => {
    if (deleteMutation.isPending) return

    deleteMutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      {
        onSuccess: () => navigate('/activity/internal-election'),
      }
    )
  }, [deleteMutation, navigate, election])

  const cancelElection = useCallback(() => {
    if (cancelMutation.isPending) return

    cancelMutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: electionQueryKey(election.id),
          })
        },
      }
    )
  }, [cancelMutation, queryClient, election])

  const publishElection = useCallback(() => {
    if (publishMutation.isPending) return

    publishMutation.mutateAsync(
      {
        pathParams: { electionId: election.id },
        body: { publishDate: new Date() },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: electionQueryKey(election.id),
          })
        },
      }
    )
  }, [publishMutation, queryClient, election])

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-4">
        <Vote size={30} className="text-primary" />
        <Typography variant="h1">รายละเอียดการเลือกตั้ง</Typography>
      </div>
      <div className="flex items-center gap-2">
        {election.status === 'DRAFT' ? (
          <>
            <Button variant="outline" size="icon" onClick={deleteElection}>
              <Trash2 />
            </Button>
            <Button
              variant="default"
              size="icon"
              disabled={election.keyStatus !== 'CREATED'}
              onClick={publishElection}
            >
              <Eye className="text-white" />
            </Button>
            <Button variant="default" className="space-x-2">
              <Pencil className="text-white" />
              <Typography variant="small" className="text-white">
                แก้ไขการเลือกตั้ง
              </Typography>
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={election.isCancelled} onClick={cancelElection}>
            <CalendarX2 className="text-system-danger-default" strokeWidth={1} size={20} />
            <Typography variant="small" className="ml-2">
              ยกเลิกการเลือกตั้ง
            </Typography>
          </Button>
        )}
      </div>
    </div>
  )
}

function ElectionDetail({ election }: { election: AdminGetElectionResponse }) {
  const queryClient = useQueryClient()
  const reloadKeyMutation = reactQueryClient.useMutation(
    'put',
    '/admin/elections/:electionId/keys/reload'
  )

  const reloadKeyElection = useCallback(() => {
    if (reloadKeyMutation.isPending) return

    reloadKeyMutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: electionQueryKey(election.id),
          })
        },
      }
    )
  }, [reloadKeyMutation, queryClient, election])

  const downloadEligibleVoters = useCallback(
    async ({ isRegistered, filename }: { isRegistered?: boolean; filename?: string }) => {
      const { data, error } = await fetchClient('/admin/elections/:electionId/eligible-voters', {
        params: { electionId: election.id },
        query: { isRegistered },
      })

      if (error) {
        console.error('Failed fetching voters', error)
        return
      }

      downloadCSV(data, filename)
    },
    [election]
  )

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
              {election.keyStatus === 'FAILED_CREATED' && (
                <Button variant="outline" size="icon" onClick={reloadKeyElection}>
                  <RefreshCw className="text-secondary-200" />
                </Button>
              )}
              <ElectionKeyStatusBadge status={election.keyStatus} />
            </>
          )}
          <ElectionTypeBadge type={election.type} />
          <ElectionStatusBadge status={election.status} />
        </div>
      </div>
      <Typography variant="h2">เลือกตั้งผู้แทนเขต</Typography>
      <CardContent>
        <div className="flex flex-col gap-4 text-secondary-200">
          <div className="flex items-center gap-2">
            <MapPin />
            <Typography variant="small" className="text-secondary-200">
              อำเภอ/เขต: ลาดพร้าว จังหวัด: กรุงเทพมหานคร
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
            <Button
              variant="secondary"
              onClick={() => downloadEligibleVoters({ filename: 'รายชื่อผู้มีสิทธิ์เลือกตั้ง' })}
            >
              <Download className="mr-2" />
              รายชื่อผู้มีสิทธิ์เลือกตั้ง
            </Button>
            {election.type === 'HYBRID' &&
              (election.status === 'CLOSED_VOTE' || election.status === 'RESULT_ANNOUNCE') && (
                <Button
                  onClickCapture={() =>
                    downloadEligibleVoters({
                      isRegistered: false,
                      filename: 'รายชื่อผู้มีสิทธิ์ที่ยังไม่ได้ลงทะเบียน',
                    })
                  }
                >
                  <Download className="mr-2" />
                  รายชื่อผู้มีสิทธิ์ที่ยังไม่ได้ลงทะเบียน
                </Button>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ElectionCandidate({
  election,
  result,
}: {
  election: AdminGetElectionResponse
  result: AdminGetResultResponse
}) {
  const editOnsiteResultInit = {
    isEdit: false,
    result: result.candidates.map((candidate) => ({
      candidateId: candidate.id,
      votes: candidate.result.onsite,
    })),
  }

  const [state, dispatch] = useReducer(EditOnsiteResultReducer, editOnsiteResultInit)

  return (
    <Card>
      <EditOnsiteResultContext.Provider value={{ state, dispatch }}>
        <div className="flex justify-between">
          <Typography variant="h3">ผู้ลงสมัคร</Typography>
          <TopRightCandidate election={election} />
        </div>
        <Candidates election={election} result={result} />
      </EditOnsiteResultContext.Provider>
    </Card>
  )
}

function TopRightCandidate({ election }: { election: AdminGetElectionResponse }) {
  const {
    state: { isEdit, result: results },
    dispatch,
  } = useEditOnsiteResultContext()

  const toggleEdit = useCallback(() => {
    dispatch({ type: 'toggle' })
  }, [dispatch])

  const queryClient = useQueryClient()
  const submitOnsiteResultMutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/result/onsite'
  )

  const submitOnsiteResult = useCallback(() => {
    if (submitOnsiteResultMutation.isPending) return

    submitOnsiteResultMutation.mutateAsync(
      {
        pathParams: { electionId: election.id },
        body: results,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: resultQueryKey(election.id),
          })
        },
        onSettled: () => {
          toggleEdit()
        },
      }
    )
  }, [queryClient, submitOnsiteResultMutation, election, results, toggleEdit])

  switch (election.status) {
    case 'DRAFT':
    case 'NOT_OPENED_VOTE':
      return (
        <Button>
          <Pencil />
          <Typography variant="small" className="text-white ml-2">
            แก้ไขรายชื่อผู้สมัคร
          </Typography>
        </Button>
      )
    case 'OPEN_VOTE':
      return (
        <Typography variant="small" className="text-secondary-200 flex items-center gap-2">
          <CircleAlert />
          ผลคะแนนจะปรากฏเมื่อปิดหีบ
        </Typography>
      )
    case 'CLOSED_VOTE':
      return (
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            {(election.type === 'ONLINE' || election.type === 'HYBRID') && (
              <CountBallot election={election} />
            )}
            {(election.type === 'ONSITE' || election.type === 'HYBRID') &&
              (!isEdit ? (
                <Button variant="outline" className="flex items-center gap-2" onClick={toggleEdit}>
                  <Pencil />
                  <Typography variant="small">กรอกผลการเลือกตั้งในสถานที่</Typography>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={submitOnsiteResult}
                  disabled={submitOnsiteResultMutation.isPending}
                >
                  <Save />
                  <Typography variant="small">บันทึกผลการเลือกตั้งในสถานที่</Typography>
                </Button>
              ))}
            <ElectionResultAnnouceDialog />
          </div>
          <CandidateHeader election={election} />
        </div>
      )
    case 'RESULT_ANNOUNCE':
    case 'CANCELLED':
      return <CandidateHeader election={election} />
    default:
      exhaustiveGuard(election.status)
  }
}

function CandidateHeader({ election }: { election: AdminGetElectionResponse }) {
  return (
    <div className="flex items-center">
      <Typography className="w-32 flex items-center" variant="small">
        {election.type === 'ONLINE' || (election.type === 'HYBRID' && 'เลือกตั้งออนไลน์')}
      </Typography>
      <Typography className="w-32 flex items-center" variant="small">
        {election.type === 'ONSITE' || (election.type === 'HYBRID' && 'เลือกตั้งในสถานที่')}
      </Typography>
      <Typography className="w-52 flex items-center justify-end" variant="large">
        คะแนนรวม
      </Typography>
    </div>
  )
}

function CountBallot({ election }: { election: AdminGetElectionResponse }) {
  const queryClient = useQueryClient()
  const countMutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/ballots/count'
  )

  const countElection = useCallback(() => {
    if (countMutation.isPending) return

    countMutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: electionQueryKey(election.id),
          })
        },
      }
    )
  }, [countMutation, queryClient, election])

  return (
    <div className="flex items-center gap-2">
      {election.onlineResultStatus === 'COUNT_FAILED' && (
        <>
          <Button variant="outline" size="icon">
            <RefreshCw />
          </Button>
          <Badge variant="destructive" className="text-md">
            มีข้อผิดพลาด
          </Badge>
        </>
      )}
      <Button onClick={countElection}>
        <RefreshCw className="mr-2" /> นับคะแนน
      </Button>
    </div>
  )
}

function Candidates({
  election,
  result,
}: {
  election: AdminGetElectionResponse
  result: AdminGetResultResponse
}) {
  const {
    state: { isEdit },
  } = useEditOnsiteResultContext()

  return (
    <div className="space-y-2">
      {result.candidates.map((candidate) => (
        <div key={candidate.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {candidate.number && (
              <div className="w-9 flex flex-col items-center">
                <Typography variant="small" className="text-primary">
                  เบอร์
                </Typography>
                <Typography variant="h2" component="div" className="text-primary" fontWeight="bold">
                  {candidate.number}
                </Typography>
              </div>
            )}
            {candidate.profileImagePath && (
              <Avatar className="size-10">
                <AvatarImage
                  src={candidate.profileImagePath}
                  alt={candidate.id}
                  className="object-cover"
                />
              </Avatar>
            )}
            <Typography variant="p">{candidate.name}</Typography>
          </div>
          {(election.status === 'CLOSED_VOTE' ||
            election.status === 'RESULT_ANNOUNCE' ||
            election.isCancelled) && (
            <div className="flex items-center gap-2">
              <VoteScore score={candidate.result.online} />
              {isEdit ? (
                <VoteScoreInput candidateId={candidate.id} />
              ) : (
                <VoteScore score={candidate.result.onsite} />
              )}
              <VoteScore score={candidate.result.totalPercent} isPercent />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function VoteScore({ score, isPercent }: { score: number; isPercent?: boolean }) {
  return (
    <div
      className={cn(
        'w-32 flex h-10  font-sans  rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground',
        {
          'border-primary w-52 text-primary relative text-right': isPercent,
        }
      )}
    >
      {score}
      {isPercent ? '%' : ' คน'}
      {isPercent && (
        <div
          className="absolute right-0 top-0 bottom-0 rounded-md bg-primary-300"
          style={{ left: `${100 - score}%` }}
        />
      )}
    </div>
  )
}

function VoteScoreInput({ candidateId }: { candidateId: string }) {
  const {
    state: { result },
    dispatch,
  } = useEditOnsiteResultContext()
  const vote = result.find((r) => r.candidateId === candidateId)?.votes || 0

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const votes = Number(e.target.value)
    if (isNaN(votes)) return

    dispatch({
      type: 'set',
      payload: { candidateId, votes },
    })
  }

  return (
    <Input
      className="w-32"
      placeholder="กรอกคะแนน"
      type="number"
      value={vote}
      onChange={onChange}
    />
  )
}
