import { useCallback, useReducer } from 'react'

import { Avatar, AvatarImage } from '@pple-today/web-ui/avatar'
import { Badge } from '@pple-today/web-ui/badge'
import { Button } from '@pple-today/web-ui/button'
import { Card } from '@pple-today/web-ui/card'
import { Input } from '@pple-today/web-ui/input'
import { Typography } from '@pple-today/web-ui/typography'
import { cn } from '@pple-today/web-ui/utils'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Pencil, RefreshCw, Save } from 'lucide-react'

import { AdminGetElectionResponse, AdminGetResultResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'
import { exhaustiveGuard } from '~/libs/exhaustive-guard'

import {
  EditOnsiteResultContext,
  EditOnsiteResultReducer,
  useEditOnsiteResultContext,
} from './-context'
import { ResultAnnouceDialog } from './-editOnisteResult'

export function CandidatesAndResult({
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
  switch (election.status) {
    case 'DRAFT':
    case 'NOT_OPENED_VOTE':
      return <EditCandidateButton />
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
            {(() => {
              switch (election.type) {
                case 'ONLINE':
                  return <CountBallot election={election} />
                case 'ONSITE':
                  return <EditOnsiteResultButton election={election} />
                case 'HYBRID':
                  return (
                    <>
                      <CountBallot election={election} />
                      <EditOnsiteResultButton election={election} />
                    </>
                  )
                default:
                  return null
              }
            })()}
            <ResultAnnouceDialog election={election} />
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

function EditOnsiteResultButton({ election }: { election: AdminGetElectionResponse }) {
  const {
    state: { isEdit, result: results },
    dispatch,
  } = useEditOnsiteResultContext()

  const toggleEdit = useCallback(() => {
    dispatch({ type: 'toggle' })
  }, [dispatch])

  const queryClient = useQueryClient()
  const mutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/result/onsite'
  )

  const submit = useCallback(() => {
    if (mutation.isPending) return

    mutation.mutateAsync(
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
  }, [queryClient, mutation, election, results, toggleEdit])

  return (
    <>
      {!isEdit ? (
        <Button variant="outline" className="flex items-center gap-2" onClick={toggleEdit}>
          <Pencil />
          <Typography variant="small">กรอกผลการเลือกตั้งในสถานที่</Typography>
        </Button>
      ) : (
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={submit}
          disabled={mutation.isPending}
        >
          <Save />
          <Typography variant="small">บันทึกผลการเลือกตั้งในสถานที่</Typography>
        </Button>
      )}
    </>
  )
}

function EditCandidateButton() {
  return (
    <Button>
      <Pencil />
      <Typography variant="small" className="text-white ml-2">
        แก้ไขรายชื่อผู้สมัคร
      </Typography>
    </Button>
  )
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
  const mutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/ballots/count'
  )

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
      <Button onClick={onClick} disabled={mutation.isPending}>
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
              {(() => {
                switch (election.type) {
                  case 'ONLINE':
                    return <VoteScore score={candidate.result.online} />
                  case 'ONSITE':
                    return (
                      <>
                        {isEdit ? (
                          <VoteScoreInput candidateId={candidate.id} />
                        ) : (
                          <VoteScore score={candidate.result.onsite} />
                        )}
                      </>
                    )
                  case 'HYBRID':
                    return (
                      <>
                        <VoteScore score={candidate.result.online} />
                        {isEdit ? (
                          <VoteScoreInput candidateId={candidate.id} />
                        ) : (
                          <VoteScore score={candidate.result.onsite} />
                        )}
                      </>
                    )
                  default:
                    return null
                }
              })()}
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

function electionQueryKey(electionId: string) {
  return reactQueryClient.getQueryKey('/admin/elections/:electionId', {
    pathParams: { electionId },
  })
}

function resultQueryKey(electionId: string) {
  return reactQueryClient.getQueryKey('/admin/elections/:electionId/result', {
    pathParams: { electionId },
  })
}
