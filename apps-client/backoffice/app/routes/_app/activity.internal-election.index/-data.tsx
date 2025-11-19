import { useCallback, useMemo, useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { DataTable } from '@pple-today/web-ui/data-table'
import { Typography } from '@pple-today/web-ui/typography'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { DtFilter } from 'components/datatable/DtFilter'
import { DtMovement } from 'components/datatable/DtMovement'
import { ElectionCreate } from 'components/election/ElectionCreate'
import ElectionStatusBadge from 'components/election/ElectionStatusBadge'
import ElectionTypeBadge from 'components/election/ElectionTypeBadge'
import { ElectionFormValues } from 'components/election/models'
import { TableCopyId } from 'components/TableCopyId'
import { CalendarX2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { getTimelineString } from 'utils/date'
import { handleUploadFile } from 'utils/file-upload'

import { AdminListElectionResponse, ElectionStatus, PublicFilePath } from '@api/backoffice/admin'

import { reactQueryClient } from '~/libs/api-client'

const columnHelper = createColumnHelper<AdminListElectionResponse['data'][number]>()

export const Data = () => {
  const [queryLimit, setQueryLimit] = useState(10)
  const [queryPage, setQueryPage] = useState(1)
  const [queryName, setQueryName] = useState('')
  const [queryStatus, setQueryStatus] = useState<ElectionStatus[]>()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const query = reactQueryClient.useQuery(
    '/admin/elections',
    {
      query: {
        limit: queryLimit,
        page: queryPage,
        name: queryName,
        status: queryStatus?.length === 0 ? undefined : queryStatus,
      },
    },
    {
      placeholderData: keepPreviousData,
    }
  )

  const createMutation = reactQueryClient.useMutation('post', '/admin/elections')
  const bulkCreateCandidateMutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/candidates'
  )
  const bulkAddEligibleVoterMutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/eligible-voters/bulk-create'
  )
  const createCandidateProfilePictureMutation = reactQueryClient.useMutation(
    'post',
    '/admin/elections/:electionId/candidates/upload-url'
  )
  const cancelMutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/cancel')
  const deleteMutation = reactQueryClient.useMutation('delete', '/admin/elections/:electionId')

  const createElection = useCallback(
    async (data: ElectionFormValues) => {
      if (createMutation.isPending) return

      const result = await createMutation.mutateAsync({
        body: {
          name: data.name,
          district: data.district,
          province: data.province,
          openVoting: data.openVoting,
          closeVoting: data.closeVoting,
          type: data.type,
          mode: data.mode,
          openRegister: data.openRegister,
          closeRegister: data.closeRegister,
        },
      })

      if (data.eligibleVoterFile) {
        const voterFile = await data.eligibleVoterFile.text()
        const phoneNumbers = voterFile
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
        await bulkAddEligibleVoterMutation.mutateAsync({
          pathParams: { electionId: result.id },
          body: {
            identifier: 'PHONE_NUMBER',
            phoneNumbers,
          },
        })
      }

      if (data.candidates.length > 0) {
        for (const candidate of data.candidates) {
          let profilePicturePath

          if (candidate.imageFile.type === 'NEW_FILE') {
            const uploadUrlResult = await createCandidateProfilePictureMutation.mutateAsync({
              pathParams: { electionId: result.id },
              body: {
                contentType: candidate.imageFile.file.type as any,
              },
            })

            await handleUploadFile(
              candidate.imageFile.file,
              uploadUrlResult.uploadUrl,
              uploadUrlResult.uploadFields
            )

            profilePicturePath = uploadUrlResult.fileKey
          }

          await bulkCreateCandidateMutation.mutateAsync({
            pathParams: { electionId: result.id },
            body: {
              name: candidate.name,
              description: null,
              number: candidate.number ?? null,
              profileImagePath: (profilePicturePath ?? null) as PublicFilePath | null,
            },
          })
        }
      }

      await queryClient.invalidateQueries({
        queryKey: reactQueryClient.getQueryKey('/admin/elections'),
      })
    },
    [
      bulkAddEligibleVoterMutation,
      bulkCreateCandidateMutation,
      createCandidateProfilePictureMutation,
      createMutation,
      queryClient,
    ]
  )

  const cancelElection = useCallback(
    (electionId: string) => {
      if (cancelMutation.isPending) return

      cancelMutation.mutateAsync(
        { pathParams: { electionId } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/elections', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  name: queryName,
                  status: queryStatus?.length === 0 ? undefined : queryStatus,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                const idx = data.data.findIndex((d) => d.id === electionId)
                if (idx === -1) return
                data.data[idx].isCancelled = true
                return data
              }
            )
          },
        }
      )
    },
    [cancelMutation, queryClient, queryLimit, queryPage, queryName, queryStatus]
  )

  const deleteElection = useCallback(
    (electionId: string) => {
      if (deleteMutation.isPending) return

      deleteMutation.mutateAsync(
        { pathParams: { electionId } },
        {
          onSuccess: () => {
            queryClient.setQueryData(
              reactQueryClient.getQueryKey('/admin/elections', {
                query: {
                  limit: queryLimit,
                  page: queryPage,
                  name: queryName,
                  status: queryStatus?.length === 0 ? undefined : queryStatus,
                },
              }),
              (_data) => {
                const data = structuredClone(_data)
                if (!data) return
                data.data = data.data.filter((d) => d.id !== electionId)
                return data
              }
            )
          },
        }
      )
    },
    [deleteMutation, queryClient, queryLimit, queryPage, queryName, queryStatus]
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => <div className="pl-2">ID</div>,
        cell: (info) => <TableCopyId id={info.getValue()} />,
        size: 64,
        minSize: 64,
        maxSize: 64,
      }),
      columnHelper.accessor('name', {
        header: 'ชื่อการเลือกตั้ง',
        cell: (info) => (
          <Link
            className="hover:underline"
            to="/activity/internal-election/$electionId"
            params={{ electionId: info.row.original.id }}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('district', {
        header: 'อำเภอ/เขต',
        cell: (info) => info.getValue() ?? '-',
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('province', {
        header: 'จังหวัด',
        cell: (info) => info.getValue() ?? '-',
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('status', {
        header: 'สถานะ',
        cell: (info) => <ElectionStatusBadge status={info.getValue()} />,
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'votingTimeline',
        header: 'ช่วงเวลาลงคะแนน',
        cell: (info) => {
          const { openVoting, closeVoting } = info.row.original

          return (
            <Typography variant="small" className="font-extralight">
              {getTimelineString(new Date(openVoting), new Date(closeVoting))}
            </Typography>
          )
        },
      }),
      columnHelper.accessor('type', {
        header: 'ประเภท',
        cell: (info) => <ElectionTypeBadge type={info.getValue()} />,
        size: 110,
        minSize: 110,
      }),
      columnHelper.accessor('totalVoters', {
        header: 'จำนวนลงคะแนน',
        cell: (info) => (
          <span className="flex gap-2 items-center">
            <Users strokeWidth={1.5} />
            <Typography variant="small" className="font-extralight">
              {info.getValue()}
            </Typography>
          </span>
        ),
        size: 110,
        minSize: 110,
      }),
      columnHelper.display({
        id: 'manage',
        header: 'จัดการ',
        cell: (info) => {
          const { status, isCancelled, id } = info.row.original

          return (
            <span className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                disabled={status !== 'DRAFT'}
                onClick={() =>
                  navigate({
                    to: '/activity/internal-election/$electionId',
                    params: { electionId: id },
                  })
                }
              >
                <Pencil strokeWidth={1} size={20} />
              </Button>
              {status === 'DRAFT' ? (
                <Button size="icon" variant="outline" onClick={() => deleteElection(id)}>
                  <Trash2 className="text-system-danger-default" strokeWidth={1} size={20} />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="outline"
                  disabled={isCancelled}
                  onClick={() => cancelElection(id)}
                >
                  <CalendarX2 className="text-system-danger-default" strokeWidth={1} size={20} />
                </Button>
              )}
            </span>
          )
        },
      }),
    ],
    [cancelElection, deleteElection, navigate]
  )

  return (
    <>
      <DtFilter
        filter={[
          {
            type: 'text',
            key: 'name',
            label: 'ค้นหาการเลือกตั้ง',
            state: queryName,
            setState: setQueryName,
          },
          {
            type: 'enum',
            key: 'status',
            label: 'สถานะ',
            options: [
              { value: 'DRAFT', label: 'ร่าง' },
              { value: 'NOT_OPENED_VOTE', label: 'ยังไม่เปิดหีบ' },
              { value: 'OPEN_VOTE', label: 'เปิดหีบ' },
              { value: 'CLOSED_VOTE', label: 'ปิดหีบ' },
              { value: 'RESULT_ANNOUNCE', label: 'ประกาศผล' },
            ],
            state: queryStatus || [],
            setState: setQueryStatus as React.Dispatch<React.SetStateAction<string[]>>,
          },
        ]}
        filterExtension={
          <ElectionCreate
            trigger={
              <Button className="space-x-2">
                <Plus />
                <span>สร้างแบบสอบถาม</span>
              </Button>
            }
            onSuccess={createElection}
          />
        }
        onChange={() => setQueryPage(1)}
      />
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        isQuerying={query.isLoading}
        footerExtension={
          <DtMovement
            length={query.data?.data?.length ?? 0}
            count={query.data?.meta.count ?? 0}
            isQuerying={query.isLoading}
            isMutating={cancelMutation.isPending || deleteMutation.isPending}
            queryLimit={queryLimit}
            setQueryLimit={setQueryLimit}
            queryPage={queryPage}
            setQueryPage={setQueryPage}
          />
        }
      />
    </>
  )
}
