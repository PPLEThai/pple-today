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
import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { FeedTopicCard } from 'components/feed/FeedTopicCard'
import { TopicEdit } from 'components/feed/TopicEdit'
import { Calendar, Link, MessageSquareHeart, Pencil, Users } from 'lucide-react'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from '../feed.topic.$topicId/+types/route'

export default function HashtagEditPage({ params }: Route.LoaderArgs) {
  const { topicId } = params

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/topics/:topicId', {
    pathParams: { topicId },
  })
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/topics/:topicId', {
        pathParams: { topicId },
      }),
    })
  }, [queryClient, topicId])

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
              <NavLink to="/feed/topic">Topic</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {query.data?.name ? query.data.name : 'รายละเอียดหัวข้อ'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <MessageSquareHeart className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดหัวข้อ</Typography>
        {query.data && (
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
                {query.data.name}
              </Typography>
              {query.data.status === 'PUBLISHED' ? (
                <Badge variant="success">เปิดใช้งาน</Badge>
              ) : (
                <Badge variant="destructive">ระงับการใช้งาน</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-base-text-medium text-sm">
                <Link size={16} />
                <span>ID:</span>
              </div>
              <FeedDetailCopyId id={query.data.id} />
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
                  {query.data.followersCount !== undefined && (
                    <div className="flex gap-1">
                      <dt className="flex items-center gap-1">
                        <Users size={16} />
                        <span>ยอดผู้ติดตาม:</span>
                      </dt>
                      <dd>{query.data.followersCount.toLocaleString('th')} คน</dd>
                    </div>
                  )}
                </dl>
                <div className="flex items-start gap-2">
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
              </div>
              <img
                className="shrink-0 w-[236px] h-[120px] overflow-hidden rounded-xl bg-base-bg-dark"
                src={query.data.bannerImage?.url}
                alt=""
                width={236}
                height={120}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4 border border-base-outline-default rounded-xl">
            <Typography variant="h4">ตัวอย่างบนหน้าแอป</Typography>
            <div className="flex gap-4">
              <FeedTopicCard topic={query.data} />
              <FeedTopicCard topic={query.data} horizontal />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
