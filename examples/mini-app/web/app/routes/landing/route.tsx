import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { clientEnv } from '~/config/clientEnv'

export default function LoginWithSSO() {
  const [user, setUser] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryParams] = useSearchParams()

  const token = queryParams.get('access_token')

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return
      try {
        const res = await fetch(`${clientEnv.API_URL}/me?token=${token}`, {
          method: 'GET',
        })

        setUser(await res.json())
        setIsLoading(false)
      } catch (error) {
        if (error instanceof Error) setError(error.message)
        console.error('Failed to fetch user profile:', error)
        setIsLoading(false)
      }
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
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            {isLoading ? (
              // Change this element to a css spinner animation
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto" />
            ) : user ? (
              <pre className="text-left bg-gray-100 p-4 rounded-lg overflow-x-auto max-h-[400px] break-all wrap-anywhere overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : error ? (
              <p className="text-red-500 font-semibold">{error}</p>
            ) : (
              <p>No user data available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
