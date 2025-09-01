export const handleUploadSignedUrl = (uploadUrl: string, formData: FormData) => {
  return new Promise<{ ok: boolean; status: number; response: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl)
    xhr.setRequestHeader('Content-Type', 'multipart/form-data')
    xhr.setRequestHeader('Accept', '')
    xhr.onerror = (ev) => {
      return reject({
        error: xhr.statusText || 'Network Error',
        status: xhr.status,
        response: xhr.responseText,
      })
    }
    xhr.onreadystatechange = function (ev) {
      if (xhr.readyState === 4) {
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
