import { networkInterfaces } from 'node:os'

// https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
const nets = networkInterfaces()
const results = Object.create(null) // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      if (!results[name]) {
        results[name] = []
      }
      results[name].push(net.address)
    }
  }
}

const updateLocalDomainInOIDConfig = async () => {
  const wifiIpAddress = results['en0']

  if (!wifiIpAddress || wifiIpAddress.length === 0) {
    console.error('No valid IPv4 address found for en0 interface.')
    process.exit(1)
  }

  const redirectUri = `exp://${wifiIpAddress[0]}:8081`

  console.log('Using redirect URI:', redirectUri)
  console.log(
    'Fetching current OIDC configuration...',
    process.env.OIDC_MANAGEMENT_URL,
    process.env.OIDC_APPLICATION_ID
  )

  const asIsConfig = await fetch(
    `${process.env.OIDC_MANAGEMENT_URL}/management/v1/projects/${process.env.OIDC_PROJECT_ID}/apps/${process.env.OIDC_APPLICATION_ID}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OIDC_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  )

  if (!asIsConfig.ok) {
    console.error('Failed to fetch current OIDC configuration:', await asIsConfig.text())
    process.exit(1)
  }

  const asIsConfigJson = await asIsConfig.json()

  const asIsRedirectUris = asIsConfigJson.app.oidcConfig.redirectUris ?? []
  const postLogoutRedirectUris = asIsConfigJson.app.oidcConfig.postLogoutRedirectUris ?? []

  let needToUpdate = false

  if (!asIsRedirectUris.includes(redirectUri)) {
    console.log(`Redirect URI ${redirectUri} not found in existing configuration, adding it...`)
    asIsRedirectUris.push(redirectUri)
    needToUpdate = true
  }

  if (!postLogoutRedirectUris.includes(redirectUri)) {
    console.log(
      `Post logout redirect URI ${redirectUri} not found in existing configuration, adding it...`
    )
    postLogoutRedirectUris.push(redirectUri)
    needToUpdate = true
  }

  if (needToUpdate) {
    const addResult = await fetch(
      `${process.env.OIDC_MANAGEMENT_URL}/management/v1/projects/${process.env.OIDC_PROJECT_ID}/apps/${process.env.OIDC_APPLICATION_ID}/oidc_config`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.OIDC_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
          authMethodType: 'OIDC_AUTH_METHOD_TYPE_NONE',
          responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
          appType: 'OIDC_APP_TYPE_NATIVE',
          devMode: true,
          loginVersion: {
            loginV2: {
              baseUri: process.env.EXPO_PUBLIC_OIDC_BASE_URL,
            },
          },
          postLogoutRedirectUris: [...postLogoutRedirectUris, redirectUri],
          redirectUris: [...asIsRedirectUris, redirectUri],
        }),
      }
    )

    if (!addResult.ok) {
      console.error('Failed to add new redirect URI:', await addResult.text())
      process.exit(1)
    } else {
      console.log('New redirect URI added successfully.')
    }
  } else {
    console.log('Redirect URI already exists:', redirectUri)
  }
}

updateLocalDomainInOIDConfig()
