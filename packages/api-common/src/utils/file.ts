export const getFileName = (url: string) => {
  const instanceUrl = new URL(url)

  return instanceUrl.pathname.split('/').slice(-1)[0]
}

export const getFilePath = (fullPath: string) => {
  return fullPath.split('/').slice(1).join('/')
}
