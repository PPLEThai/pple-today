import { useEffect, useState } from 'react'

import { Button } from '@pple-today/web-ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { User, UserManager } from 'oidc-client-ts'

import { clientEnv } from '~/config/clientEnv'

export const Route = createFileRoute('/sso')({
  component: LoginWithSSO,
})

const userManager = new UserManager({
  authority: clientEnv.OIDC_AUTHORITY_URL,
  client_id: clientEnv.OIDC_CLIENT_ID,
  redirect_uri: `${clientEnv.OIDC_REDIRECT_URL}/sso`,
  response_type: 'code',
  scope: `openid profile phone ${clientEnv.OIDC_ADDITIONAL_SCOPE}`,
})

function LoginWithSSO() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const user = await userManager.signinCallback()
      if (user) {
        console.log('User logged in:', user)
        setUser(user)
      } else {
        console.log('User not logged in')
      }
    }

    fetchUser()
  }, [])

  return (
    <div className="flex flex-col items-center [justify-content:safe_center] h-screen gap-4">
      <h1 className="text-2xl font-bold">Login with SSO debug</h1>
      <button
        onClick={() => userManager.signinRedirect()}
        className="bg-primary text-white px-4 py-2 rounded"
      >
        Login with SSO
      </button>
      {user && (
        <>
          <Button asChild>
            <Link to="/feed">ไปหน้า Feed</Link>
          </Button>
          <details>
            <summary className="text-xl">User Info</summary>
            <pre className="max-w-[900px] bg-gray-100 p-4 rounded break-all text-wrap">
              {JSON.stringify(user, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
