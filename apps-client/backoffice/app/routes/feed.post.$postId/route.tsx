import React, { useCallback, useMemo, useRef } from 'react'

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
import { createFileRoute } from '@tanstack/react-router'
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { Engagements } from 'components/Engagements'
import { FeedDetailComments } from 'components/feed/FeedDetailComments'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { PostGallery } from 'components/feed/PostGallery'
import { Calendar, EyeOff, Link, Megaphone, Trash2 } from 'lucide-react'
import { getRelativeTime } from 'utils/date'

import { UpdatePostBody, UpdatePostParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

export const Route = createFileRoute('/feed/post/$postId')({
  component: PostDetailPage,
  head: ({ params }) => ({ meta: [{ title: `Post - ${params.postId}` }] }),
})
function PostDetailPage() {
  const navigate = useNavigate()
  const { postId } = Route.useParams()
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/posts/:postId', {
    pathParams: { postId },
  })
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/posts/:postId')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/posts/:postId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/posts/:postId', {
        pathParams: { postId },
      }),
    })
  }, [queryClient, postId])

  const setPostStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdatePostBody['status']> },
      { postId }: UpdatePostParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { postId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/posts/:postId', {
                pathParams: { postId },
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
  const deletePost = () => {
    confirmDialogRef.current?.confirm({
      title: `ต้องการลบโพสต์หรือไม่?`,
      description: 'เมื่อลบโพสต์แล้วจะไม่สามารถกู้คืนได้อีก',
      onConfirm: () =>
        deleteMutation.mutateAsync(
          { pathParams: { postId } },
          { onSuccess: () => navigate('/feed/post') }
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
              <Link to="/feed">Feed</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/feed/post">Post</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {query.data?.content ? query.data.content : 'รายละเอียดโพสต์'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <Megaphone className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดโพสต์</Typography>
        {query.data && query.data.status !== 'DELETED' && (
          <div className="ml-auto flex gap-3">
            {query.data.status === 'PUBLISHED' ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setPostStatus({ status: 'HIDDEN' }, { postId: query.data.id })}
              >
                <span className="sr-only">ซ่อน</span>
                <EyeOff className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setPostStatus({ status: 'PUBLISHED' }, { postId: query.data.id })}
              >
                <span className="sr-only">ประกาศ</span>
                <Megaphone className="size-4" />
              </Button>
            )}
            <Button
              variant="outline-destructive"
              size="icon"
              className="size-8"
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
              onClick={deletePost}
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
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex items-center gap-1 text-base-text-medium text-sm">
                  <Link size={16} />
                  <span>ID:</span>
                </div>
                <FeedDetailCopyId id={query.data.id} />
              </div>
              {query.data.status === 'PUBLISHED' ? (
                <Badge variant="success">ประกาศแล้ว</Badge>
              ) : query.data.status === 'HIDDEN' ? (
                <Badge variant="secondary">ซ่อน</Badge>
              ) : (
                <Badge variant="destructive">ลบแล้ว</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-base-text-medium text-sm">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>วันที่โพสต์:</span>
              </div>
              <div>
                {new Date(query.data.createdAt).toLocaleDateString('th', {
                  dateStyle: 'short',
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <img
                className="size-8 shrink-0 rounded-full"
                src={query.data.author.profileImage ?? '/images/placeholder.svg'}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="text-sm font-medium text-base-text-high">
                  {query.data.author.name}
                </div>
                <div className="text-sm text-base-text-medium leading-tight">
                  {[
                    query.data.author.responsibleArea,
                    getRelativeTime(new Date(query.data.createdAt)),
                  ]
                    .filter((x) => x)
                    .join(' | ')}
                </div>
              </div>
            </div>
            <PostGallery images={query.data.attachments.map((a) => a.attachmentPath)} />
            <p className="font-serif">{query.data.content}</p>
            <div className="flex items-start gap-2 text-base-text-medium text-sm">
              <span>แฮชแท็ก:</span>
              <div className="flex-1 min-w-0 flex gap-2 flex-wrap">
                {query.data.hashtags.length > 0 ? (
                  query.data.hashtags.map((h) => (
                    <Badge key={h.id} variant="secondary">
                      {h.name}
                    </Badge>
                  ))
                ) : (
                  <span>ไม่มี</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 -mt-2">
              <div className="flex items-center gap-1 text-base-text-medium text-sm">
                การมีส่วนร่วม:
              </div>
              <Engagements likes={upVotes} dislikes={downVotes} comments={commentsCount} />
            </div>
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
