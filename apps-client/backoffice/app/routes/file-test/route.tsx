import { useEffect, useState } from 'react'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

const FileTestRoute = () => {
  const [announcementId, setAnnouncementId] = useState<string | null>(null)
  const [publishAnnouncementId, setPublishAnnouncementId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const createEmptyAnnouncementMutation = reactQueryClient.useMutation(
    'post',
    '/admin/announcements/draft'
  )

  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')

  const updateDraftAnnouncement = reactQueryClient.useMutation(
    'put',
    '/admin/announcements/draft/:announcementId'
  )

  const getDraftAnnouncement = reactQueryClient.useQuery(
    '/admin/announcements/draft/:announcementId',
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

  const getPublishedAnnouncement = reactQueryClient.useQuery(
    '/admin/announcements/:announcementId',
    {
      pathParams: {
        announcementId: publishAnnouncementId ?? '',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      enabled: !!publishAnnouncementId && !!accessToken,
    }
  )

  const publishAnnouncement = reactQueryClient.useMutation(
    'post',
    '/admin/announcements/draft/:announcementId/publish'
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

        const announcement = await createEmptyAnnouncementMutation.mutateAsync({
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        })

        setAnnouncementId(announcement.announcementId)

        await updateDraftAnnouncement.mutateAsync({
          pathParams: {
            announcementId: announcement.announcementId,
          },
          body: {
            title: 'Test Announcement',
            content: 'This is a test announcement with an uploaded file.',
            attachmentFilePaths: [result.filePath as any],
            backgroundColor: null,
            iconImage: null,
            topicIds: [],
            type: 'OFFICIAL',
          },
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        })
      }}
    >
      <input name="file-upload" type="file" />
      <button type="submit" className="bg-primary-400 p-2 rounded-lg">
        Select File
      </button>
      <button
        type="button"
        onClick={async () => {
          const user = await userManager.getUser()

          if (!user) return

          await publishAnnouncement.mutateAsync({
            pathParams: {
              announcementId: announcementId ?? '',
            },
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          })

          setPublishAnnouncementId(announcementId)
        }}
        className="bg-red-400 p-2 rounded-lg"
      >
        Publish Draft Announcement
      </button>
      <div>
        <p>Draft Announcement:</p>
        <span className="text-wrap break-all">{JSON.stringify(getDraftAnnouncement.data)}</span>
      </div>
      <div>
        <p>Published Announcement:</p>
        <span className="text-wrap w-full break-all">
          {JSON.stringify(getPublishedAnnouncement.data)}
        </span>
      </div>
    </form>
  )
}

export default FileTestRoute
