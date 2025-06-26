# Fastlane

Please run this after `pnpm prebuild` to setup fastlane

```
sh ./fastlane/setup.sh
```

These are fastlane config file that will be copied to `android/` and `ios/` folder which will copy files like
`cp -r ./fastlane/android/ ./android` and `cp -r ./fastlane/ios/ ./ios`

## Android

- We encode `key.json` to an envinorment variable called `FIREBASE_SERVICE_ACCOUNT_JSON` as you can see in `.env.template`
- `key.json` is a Google Cloud **Service Account** Key.
  Please see https://docs.fastlane.tools/getting-started/android/setup/ on topic **Collect your Google credentials** or https://cdmunoz.medium.com/bye-bye-firebase-token-hello-service-accounts-540ed6cb20c8
- To test `key.json` file please run `fastlane run validate_play_store_json_key json_key:key.json`
- `supply.sh` can be an example to run `fastlane supply ...` but still needed to be modified further

## iOS

- Don't forget to generate an App-Specific Password in https://appleid.apple.com/account/manage
  and put it as `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` in the `.env` file
  as well as you Apple Id as `FASTLANE_USER` in order to upload_to_testflight

  Please see https://stackoverflow.com/questions/74210927/fastlane-altool-error-unable-to-upload-archive-failed-to-get-authorization
