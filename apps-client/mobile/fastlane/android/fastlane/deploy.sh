#!/bin/sh
# https://github.com/gabrielsadaka/expo-fastlane/blob/main/android/fastlane/deploy.sh

echo ${ANDROID_SIGNING_KEY} | base64 -d > fastlane/app.keystore
echo ${ANDROID_PLAY_STORE_CREDENTIALS} | base64 -d > fastlane/key.json

fastlane beta
