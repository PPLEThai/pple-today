import { useCallback } from 'react'
import { NavLink } from 'react-router'

import { Badge } from '@pple-today/web-ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@pple-today/web-ui/breadcrumb'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { Calendar, Facebook, Link, Users } from 'lucide-react'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from '../_auth.facebook.$facebookPageId/+types/route'
import { Data } from '../feed.post._index/data'

export function meta() {
  return [{ title: 'รายละเอียดเพจ' }]
}

export default function FacebookDetailPage({ params }: Route.LoaderArgs) {
  const { facebookPageId } = params

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/facebook/:facebookPageId', {
    pathParams: { facebookPageId },
  })
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/facebook/:facebookPageId', {
        pathParams: { facebookPageId },
      }),
    })
  }, [queryClient, facebookPageId])

  return (
    <div className="px-6 pb-6">
      <Breadcrumb className="py-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <NavLink to="/facebook">Facebook</NavLink>
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
        {/* {query.data && (
          <TopicEdit
            trigger={
              <Button className="ml-auto gap-1">
                <Pencil size={16} />
                แก้ไขหัวข้อ
              </Button>
            }
            onSuccess={invalidateQuery}
            topic={query.data}
          />
        )} */}
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
                  <Link size={16} />
                  <span>ID:</span>
                </div>
                <FeedDetailCopyId id={query.data.id} />
              </div>
              <div className="flex items-center w-fit rounded-xl border p-3 gap-2 bg-base-bg-light border-base-outline-default">
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
                        <dd>
                          {new Date(query.data.createdAt).toLocaleDateString('th', {
                            dateStyle: 'short',
                          })}
                        </dd>
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
