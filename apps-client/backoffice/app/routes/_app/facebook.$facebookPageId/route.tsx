import { useCallback } from 'react'

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
import { createFileRoute, Link } from '@tanstack/react-router'
import { FacebookPageEdit } from 'components/facebook/FacebookPageEdit'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import {
  ArrowUpRight,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Facebook,
  LinkIcon,
  Pencil,
  Users,
  X,
} from 'lucide-react'
import { formatDisplayDate } from 'utils/date'

import { UpdateFacebookPageBody, UpdateFacebookPageParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { Data } from '../feed.post.index/-data'

export const Route = createFileRoute('/_app/facebook/$facebookPageId')({
  component: FacebookDetailPage,
})

function FacebookDetailPage() {
  const { facebookPageId } = Route.useParams()

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/facebook/:facebookPageId', {
    pathParams: { facebookPageId },
  })
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/facebook/:facebookPageId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/facebook/:facebookPageId', {
        pathParams: { facebookPageId },
      }),
    })
  }, [queryClient, facebookPageId])

  const setFacebookPageStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateFacebookPageBody['status']> },
      { facebookPageId }: UpdateFacebookPageParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { facebookPageId }, body: { status } },
        {
          onSuccess: () => invalidateQuery(),
        }
      )
    },
    [invalidateQuery, patchMutation]
  )

  return (
    <div className="px-6 pb-6">
      <Breadcrumb className="py-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/facebook">Facebook</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{query.data?.name ? query.data.name : 'รายละเอียดเพจ'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <Facebook className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดเพจ</Typography>
        {query.data && (
          <div className="ml-auto flex gap-3">
            {query.data.linkedStatus === 'PENDING' && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setFacebookPageStatus({ status: 'APPROVED' }, { facebookPageId })}
                >
                  <span className="sr-only">อนุมัติ</span>
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  disabled={patchMutation.isPending}
                  aria-busy={patchMutation.isPending}
                  onClick={() => setFacebookPageStatus({ status: 'REJECTED' }, { facebookPageId })}
                >
                  <span className="sr-only">ไม่อนุมัติ</span>
                  <X className="size-4" />
                </Button>
              </>
            )}
            {query.data.linkedStatus === 'APPROVED' && (
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setFacebookPageStatus({ status: 'SUSPENDED' }, { facebookPageId })}
              >
                <span className="sr-only">ระงับการใช้งาน</span>
                <EyeOff className="size-4" />
              </Button>
            )}
            {query.data.linkedStatus === 'SUSPENDED' && (
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setFacebookPageStatus({ status: 'APPROVED' }, { facebookPageId })}
              >
                <span className="sr-only">เปิดใช้งาน</span>
                <Eye className="size-4" />
              </Button>
            )}
            <FacebookPageEdit
              trigger={
                <Button variant="outline" size="icon" className="size-8">
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </Button>
              }
              onSuccess={invalidateQuery}
              facebookPage={query.data}
            />
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
        <>
          <div className="flex flex-col gap-[10px]">
            <div className="flex flex-col gap-4 p-4 border border-base-outline-default rounded-xl">
              <div className="flex items-start gap-2">
                <Typography className="flex-1 min-w-0 truncate" variant="h3">
                  {query.data.name}
                </Typography>
                {query.data.linkedStatus === 'UNLINKED' ? (
                  <Badge className="bg-base-bg-invert">ลบโดยผู้ใช้</Badge>
                ) : query.data.linkedStatus === 'APPROVED' ? (
                  <Badge variant="success">อนุมัติ</Badge>
                ) : query.data.linkedStatus === 'REJECTED' ? (
                  <Badge variant="destructive">ไม่อนุมัติ</Badge>
                ) : query.data.linkedStatus === 'SUSPENDED' ? (
                  <Badge variant="secondary">ถูกระงับ</Badge>
                ) : (
                  <Badge variant="outline">รอการอนุมัติ</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-base-text-medium text-sm">
                  <LinkIcon size={16} />
                  <span>ID:</span>
                </div>
                <FeedDetailCopyId id={query.data.id} />
              </div>
              <div className="flex items-center w-fit rounded-xl border p-3 gap-2 bg-base-bg-light border-base-outline-default max-w-[350px]">
                <img
                  className="size-8 shrink-0 rounded-full"
                  src={query.data.user?.profileImagePath ?? '/images/placeholder.svg'}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
                <span className="flex-1 min-w-0 truncate font-serif">{query.data.user?.name}</span>
                {query.data.user?.id && (
                  <Button className="shrink-0" variant="outline" size="icon" asChild>
                    <Link to="/user/$userId" params={{ userId: query.data.user.id }}>
                      <span className="sr-only">รายละเอียดผู้ใช้งาน</span>
                      <ArrowUpRight className="stroke-base-primary-default" />
                    </Link>
                  </Button>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-4 text-base-text-medium text-sm">
                  <dl className="flex flex-col gap-1">
                    {query.data.createdAt !== undefined && (
                      <div className="flex gap-1">
                        <dt className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>วันที่สร้าง:</span>
                        </dt>
                        <dd>{formatDisplayDate(new Date(query.data.createdAt))}</dd>
                      </div>
                    )}
                    {query.data.numberOfFollowers !== undefined && (
                      <div className="flex gap-1">
                        <dt className="flex items-center gap-1">
                          <Users size={16} />
                          <span>ยอดผู้ติดตาม:</span>
                        </dt>
                        <dd>{query.data.numberOfFollowers.toLocaleString('th')} คน</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {query.data.user?.id && (
            <div className="flex flex-col gap-4 mt-6">
              <Data authorId={query.data.user.id} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
