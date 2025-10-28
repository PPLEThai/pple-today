import React, { useCallback, useRef } from 'react'
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
import { ConfirmDialog, ConfirmDialogRef } from 'components/ConfirmDialog'
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { Calendar, Image, Link, Link2, Trash2 } from 'lucide-react'

import { UpdateBannerBody, UpdateBannerParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

import { Route } from '../feed.banner.$bannerId/+types/route'

export function meta() {
  return [{ title: 'รายละเอียดโพสต์' }]
}

export default function BannerDetailPage({ params }: Route.LoaderArgs) {
  const { bannerId } = params

  const navigate = useNavigate()
  const confirmDialogRef = useRef<ConfirmDialogRef>(null)

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/banners/:id', {
    pathParams: { id: bannerId },
  })
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/banners/:id')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/banners/:id')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/banners/:id', {
        pathParams: { id: bannerId },
      }),
    })
  }, [queryClient, bannerId])

  const setPostStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateBannerBody['status']> },
      { id }: UpdateBannerParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { id }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/banners/:id', {
                pathParams: { id: bannerId },
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
    [bannerId, patchMutation, queryClient]
  )
  const deleteBanner = useCallback(() => {
    if (deleteMutation.isPending) return

    confirmDialogRef.current?.confirm({
      title: `ต้องการลบแบนเนอร์หรือไม่?`,
      description: 'เมื่อลบแบนเนอร์แล้วจะไม่สามารถกู้คืนได้อีก',
      onConfirm: () =>
        deleteMutation.mutateAsync(
          { pathParams: { id: bannerId } },
          { onSuccess: () => navigate('/feed/banner') }
        ),
    })
  }, [bannerId, deleteMutation, navigate])

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
              <NavLink to="/feed/banner">Banner</NavLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {query.data?.headline ? query.data.headline : 'รายละเอียดแบนเนอร์'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <Image className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดแบนเนอร์</Typography>
        {query.data && (
          <div className="ml-auto flex gap-3">
            {/* {query.data.status === 'PUBLISHED' ? (
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
            )} */}
            <Button
              variant="outline-destructive"
              size="icon"
              className="size-8"
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
              onClick={deleteBanner}
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
              ) : query.data.status === 'ARCHIVED' ? (
                <Badge variant="secondary">เก็บในคลัง</Badge>
              ) : (
                <Badge variant="outline">ร่าง</Badge>
              )}
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
            <div className="flex items-center gap-4 p-4 border border-base-outline-default bg-base-bg-light rounded-xl">
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                {query.data.navigation === 'IN_APP_NAVIGATION' ? (
                  <Badge>In - app</Badge>
                ) : query.data.navigation === 'EXTERNAL_BROWSER' ? (
                  <Badge>External</Badge>
                ) : (
                  <Badge>Mini - app</Badge>
                )}
                <Typography variant="h3">{query.data.headline}</Typography>
                <div className="flex items-center gap-1 text-base-text-medium text-sm">
                  <Link2 size={16} />
                  <span>URL ที่เชื่อม:</span>
                  <FeedDetailCopyId id={query.data.id} />
                </div>
              </div>
              <img
                className="shrink-0 w-[320px] h-[180px] rounded-xl overflow-hidden object-cover"
                src={query.data.image.url}
                alt=""
                width={320}
                height={180}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog ref={confirmDialogRef} />
    </div>
  )
}
