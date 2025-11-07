import { useCallback, useEffect, useRef, useState } from 'react'

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
import { Card } from '@pple-today/web-ui/card'
import { Typography } from '@pple-today/web-ui/typography'
import { cn } from '@pple-today/web-ui/utils'
import { useQueryClient } from '@tanstack/react-query'
import { Link, redirect, useNavigate } from '@tanstack/react-router'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { Engagements } from 'components/Engagements'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { PollBadge } from 'components/poll/PollBadge'
import { PollDetailComments } from 'components/poll/PollDetailComment'
import { PollEdit } from 'components/poll/PollEdit'
import dayjs from 'dayjs'
import {
  Calendar,
  CalendarX2,
  EyeOff,
  LinkIcon,
  Megaphone,
  MessageCircleQuestionMark,
  Pencil,
  Trash2,
} from 'lucide-react'

import {
  DeletePollParams,
  GetPollByIdResponse,
  UpdatePollBody,
  UpdatePollParams,
} from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from './route'

export function Data() {
  const { pollId } = Route.useParams()
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string>('')

  const handleOpenResult = (option: string) => {
    if (option === selectedOptionId) {
      setIsResultOpen(false)
      setSelectedOptionId('')
    } else {
      setIsResultOpen(true)
      setSelectedOptionId(option)
    }
  }

  useEffect(() => {
    if (!pollId) {
      redirect({ to: '/activity/poll' })
      return
    }
  }, [pollId])

  const pollDetailQuery = reactQueryClient.useQuery(
    '/admin/polls/:pollId',
    {
      pathParams: {
        pollId: pollId,
      },
    },
    {
      enabled: !!pollId,
    }
  )

  const patchMutation = reactQueryClient.useMutation('patch', '/admin/polls/:pollId')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/polls/:pollId')

  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/polls/:pollId', {
        pathParams: {
          pollId: pollId,
        },
      }),
    })
  }, [queryClient, pollId])

  const setPollStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdatePollBody['status']> },
      { pollId }: UpdatePollParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { pollId }, body: { status } },
        {
          onSuccess: () => {
            invalidateQuery()
          },
        }
      )
    },
    [patchMutation, invalidateQuery]
  )

  const deletePoll = useCallback(
    (pollId: DeletePollParams['pollId']) => {
      deleteMutation.mutateAsync(
        { pathParams: { pollId } },
        {
          onSuccess: () => {
            navigate({ to: '/activity/poll' })
          },
        }
      )
    },
    [deleteMutation, navigate]
  )

  if (!pollDetailQuery.data) return null

  if (pollDetailQuery.isLoading) return <p>Loading...</p>

  return (
    <div className="px-6 pb-6 space-y-4">
      <Breadcrumb className="pt-4">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/activity">Activity</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/activity/poll">Poll</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {pollDetailQuery.data?.title ? pollDetailQuery.data.title : 'รายละเอียดแบบสอบถาม'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <MessageCircleQuestionMark className="stroke-base-primary-default" size={32} />
          <Typography variant="h2">รายละเอียดแบบสอบถาม</Typography>
        </div>
        <div className="flex gap-3 justify-end">
          {pollDetailQuery.data?.status === 'PUBLISHED' && (
            <Button
              variant="secondary"
              size="icon"
              className="size-8"
              disabled={patchMutation.isPending}
              aria-busy={patchMutation.isPending}
              onClick={() => setPollStatus({ status: 'ARCHIVED' }, { pollId })}
            >
              <span className="sr-only">เก็บในคลัง</span>
              <EyeOff className="size-4" />
            </Button>
          )}
          {pollDetailQuery.data?.status === 'DRAFT' && (
            <Button
              size="icon"
              className="size-8"
              disabled={patchMutation.isPending}
              aria-busy={patchMutation.isPending}
              onClick={() => setPollStatus({ status: 'PUBLISHED' }, { pollId })}
            >
              <span className="sr-only">ประกาศ</span>
              <Megaphone className="size-4" />
            </Button>
          )}
          {pollDetailQuery.data && (
            <PollEdit
              trigger={
                <Button variant="outline" size="icon" className="size-8">
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </Button>
              }
              onSuccess={invalidateQuery}
              poll={pollDetailQuery.data}
            />
          )}
          <Button
            variant="outline-destructive"
            size="icon"
            className="size-8"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => {
              confirmDialogRef.current?.confirm({
                title: `ต้องการลบแบบสอบถาม "${pollDetailQuery.data?.title}" หรือไม่?`,
                description: 'เมื่อลบแบบสอบถามนี้แล้วจะไม่สามารถกู้คืนได้อีก',
                onConfirm: () => deletePoll(pollId),
              })
            }}
          >
            <span className="sr-only">ลบ</span>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className={cn('grid gap-4', isResultOpen ? 'grid-cols-3' : 'grid-cols-2')}>
        <PollInfoSection
          data={pollDetailQuery.data}
          handleOptionClick={handleOpenResult}
          selectOption={selectedOptionId}
        />
        {isResultOpen && <PollAnswerSection optionId={selectedOptionId} />}
      </div>
      <PollCommentSection id={pollDetailQuery.data.id} />
      <ConfirmDialog ref={confirmDialogRef} />
    </div>
  )
}

interface PollInfoProps {
  data: GetPollByIdResponse
  selectOption: string
  handleOptionClick: (option: string) => void
}

const PollInfoSection = ({ data, selectOption, handleOptionClick }: PollInfoProps) => {
  const totalVotes = data.totalVotes
  const upVotes = data.reactions.find((r) => r.type === 'UP_VOTE')?.count ?? 0
  const downVotes = data.reactions.find((r) => r.type === 'DOWN_VOTE')?.count ?? 0

  return (
    <Card className="bg-base-bg-light shadow-none font-normal col-span-2">
      <Typography variant="h2">{data.title}</Typography>
      {/* ID and Dates Section */}
      <div className="text-base-text-medium">
        <div className="flex justify-between flex-row mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-base-text-medium text-sm">
              <LinkIcon size={16} />
              <span>ID:</span>
            </div>
            <FeedDetailCopyId id={data.id} />
          </div>
          <PollBadge poll={data} />
        </div>

        <div className="flex items-start gap-2 text-sm flex-col font-normal">
          <div className="flex flex-row items-center gap-1">
            <Calendar className="size-4 text-base-text-medium" />
            <p>วันที่ประกาศ:</p>
            <p>{data.publishedAt ? dayjs(data.publishedAt).format('DD/MM/YY') : '-'}</p>
          </div>
          <div className="flex flex-row items-center gap-1">
            <CalendarX2 className="size-4 text-base-text-medium" />
            <p>วันที่หมดอายุ:</p>
            <p>{dayjs(data.endAt).format('DD/MM/YY')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm"></div>
      </div>

      {/* Poll Options Section */}
      <div className="gap-2 flex flex-col">
        {data.options.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0

          return (
            <button
              key={option.id}
              className={cn(
                'relative overflow-hidden rounded-xl bg-base-bg-white border border-base-outline-medium font-light px-4 py-3 ',
                selectOption === option.id && 'border-base-primary-dark'
              )}
              onClick={() => handleOptionClick(option.id)}
            >
              {/* Progress Bar Background */}
              <div
                className={cn(
                  'absolute inset-0 bg-base-bg-medium rounded-xl',
                  selectOption === option.id && 'bg-base-primary-light'
                )}
                style={{ width: `${percentage}%` }}
              />

              {/* Content */}
              <div
                className={cn(
                  'relative flex items-center justify-between z-10 ',
                  selectOption === option.id && 'text-base-primary-dark'
                )}
              >
                <p>{option.title}</p>
                <p>{option.votes} คน</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Topics Section */}
      {data.topics.length > 0 && (
        <div className="flex flex-row items-center justify-start gap-1">
          <p className="text-sm text-base-text-medium">หัวข้อ:</p>
          <div className="flex flex-wrap gap-1">
            {data.topics.map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-row gap-1">
        <span className="text-sm font-light">การมีส่วนร่วม:</span>
        <Engagements likes={upVotes} dislikes={downVotes} comments={data.commentCount} />
      </div>
    </Card>
  )
}

const PollCommentSection = ({ id }: { id: string }) => {
  const queryClient = useQueryClient()

  const pollCommentsQuery = reactQueryClient.useQuery(
    '/admin/feeds/:id/comments',
    {
      pathParams: {
        id,
      },
    },
    {
      enabled: !!id,
    }
  )

  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/feeds/:id/comments', {
        pathParams: { id },
      }),
    })
  }, [queryClient, id])

  if (!pollCommentsQuery.data) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 p-4 border border-base-outline-default bg-base-bg-light rounded-xl">
      <Typography variant="h4">ความคิดเห็น</Typography>
      {pollCommentsQuery.data.length > 0 ? (
        pollCommentsQuery.data.map((comment) => (
          <PollDetailComments
            key={comment.id}
            feedItemComment={comment}
            invalidate={invalidateQuery}
          />
        ))
      ) : (
        <div className="flex items-center justify-center h-40">ไม่มีคอมเมนต์</div>
      )}
    </div>
  )
}

const PollAnswerSection = ({ optionId }: { optionId: string | null }) => {
  if (optionId === '') return null

  return (
    <Card className="bg-base-bg-light shadow-none font-normal col-span-1">
      <Typography variant="h4">Poll Results</Typography>
      <div>Option ID: {optionId}</div>
    </Card>
  )
}
