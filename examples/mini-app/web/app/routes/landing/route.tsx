import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { clientEnv } from '~/config/clientEnv'

export default function LoginWithSSO() {
  const [user, setUser] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [queryParams] = useSearchParams()

  const token = queryParams.get('token')

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      const res = await fetch(`${clientEnv.API_URL}/me?token=${token}`)

      setUser(await res.json())
      setIsLoading(false)
    }

    fetchUser()
  }, [token])

  return (
    <div className="flex flex-col items-center justify-center h-screen text-black">
      <div className="flex flex-col justify-center items-center shadow-2xl p-6 rounded-lg bg-white w-full max-w-[600px] m-4 ">
        {!token ? (
          <p className="text-red-500 font-semibold">
            Please open this application from PPLE Today to see the result
          </p>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            {isLoading ? (
              // Change this element to a css spinner animation
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto" />
            ) : user ? (
              <pre className="text-left bg-gray-100 p-4 rounded-lg overflow-x-auto max-h-[400px]">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p>No user data available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
