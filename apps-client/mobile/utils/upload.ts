import { ImagePickerSuccessResult } from 'expo-image-picker'

export function handleUploadSignedUrl(uploadUrl: string, formData: FormData) {
  return new Promise<{ ok: boolean; status: number; response: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Content-Type', 'multipart/form-data')
    xhr.timeout = 5000 // 5 seconds
    xhr.onerror = (ev) => {
      return reject({
        error: xhr.statusText || 'Network Error',
        status: xhr.status,
        response: xhr.responseText,
      })
    }

    xhr.onreadystatechange = function (ev) {
      if (xhr.readyState === xhr.DONE) {
        const isOk = xhr.status >= 200 && xhr.status < 300
        return resolve({
          ok: isOk,
          status: xhr.status,
          response: xhr.responseText,
        })
      }
    }
    xhr.send(formData)
  })
}

export async function handleUploadImage(
  imgPickerResult: ImagePickerSuccessResult,
  uploadUrl: string,
  uploadFields: Record<string, string>
) {
  const asset = imgPickerResult.assets[0]

  if (!asset) return

  try {
    const formData = new FormData()

    for (const [key, value] of Object.entries(uploadFields)) {
      formData.append(key, value)
    }

    // @ts-expect-error: Special react native format for form data
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `profile-picture-${new Date().getTime()}.png`,
      type: asset.mimeType,
    })

    const result = await handleUploadSignedUrl(uploadUrl, formData)

    if (!result.ok) {
      throw new Error('Failed to upload image')
    }
  } catch (err) {
    console.error('Error uploading image', err)
    throw err
  }
}
