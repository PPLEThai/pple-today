# Fastlane

These are fastlane config file that will be copied to `android/` and `ios/` folder after `expo prebuild`

- `cp -r ./fastlane/android/ ./android`
- `cp -r ./fastlane/ios/ ./ios`

## Android

- `key.json` is a Google Cloud **Service Account** Key.
  Please see https://docs.fastlane.tools/getting-started/android/setup/ on topic **Collect your Google credentials**
- To test `key.json` file please run `fastlane run validate_play_store_json_key json_key:key.json`
- We encode `key.json` to an envinorment variable called `ANDROID_PLAY_STORE_CREDENTIALS` as you can see in `.env.template`
- `supply.sh` can be an example to run `fastlane supply ...` but still needed to be modified further
