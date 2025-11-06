import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/activity/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="p-4">Hello activity</div>
}
