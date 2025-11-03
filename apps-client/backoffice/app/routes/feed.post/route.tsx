import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/feed/post')({
  component: PostPage,
  head: () => ({ meta: [{ title: `Post` }] }),
})

function PostPage() {
  return null
}
