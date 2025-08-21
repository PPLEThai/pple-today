// eslint-disable-next-line no-control-regex
const REGEXP_HASHTAG = RegExp(/\B(#(?:[^\x00-\x7F]|\w)+)(?!;)/g)

export const getFileName = (url: string) => {
  const instanceUrl = new URL(url)

  return instanceUrl.pathname.split('/').slice(-1)[0]
}

export const getHashTag = (content?: string) => {
  if (!content) return []

  const hashtags = content.match(REGEXP_HASHTAG)

  return hashtags ? hashtags.map((tag) => tag.slice(1).toLocaleLowerCase()) : []
}
