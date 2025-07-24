import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

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
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Login with SSO debug</h1>
      <button
        onClick={() => userManager.signinRedirect()}
        className="bg-primary text-white px-4 py-2 rounded"
      >
        Login with SSO
      </button>
      {user && (
        <div className="mt-4 max-w-[900px]">
          <h2 className="text-xl">User Info</h2>
          <pre className="bg-gray-100 p-4 rounded break-all text-wrap">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
