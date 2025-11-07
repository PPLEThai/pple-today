import React, { useCallback } from 'react'

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
import { FeedDetailCopyId } from 'components/feed/FeedDetailCopyId'
import { UserEdit } from 'components/user/UserEdit'
import {
  Eye,
  EyeOff,
  Link as LinkIcon,
  MapPinned,
  Pencil,
  Phone,
  User,
  UserSquare,
} from 'lucide-react'
import { getUniqueDisplayRoles } from 'utils/roles'
import { telFormatter } from 'utils/tel'

import { UpdateUserBody, UpdateUserParams } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

export const Route = createFileRoute('/_app/user/$userId')({
  component: UserDetailPage,
  head: ({ params }) => ({ meta: [{ title: `รายละเอียดผู้ใช้งาน - ${params.userId}` }] }),
})

function UserDetailPage() {
  const { userId } = Route.useParams()

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery('/admin/users/:userId', {
    pathParams: { userId },
  })
  const patchMutation = reactQueryClient.useMutation('patch', '/admin/users/:userId')
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: reactQueryClient.getQueryKey('/admin/users/:userId', {
        pathParams: { userId },
      }),
    })
  }, [queryClient, userId])

  const setUserStatus = useCallback(
    (
      { status }: { status: NonNullable<UpdateUserBody['status']> },
      { userId }: UpdateUserParams
    ) => {
      if (patchMutation.isPending) return

      patchMutation.mutateAsync(
        { pathParams: { userId }, body: { status } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/users/:userId', {
                pathParams: { userId },
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

  return (
    <div className="px-6 pb-6">
      <Breadcrumb className="py-4">
        <BreadcrumbList>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/user">ผู้ใช้งาน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {query.data?.name ? query.data.name : 'รายละเอียดผู้ใช้งาน'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2 pb-3">
        <User className="stroke-base-primary-default" size={32} />
        <Typography variant="h2">รายละเอียดผู้ใช้งาน</Typography>
        {query.data && (
          <div className="ml-auto flex gap-3">
            {query.data.status === 'ACTIVE' ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setUserStatus({ status: 'SUSPENDED' }, { userId: query.data.id })}
              >
                <span className="sr-only">ระงับการใช้งาน</span>
                <EyeOff className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-8"
                disabled={patchMutation.isPending}
                aria-busy={patchMutation.isPending}
                onClick={() => setUserStatus({ status: 'ACTIVE' }, { userId: query.data.id })}
              >
                <span className="sr-only">เปิดใช้งาน</span>
                <Eye className="size-4" />
              </Button>
            )}
            <UserEdit
              trigger={
                <Button variant="outline" size="icon" className="size-8">
                  <span className="sr-only">แก้ไข</span>
                  <Pencil className="size-4" />
                </Button>
              }
              onSuccess={invalidateQuery}
              user={query.data}
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
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col gap-4 p-4 border border-base-outline-default rounded-xl">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex items-center gap-1 text-base-text-medium text-sm">
                  <LinkIcon size={16} />
                  <span>ID:</span>
                </div>
                <FeedDetailCopyId id={query.data.id} />
              </div>
              {query.data.status === 'ACTIVE' ? (
                <Badge variant="success">เปิดใช้งาน</Badge>
              ) : (
                <Badge variant="destructive">ระงับ</Badge>
              )}
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <Typography variant="h3">{query.data.name}</Typography>
                <div className="flex items-center gap-2 text-base-text-medium text-sm">
                  <div className="flex items-center gap-1">
                    <UserSquare size={16} />
                    <span>หน้าที่:</span>
                  </div>
                  <div className="flex-1 min-w-0 flex gap-2 flex-wrap">
                    {query.data.roles.length > 0 ? (
                      getUniqueDisplayRoles(query.data.roles).map((displayRole) => (
                        <Badge key={displayRole}>{displayRole}</Badge>
                      ))
                    ) : (
                      <span>ไม่มี</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-base-text-medium text-sm">
                  <div className="flex items-center gap-1">
                    <Phone size={16} />
                    <span>เบอร์โทร:</span>
                  </div>
                  <div>{telFormatter(query.data.phoneNumber)}</div>
                </div>
                <div className="flex items-center gap-2 text-base-text-medium text-sm">
                  <div className="flex items-center gap-1">
                    <MapPinned size={16} />
                    <span>พื้นที่:</span>
                  </div>
                  <div>{query.data.responsibleArea ?? '-'}</div>
                </div>
              </div>
              <img
                className="shrink-0 size-[144px] rounded-full overflow-hidden object-cover"
                src={query.data.profileImage ?? '/images/placeholder.svg'}
                alt=""
                width={144}
                height={144}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
