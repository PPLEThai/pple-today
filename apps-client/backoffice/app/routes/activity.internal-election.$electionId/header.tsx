import { useCallback } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@pple-today/web-ui/button'
import { Typography } from '@pple-today/web-ui/typography'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarX2, Eye, Pencil, Trash2, Vote } from 'lucide-react'

import { AdminGetElectionResponse } from '@api/backoffice/admin'

import { reactQueryClient } from '../../libs/api-client'

export function Header({ election }: { election: AdminGetElectionResponse }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center gap-4">
        <Vote size={30} className="text-primary" />
        <Typography variant="h1">รายละเอียดการเลือกตั้ง</Typography>
      </div>
      <div className="flex items-center gap-2">
        {election.status === 'DRAFT' ? (
          <>
            <DeleteButton election={election} />
            <PublishButton election={election} />
            <EditButton />
          </>
        ) : (
          <CancelButton election={election} />
        )}
      </div>
    </div>
  )
}

function DeleteButton({ election }: { election: AdminGetElectionResponse }) {
  const navigate = useNavigate()
  const mutation = reactQueryClient.useMutation('delete', '/admin/elections/:electionId')
  const onClick = useCallback(() => {
    if (mutation.isPending) return

    mutation.mutateAsync(
      { pathParams: { electionId: election.id } },
      { onSuccess: () => navigate('/activity/internal-election') }
    )
  }, [mutation, navigate, election])

  return (
    <Button variant="outline" size="icon" onClick={onClick} disabled={mutation.isPending}>
      <Trash2 />
    </Button>
  )
}

function PublishButton({ election }: { election: AdminGetElectionResponse }) {
  const queryClient = useQueryClient()
  const mutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/publish')
  const onClick = useCallback(() => {
    if (mutation.isPending) return

    mutation.mutateAsync(
      {
        pathParams: { electionId: election.id },
        body: { publishDate: new Date() },
      },
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
    <Button
      variant="default"
      size="icon"
      disabled={election.keyStatus !== 'CREATED' || mutation.isPending}
      onClick={onClick}
    >
      <Eye className="text-white" />
    </Button>
  )
}

function EditButton() {
  return (
    <Button variant="default" className="space-x-2">
      <Pencil className="text-white" />
      <Typography variant="small" className="text-white">
        แก้ไขการเลือกตั้ง
      </Typography>
    </Button>
  )
}

function CancelButton({ election }: { election: AdminGetElectionResponse }) {
  const queryClient = useQueryClient()
  const mutation = reactQueryClient.useMutation('put', '/admin/elections/:electionId/cancel')
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
    <Button
      variant="outline"
      disabled={election.isCancelled || mutation.isPending}
      onClick={onClick}
    >
      <CalendarX2 className="text-system-danger-default" strokeWidth={1} size={20} />
      <Typography variant="small" className="ml-2">
        ยกเลิกการเลือกตั้ง
      </Typography>
    </Button>
  )
}

function electionQueryKey(electionId: string) {
  return reactQueryClient.getQueryKey('/admin/elections/:electionId', {
    pathParams: { electionId },
  })
}
