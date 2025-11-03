import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/feed/banner')({
  component: BannerPage,
  head: () => ({ meta: [{ title: 'Banner' }] }),
})

function BannerPage() {
  return null
}
