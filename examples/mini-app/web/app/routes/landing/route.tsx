import { useEffect, useState } from 'react'

import { useAuth } from '~/context/AuthContext'

export default function LoginWithSSO() {
  const [userDetails, setUserDetails] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()

  useEffect(() => {
    const fetchUser = async () => {
      if (!user?.access_token) return
      try {
        setUserDetails(user.profile)
        setIsLoading(false)
      } catch (error) {
        if (error instanceof Error) setError(error.message)
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [user?.access_token])

  return (
    <div className="flex flex-col items-center justify-center h-screen text-black">
      <div className="flex flex-col justify-center items-center shadow-2xl p-6 rounded-lg bg-white w-full max-w-[600px] m-4 ">
        {!user?.access_token ? (
          <p className="text-red-500 font-semibold">
            Please open this application from PPLE Today to see the result
          </p>
        ) : (
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            {isLoading ? (
              // Change this element to a css spinner animation
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto" />
            ) : userDetails ? (
              <pre className="text-left bg-gray-100 p-4 rounded-lg overflow-x-auto max-h-[400px] break-all wrap-anywhere overflow-auto">
                {JSON.stringify(userDetails, null, 2)}
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
