import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { clientEnv } from '~/config/clientEnv'

const FACEBOOK_APP_ID = clientEnv.FACEBOOK_APP_ID
const FACEBOOK_REDIRECT_URI = clientEnv.FACEBOOK_REDIRECT_URL

const hashToObject = (hash: string) => {
  return hash
    .slice(1)
    .split('&')
    .reduce(
      (acc, part) => {
        const [key, value] = part.split('=')
        acc[key] = decodeURIComponent(value)
        return acc
      },
      {} as Record<string, string>
    )
}

export default function FacebookLinkPage() {
  const { hash } = useLocation()
  const [queryParams] = useSearchParams()
  const accessToken = hashToObject(hash).access_token

  const [fetchParams, setFetchParams] = useState('')
  const [responseData, setResponseData] = useState(null)

  useEffect(() => {
    const exchangeToken = async (code: string) => {
      await fetch(
        `${clientEnv.API_URL}/facebook/callback?code=${code}&redirectUri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}`
      )
    }

    const code = queryParams.get('code')

    if (code) {
      exchangeToken(code)
    }
  }, [queryParams])

  const handleFetch = async () => {
    const baseUrl = 'https://graph.facebook.com/v23.0'
    const queryParams = new URLSearchParams({
      access_token: accessToken,
    })
    const response = await fetch(`${baseUrl}/${fetchParams}?${queryParams.toString()}`)
    if (!response.ok) {
      console.error('Failed to fetch Facebook data:', await response.text())
      return
    }
    try {
      const data = await response.json()
      console.log('Fetched Facebook data:', data)

      setResponseData(data)
    } catch (error) {
      console.error('Error parsing response data:', error)
      setResponseData(null)
    }
  }

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">Login with facebook debug</h1>
      <a
        href={`https://www.facebook.com/v23.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${FACEBOOK_REDIRECT_URI}&response_type=token&scope=pages_show_list%2Cpages_read_engagement%2Cpages_read_user_content`}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Login with Facebook
      </a>
      {accessToken && (
        <div className="mt-4 max-w-[900px]">
          <h2 className="text-xl">Your Access Token</h2>
          <pre className="bg-gray-100 p-4 rounded break-all text-wrap">{accessToken}</pre>
        </div>
      )}
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          handleFetch()
        }}
      >
        <input
          className="border border-gray-300 p-2 rounded"
          onChange={(e) => setFetchParams(e.target.value)}
          value={fetchParams}
        ></input>
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded ml-2">
          Fetch
        </button>
        {responseData && (
          <div className="mt-4">
            <h2 className="text-xl">Response Data</h2>
            <pre className="bg-gray-100 p-4 rounded break-all text-wrap">
              {JSON.stringify(responseData, null, 2)}
            </pre>
          </div>
        )}
      </form>
    </div>
  )
}
