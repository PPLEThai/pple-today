import { useCallback, useMemo, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router'

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
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT, AnnouncementIcon } from 'components/AnnouncementIcon'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { Engagements } from 'components/Engagements'
import { AnnouncementEdit } from 'components/feed/AnnouncementEdit'
import { FeedDetailComments } from 'components/feed/FeedDetailComments'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { Calendar, EyeOff, FileText, Link, Megaphone, Pencil, Trash2 } from 'lucide-react'

import { UpdateAnnouncementBody, UpdateAnnouncementParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from './+types/route'

export function meta() {
  return [{ title: 'รายละเอียดประกาศ' }]
}

export default function AnnouncementDetailPage({ params }: Route.LoaderArgs) {
  const navigate = useNavigate()
  const { announcementId } = params
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/announcements/:announcementId', {
    pathParams: { announcementId },
  })
  const patchMutation = reactQueryClient.useMutation(
    'patch',
    '/admin/announcements/:announcementId'
  )
  const deleteMutation = reactQueryClient.useMutation(
    'delete',
    '/admin/announcements/:announcementId'
  )
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/announcements/:announcementId', {
        pathParams: { announcementId },
      }),
    })
  }, [queryClient, announcementId])

  const setAnnouncementStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateAnnouncementBody['status']> },
      { announcementId }: UpdateAnnouncementParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { announcementId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/announcements/:announcementId', {
                pathParams: { announcementId },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                data.status = status
                return data
              }
            )
          },
        }
      )
    },
    [patchMutation, queryClient]
  )
  const deleteAnnouncement = () => {
    confirmDialogRef.current?.confirm({
      title: `ต้องการลบประกาศ "${query.data?.title}" หรือไม่?`,
      description: 'เมื่อลบประกาศแล้วจะไม่สามารถกู้คืนได้อีก',
      onConfirm: () =>
        deleteMutation.mutateAsync(
          { pathParams: { announcementId } },
          { onSuccess: () => navigate('/feed/announcement') }
        ),
    })
  }

  const { commentsCount, upVotes, downVotes } = useMemo(() => {
    const reactionCounts = query.data?.reactionCounts ?? []
    const commentsCount = query.data?.commentsCount ?? 0

    const upVotes = reactionCounts.find((r) => r.type === 'UP_VOTE')?.count ?? 0
    const downVotes = reactionCounts.find((r) => r.type === 'DOWN_VOTE')?.count ?? 0

    return {
      commentsCount,
      upVotes,
      downVotes,
    }
  }, [query.data?.commentsCount, query.data?.reactionCounts])

  return (
    <div className="px-6 pb-6">
      <Breadcrumb className="py-4">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/feed">Feed</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/feed/announcement">Announcement</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {query.data?.title ? query.data.title : 'รายละเอียดหัวข้อ'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <Megaphone className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดประกาศ</Typography>
        {query.data && (
          <div className="ml-auto flex gap-3">
            {query.data.status === 'PUBLISHED' ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() =>
                  setAnnouncementStatus({ status: 'ARCHIVED' }, { announcementId: query.data.id })
                }
              >
                <span className="sr-only">เก็บในคลัง</span>
                <EyeOff className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() =>
                  setAnnouncementStatus({ status: 'PUBLISHED' }, { announcementId: query.data.id })
                }
              >
                <span className="sr-only">ประกาศ</span>
                <Megaphone className="size-4" />
              </Button>
            )}
            <AnnouncementEdit
              trigger={
                <Button variant="outline" size="icon" className="size-8">
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </Button>
              }
              onSuccess={invalidateQuery}
              announcement={query.data}
            />
            <Button
              variant="outline-destructive"
              size="icon"
              className="size-8"
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
              onClick={deleteAnnouncement}
            >
              <span className="sr-only">ลบ</span>
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      {query.isLoading ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          Loading...
        </div>
      ) : query.data === undefined ? (
        <div className="flex items-center justify-center p-4 border border-base-outline-default rounded-xl h-40">
          ไม่มีข้อมูล
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col gap-4 p-4 border border-base-outline-default rounded-xl">
            <div className="flex items-start gap-2">
              <Typography className="flex-1 min-w-0 truncate" variant="h3">
                {query.data.title}
              </Typography>
              {query.data.status === 'PUBLISHED' ? (
                <Badge variant="success">ประกาศแล้ว</Badge>
              ) : query.data.status === 'ARCHIVED' ? (
                <Badge variant="secondary">เก็บในคลัง</Badge>
              ) : (
                <Badge variant="outline">ร่าง</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-base-text-medium text-sm">
                <Link size={16} />
                <span>ID:</span>
              </div>
              <FeedDetailCopyId id={query.data.id} />
            </div>
            <div className="flex items-center gap-2 text-base-text-medium text-sm">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>วันที่สร้าง:</span>
              </div>
              <div>
                {new Date(query.data.createdAt).toLocaleDateString('th', {
                  dateStyle: 'short',
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 text-base-text-medium text-sm">
              <AnnouncementIcon className="shrink-0 size-8" announcementType={query.data.type} />
              <div>{ANNOUNCEMENT_TYPE_LONG_DISPLAY_TEXT[query.data.type]}</div>
            </div>
            <p>{query.data.content}</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-base-text-medium text-sm">
                การมีส่วนร่วม:
              </div>
              <Engagements likes={upVotes} dislikes={downVotes} comments={commentsCount} />
            </div>
            <div className="flex items-start gap-2 text-base-text-medium text-sm">
              <span>หัวข้อ:</span>
              <div className="flex-1 min-w-0 flex gap-2 flex-wrap">
                {query.data.topics.length > 0 ? (
                  query.data.topics.map((t) => (
                    <Badge key={t.id} variant="secondary">
                      {t.name}
                    </Badge>
                  ))
                ) : (
                  <span>ไม่มี</span>
                )}
              </div>
            </div>
            {query.data.attachments.length > 0 && (
              <div className="flex items-center gap-2">
                {query.data.attachments.map((attachment) => (
                  <Button key={attachment.url} className="gap-1" asChild>
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                      <FileText size={16} />
                      ดูเอกสาร
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 p-4 border border-base-outline-default bg-base-bg-light rounded-xl">
            <Typography variant="h4">ความคิดเห็น</Typography>
            {query.data.comments.length > 0 ? (
              query.data.comments.map((comment) => (
                <FeedDetailComments
                  key={comment.id}
                  feedItemComment={comment}
                  invalidate={invalidateQuery}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-40">ไม่มีคอมเมนต์</div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog ref={confirmDialogRef} />
    </div>
  )
}
