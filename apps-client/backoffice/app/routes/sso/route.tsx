import { useEffect, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router'

import { Button } from '@pple-today/web-ui/button'
import { User } from 'oidc-client-ts'

import { userManager } from '~/config/oidc'

export default function LoginWithSSO() {
  const [user, setUser] = useState<User | null>(null)
  const [queryParams] = useSearchParams()

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
  }, [queryParams])

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
            <NavLink to="/feed/hashtag">ไปหน้า Feed</NavLink>
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
