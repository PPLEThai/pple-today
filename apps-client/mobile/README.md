# PPLE Today

PPLE Today Mobile App (Android/iOS)

Feel free to update this file :)

## Start Expo Dev Server

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Start the app

   ```bash
   pnpm dev
   ```

## Native Development

1. Generate Native `ios/` and `android/`

   ```bash
   pnpm prebuild
   ```

2. Run Android/ios

   ```bash
   pnpm android
   pnpm ios
   ```

## Native Build

1. Generate Native `ios/` and `android/`

   ```bash
   pnpm prebuild
   ```

2. Open Xcode/Android Studio

   ```
   open -a Xcode ios/PPLEToday.xcodeproj
   open -a /Applications/Android\ Studio.app android
   ```

## Fastlane - Beta Build

1. Generate native `ios/` and `android/`

   ```bash
   pnpm prebuild
   ```

2. Install Fastlane

   ```bash
   brew install fastlane
   ```

3. Setup environment variables \
   Ask your dev team for `.env` first \
   If you are setting this for yourself, please see **Environment Setup** down below

4. Setup Fastlane in native folders

   ```
   pnpm fastlane:setup
   ```

   These are fastlane config file that will be copied to `android/` and `ios/` folder which will copy files like

   `cp -r ./fastlane/android/* ./android`

   `cp -r ./fastlane/ios/* ./ios`

## Environment Setup

### Development

- Public environment variables are used in the app, it should be set in `.env` file
  - `EXPO_PUBLIC_OIDC_BASE_URL` is your OIDC service base URL
  - `EXPO_PUBLIC_OIDC_CLIENT_ID` is your OIDC client ID used for mobile apps
  - `EXPO_PUBLIC_BACKEND_BASE_URL` is your PPLE Today backend base URL
    - For development, it is usually `http://localhost:2000`
- The following environment variables are used in local development only, **it should not be included in production**:
  - `OIDC_MANAGEMENT_URL` is your OIDC backend URL **which might not be the same as `EXPO_PUBLIC_OIDC_BASE_URL`**
  - `OIDC_APPLICATION_ID` is your OIDC application resource ID used for mobile apps **not the same as `EXPO_PUBLIC_OIDC_CLIENT_ID`**
  - `OIDC_PROJECT_ID` is your OIDC project ID where the application is registered
  - `OIDC_ADMIN_TOKEN` is your OIDC admin token used for managing OIDC applications in backend

### Android

- Please see prerequisite steps
  https://thecodingmachine.github.io/react-native-boilerplate/docs/BetaBuild/#android
- We encode `key.json` to an envinorment variable called `FIREBASE_SERVICE_ACCOUNT_JSON` with command `base64`
  - `key.json` is a Google Cloud **Service Account** Key.
    Please see https://docs.fastlane.tools/getting-started/android/setup/ on topic **Collect your Google credentials** or https://cdmunoz.medium.com/bye-bye-firebase-token-hello-service-accounts-540ed6cb20c8
  - To test `key.json` file please run `fastlane run validate_play_store_json_key json_key:key.json`

### iOS

- Please see prerequisite steps
  https://thecodingmachine.github.io/react-native-boilerplate/docs/BetaBuild/#ios
- `FASTLANE_USER` is your Apple ID admin username
- `FASTLANE_PASSWORD` is your Apple ID password
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` is an App-Specific Password which you can generate here https://appleid.apple.com/account/manage
  - Please see https://stackoverflow.com/questions/74210927/fastlane-altool-error-unable-to-upload-archive-failed-to-get-authorization
- `FASTLANE_SESSION` is session token for **temporary** auth method in our CI right now

  - Please see https://stackoverflow.com/questions/58097010/fastlane-doesnt-work-for-apple-id-with-two-factor-authentication-on-continuous
  - run `fastlane spaceauth -u <your_apple_username>`
  - copy and then single quote it in github variable like this `'---\n ...'`

- **TODO** APP Store Connect API Key
  - https://github.com/fastlane/fastlane/issues/29468#issuecomment-2942861970
  - Please see `ios/Fastfile`
  - Create/List here https://appstoreconnect.apple.com/access/integrations/api
  - `APP_STORE_CONNECT_API_KEY_KEY_ID`
  - `APP_STORE_CONNECT_API_KEY_ISSUER_ID`
  - `APP_STORE_CONNECT_API_KEY_KEY`
- `MATCH_PASSWORD` is your password for accessing Certificates
  - Please see
    https://docs.fastlane.tools/actions/match/ and
    https://codesigning.guide/
  1.  Create a private git repo for keeping certificates
  2.  Run `fastlane match init`
  3.  Run `fastlane match development` `fastlane match appstore`
- `MATCH_GIT_BASIC_AUTHORIZATION` is `echo -n <your_github_username>:<your_personal_access_token> | base64`
  - Don't forget to generate `your_personal_access_token` in GitHub > Settings > Developer settings > Personal access token > Fine-grained tokens
- `PROVISIONING_PROFILE_SPECIFIER` is `match AppStore <DEVELOPER_APP_IDENTIFIER>`
  - It should appear here after running match https://developer.apple.com/account/resources/profiles/list
- `APP_STORE_CONNECT_TEAM_ID`
  - https://sarunw.com/posts/fastlane-find-team-id/#without-fastlane
  1. Log in to App Store Connect
  2. https://appstoreconnect.apple.com/WebObjects/iTunesConnect.woa/ra/user/detail
- `DEVELOPER_PORTAL_TEAM_ID` \
   Please go to https://appstoreconnect.apple.com/access/users > Open User Profile Menu (Top Right) > Edit Profile

## VPN Connect

If you connect VPN and dev server can't find your devices, you can set fixed IP by following command to bundle

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=<your_private_ip> npx expo start --clear
```
