import { useEffect, useState } from 'react'

import { FilePath } from '@api/backoffice/admin'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

const FileTestRoute = () => {
  const [announcementId, setAnnouncementId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const createAnnouncementMutation = reactQueryClient.useMutation('post', '/admin/announcements')

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')

  const getAnnouncement = reactQueryClient.useQuery(
    '/admin/announcements/:announcementId',
    {
      pathParams: {
        announcementId: announcementId ?? '',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      enabled: !!announcementId && !!accessToken,
    }
  )

  useEffect(() => {
    const fetchAccessToken = async () => {
      const user = await userManager.getUser()
      setAccessToken(user?.access_token ?? null)
    }
    fetchAccessToken()
  }, [])

  const handleUploadFile = async (
    file: File,
    uploadUrl: string,
    uploadFields: Record<string, string>
  ) => {
    const formData = new FormData()

    for (const [key, value] of Object.entries(uploadFields)) {
      formData.append(key, value)
    }

    formData.append('file', file)

    await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    })
  }

  return (
    <form
      id="form-data"
      className="flex flex-col items-center justify-center h-full gap-4"
      onSubmit={async (ev) => {
        ev.preventDefault()
        const user = await userManager.getUser()

        const form = new FormData(document.getElementById('form-data') as HTMLFormElement)

        const file = form.get('file-upload') as File | null

        if (!file || !user) return

        const result = await getFileUploadUrl.mutateAsync({
          body: {
            category: 'ANNOUNCEMENT',
            contentType: file.type as any,
          },
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        })

        await handleUploadFile(file, result.uploadUrl, result.uploadFields)

        const announcement = await createAnnouncementMutation.mutateAsync({
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
          body: {
            topicIds: [],
            title: 'Temporary Announcement',
            content: 'This is a temporary announcement.',
            type: 'OFFICIAL',
            attachmentFilePaths: [result.filePath as FilePath],
          },
        })

        setAnnouncementId(announcement.announcementId)
      }}
    >
      <input name="file-upload" type="file" />
      <button type="submit" className="bg-primary-400 p-2 rounded-lg">
        Create Announcement
      </button>
      <div>
        <p>Announcement:</p>
        <span className="text-wrap w-full break-all">{JSON.stringify(getAnnouncement.data)}</span>
      </div>
    </form>
  )
}

export default FileTestRoute
