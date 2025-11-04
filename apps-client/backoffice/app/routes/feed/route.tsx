import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/feed')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div></div>
}
