# Mini-app deep linking (PPLE Today)

This document describes how **Universal Links** (iOS) and **App Links** (Android) open the PPLE Today app from URLs on the mini-app redirect host (for example `https://miniapp.peoplesparty.or.th/{slug}/...`).

## How it works

1. User opens `https://miniapp.peoplesparty.or.th/my-slug/nested/path` in Safari, Chrome, Messages, etc.
2. The OS verifies domain association files hosted on that domain.
3. If verified, the OS launches PPLE Today instead of the browser.
4. Expo Router runs `app/+native-intent.tsx`, which rewrites the path to `/mini-app/my-slug?path=nested/path`.
5. The mini-app screen exchanges a token and loads the mini app in a WebView.

In-app taps on the same URLs (feed posts, banners, notifications) use the same path mapping via `utils/mini-app.ts`.

Custom scheme links (`pple-today://mini-app/my-slug`) continue to work for development without domain setup.

## Mobile app configuration

### 1. Environment variable

Set in `apps-client/mobile/.env` (and CI/EAS secrets for builds):

```bash
EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT=https://miniapp.peoplesparty.or.th
```

This value must match the public HTTPS origin exactly (scheme + host, no trailing path). It drives:

- iOS `associatedDomains` (`applinks:miniapp.peoplesparty.or.th`)
- Android App Link `intentFilters` for that host
- In-app URL allowlisting in `createMiniAppPath`

### 2. Rebuild native projects

Association domains and intent filters are applied at **prebuild** time:

```bash
cd apps-client/mobile
pnpm prebuild
# or platform-specific: pnpm prebuild:ios / pnpm prebuild:android
```

Then build and install a new binary (EAS or Fastlane). Deep linking will not work in an old build that was generated before this config.

### 3. iOS — Apple Developer & App Store Connect

**Apple Developer (developer.apple.com)**

1. Open your App ID (same as `DEVELOPER_APP_IDENTIFIER`).
2. Enable capability **Associated Domains**.
3. Save. Regenerate provisioning profiles if needed (`fastlane match`).

**Xcode (after prebuild)**

1. Open `ios/` in Xcode.
2. Select the app target → **Signing & Capabilities**.
3. Confirm **Associated Domains** lists: `applinks:miniapp.peoplesparty.or.th` (host from your env URL).

**App Store Connect**

- No separate “deep link” toggle is required for Universal Links.
- Ship a build that includes Associated Domains. Users receive association when they install/update the app.

**Verify on device**

- Paste a mini-app URL in Notes → long-press → should offer “Open in PPLE Today”.
- Or use: `xcrun simctl openurl booted "https://miniapp.peoplesparty.or.th/{slug}"`

### 4. Android — Play Console & signing

**Play Console (play.google.com/console)**

1. Open your app → **Grow** → **Deep links** (or **Setup** → **App integrity** / **Deep links**, depending on console version).
2. After `assetlinks.json` is live and a release is installed, Google runs **Digital Asset Links** verification.
3. Status should show the domain as verified. Fix fingerprints if verification fails.

**SHA-256 certificate fingerprints**

`assetlinks.json` must list every certificate that signs builds users install:

| Build type                    | How to get SHA-256                                                           |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Local / Fastlane upload key   | `keytool -list -v -keystore upload-keystore.jks -alias <alias>`              |
| Play App Signing (production) | Play Console → **Setup** → **App signing** → **App signing key certificate** |
| EAS Build                     | `eas credentials -p android`                                                 |

Use colon-separated uppercase hex (e.g. `AB:CD:...`). Include **both** upload and Play App Signing keys if you use Play App Signing.

**Verify on device**

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://miniapp.peoplesparty.or.th/{slug}" \
  th.or.peoplesparty.today
```

(Replace package name with your `DEVELOPER_APP_IDENTIFIER`.)

## Server configuration (mini-app redirect host)

Association files are served by the **mini app redirect** API (`apps-api/backoffice`, port `MINIAPP_REDIRECT_PORT`), on the same host as public mini-app links.

### Backoffice environment variables

```bash
MINIAPP_IOS_TEAM_ID=XXXXXXXXXX          # Apple Team ID (10 chars)
MINIAPP_IOS_BUNDLE_ID=th.or.peoplesparty.today   # Same as DEVELOPER_APP_IDENTIFIER
MINIAPP_ANDROID_PACKAGE_NAME=th.or.peoplesparty.today
MINIAPP_ANDROID_SHA256_CERT_FINGERPRINTS=AB:CD:...,11:22:...
```

Endpoints (when configured):

- `https://miniapp.peoplesparty.or.th/.well-known/apple-app-site-association`
- `https://miniapp.peoplesparty.or.th/.well-known/assetlinks.json`

If variables are missing, these URLs return 404 (browser redirects still work; app will not auto-open).

### DNS / reverse proxy

Ensure `miniapp.peoplesparty.or.th` routes to the redirect service and does **not** strip `/.well-known/*`. No authentication on well-known paths.

### Check association files

```bash
curl -sS https://miniapp.peoplesparty.or.th/.well-known/apple-app-site-association | jq .
curl -sS https://miniapp.peoplesparty.or.th/.well-known/assetlinks.json | jq .
```

Apple validator: [App Search Validation Tool](https://search.developer.apple.com/appsearch-validation-tool)  
Google: Play Console deep links report or `adb` / [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator)

## URL mapping reference

| Incoming URL                | In-app route                               |
| --------------------------- | ------------------------------------------ |
| `https://miniapp…/slug`     | `/mini-app/slug`                           |
| `https://miniapp…/slug/a/b` | `/mini-app/slug?path=a/b`                  |
| `https://miniapp…/`         | No in-app route (stays in browser or home) |

## Troubleshooting

| Symptom                     | Likely cause                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Opens in browser only       | AASA/assetlinks missing, wrong fingerprints, or old app build without domains             |
| iOS never offers app        | Associated Domains not in profile; wrong Team ID / bundle in AASA                         |
| Android “link not verified” | Fingerprint mismatch; need Play signing cert in `assetlinks.json`                         |
| App opens but wrong screen  | Slug unknown in DB; check backoffice mini-app slug                                        |
| Works in dev, not prod      | Prod env `EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT` or server MINIAPP\_\* vars differ |

After changing server association config or mobile env, reinstall the app and allow a few minutes for CDN/OS cache to update.
