const HASHTAG_REGEX = /(^|\B)#([\u0E00-\u0E7Fa-zA-Z0-9_]{1,30})(|\r)/g

export function extractHashtags(text: string): string[] {
  const hashtags = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    hashtags.add(`#${match[2]}`)
  }

  return Array.from(hashtags)
}
