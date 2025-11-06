import { StrictMode } from 'react'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { AuthProvider, AuthState, InitialAuthState, useAuthContext } from './core/auth'
import { routeTree } from './routeTree.gen'

export interface RouterContext {
  auth: AuthState
}
export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  context: {
    auth: InitialAuthState,
  },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  )
}

function InnerApp() {
  const auth = useAuthContext()
  return <RouterProvider router={router} context={{ auth }} />
}
