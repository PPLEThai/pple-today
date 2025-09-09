import { useEffect, useState } from 'react'

import { userManager } from '~/config/oidc'
import { reactQueryClient } from '~/libs/api-client'

const BannerTestRoute = () => {
  const [bannerId, setBannerId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const createBannerMutation = reactQueryClient.useMutation('post', '/admin/banners')
  const getFileUploadUrl = reactQueryClient.useMutation('post', '/admin/file/upload-url')

  const getBanners = reactQueryClient.useQuery(
    '/admin/banners',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      enabled: !!accessToken,
    }
  )

  const deleteBanner = reactQueryClient.useMutation('delete', '/admin/banners/:id')

  const getBannerById = reactQueryClient.useQuery(
    '/admin/banners/:id',
    {
      pathParams: {
        id: bannerId ?? '',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    {
      enabled: !!bannerId && !!accessToken,
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
            category: 'BANNER',
            contentType: file.type as any,
          },
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        })

        await handleUploadFile(file, result.uploadUrl, result.uploadFields)

        const banner = await createBannerMutation.mutateAsync({
          body: {
            destination: 'https://google.com',
            navigation: 'EXTERNAL_BROWSER',
            imageFilePath: result.filePath as any,
            status: 'PUBLISH',
          },
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        })

        setBannerId(banner.id)
      }}
    >
      <input name="file-upload" type="file" />
      <button type="submit" className="bg-primary-400 p-2 rounded-lg">
        Select File
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!bannerId) return
          await deleteBanner.mutateAsync({
            pathParams: {
              id: bannerId ?? '',
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })
        }}
        className="bg-primary-400 p-2 rounded-lg"
      >
        Delete Banner
      </button>

      <div>
        <p>Banner:</p>
        <span className="text-wrap w-full break-all">{JSON.stringify(getBannerById.data)}</span>
      </div>
      <div>
        <p>Banner List:</p>
        <span className="text-wrap w-full break-all">{JSON.stringify(getBanners.data)}</span>
      </div>
    </form>
  )
}

export default BannerTestRoute
