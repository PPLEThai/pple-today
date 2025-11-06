import { Button } from '@pple-today/web-ui/button'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
  // TODO: setup beforeLoad to redirect to /dashboard if logged in
  beforeLoad: async () => {
    throw redirect({ to: '/sso' })
  },
})

function Index() {
  return (
    <div className="flex py-16 mx-auto justify-center min-h-screen items-center bg-base-bg-default">
      <section className="border border-base-outline-default bg-white rounded-2xl p-6 flex flex-col w-[320px]">
        <h1 className="text-xl font-semibold mb-4 text-center">PPLE Today Backoffice</h1>
        <Button asChild>
          <Link to="/sso">Login with SSO</Link>
        </Button>
      </section>
    </div>
  )
}
