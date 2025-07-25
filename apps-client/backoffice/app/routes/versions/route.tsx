export function loader() {
  const body = JSON.stringify({
    name: __APP_NAME__,
    version: __APP_VERSION__,
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
