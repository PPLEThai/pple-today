export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

export const handleUploadFile = async (
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
