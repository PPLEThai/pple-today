import '../app.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
      <TanStackRouterDevtools />
    </>
  )
}

// TODO: handle error boundary
// export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
//   let message = 'Oops!'
//   let details = 'An unexpected error occurred.'
//   let stack: string | undefined

//   if (isRouteErrorResponse(error)) {
//     message = error.status === 404 ? '404' : 'Error'
//     details =
//       error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
//   } else if (import.meta.env.DEV && error && error instanceof Error) {
//     details = error.message
//     stack = error.stack
//   }

//   return (
//     <main className="pt-16 p-4 container mx-auto">
//       <h1>{message}</h1>
//       <p>{details}</p>
//       {stack && (
//         <pre className="w-full p-4 overflow-x-auto">
//           <code>{stack}</code>
//         </pre>
//       )}
//     </main>
//   )
// }
